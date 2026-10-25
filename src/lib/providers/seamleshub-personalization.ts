const base = () => (process.env.SEAMLESHUB_PERSONALIZATION_BASE ?? '').trim().replace(/\/$/, '');
const apiKey = () => (process.env.SEAMLESHUB_API_KEY ?? '').trim();

export function personalizationConfigured() {
  return process.env.SEAMLESHUB_PERSONALIZATION_ENABLED === 'true' && !!base() && !!apiKey();
}

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(base() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey() },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
  const json: any = await res.json().catch(() => null);
  return { http: res.status, json };
}

export type PersSubmit =
  | { kind: 'accepted'; reference: string }
  | { kind: 'rejected'; code: string; message: string }
  | { kind: 'unknown'; message: string };

export async function submitPersonalization(trackingId: string): Promise<PersSubmit> {
  let r: { http: number; json: any };
  try {
    r = await post('/nin_personalization.php', { tracking_id: trackingId });
  } catch {
    return { kind: 'unknown', message: 'No clear answer from provider.' };
  }
  const { http, json } = r;
  if (json?.status === 'success' && json?.request_status === 'processing' && json?.reference) {
    return { kind: 'accepted', reference: String(json.reference) };
  }
  if (json?.status === 'error' && json?.error_code) {
    return { kind: 'rejected', code: String(json.error_code), message: String(json.message ?? 'Rejected by provider') };
  }
  return { kind: 'unknown', message: `Unexpected provider response (HTTP ${http}).` };
}

export async function statusPersonalization(reference: string) {
  let r: { http: number; json: any };
  try {
    r = await post('/nin_personalization_status.php', { reference });
  } catch {
    return { ok: false as const, message: 'Status check timed out.' };
  }
  if (r.http === 200 && r.json?.status === 'success' && r.json?.request_status) {
    return { ok: true as const, data: r.json as any };
  }
  return { ok: false as const, message: String(r.json?.message ?? `Status unavailable (HTTP ${r.http}).`) };
}
