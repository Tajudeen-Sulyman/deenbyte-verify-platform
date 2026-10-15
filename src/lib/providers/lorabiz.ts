// Lorabiz: NIN personalisation and IPE clearance (submit, then poll by OUR reference)
const BASE = 'https://lorabiz.com';

export type LbKind = 'ipe' | 'personalization';

const apiKey = () => (process.env.LORABIZ_API_KEY ?? '').trim();

async function call(path: string, method: 'GET' | 'POST', body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
  const json: any = await res.json().catch(() => null);
  return { http: res.status, json };
}

export type LbSubmit =
  | { kind: 'accepted'; reference: string; status: string }
  | { kind: 'rejected'; code: string; message: string }
  | { kind: 'unknown'; message: string };

// Responses meaning Lorabiz did NOT accept the request, so nothing was processed.
const REJECT_HTTP = [400, 401, 402, 403, 409, 422, 429, 503];

export async function submitLorabiz(kind: LbKind, trackingId: string, clientRef: string): Promise<LbSubmit> {
  const r = await call(`/api/v1/nin/${kind}`, 'POST', {
    tracking_id: trackingId,
    client_reference: clientRef,
  }).catch(() => null);
  if (!r) return { kind: 'unknown', message: 'No clear answer from provider.' };

  const { http, json } = r;
  if ((http === 200 || http === 201) && json?.reference) {
    return { kind: 'accepted', reference: String(json.reference), status: String(json.request_status ?? 'submitted') };
  }
  if (REJECT_HTTP.includes(http) && json?.status === 'error') {
    return { kind: 'rejected', code: String(json.code ?? http), message: String(json.message ?? 'Rejected by provider') };
  }
  return { kind: 'unknown', message: `Unexpected provider response (HTTP ${http}).` };
}

export async function statusLorabiz(
  kind: LbKind,
  ref: string,
  refType: 'reference' | 'client_reference' = 'client_reference'
) {
  try {
    const { http, json } = await call(
      `/api/v1/nin/${kind}/status?${refType}=${encodeURIComponent(ref)}`,
      'GET'
    );
    if (http === 200 && json?.request_status) return { ok: true as const, data: json };
    return { ok: false as const, message: String(json?.message ?? `Status unavailable (HTTP ${http}).`) };
  } catch {
    return { ok: false as const, message: 'Status check timed out.' };
  }
}
