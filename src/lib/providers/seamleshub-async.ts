const BASE = 'https://seamleshub.com';

export type ShResult =
  | { kind: 'accepted'; reference: string | null; charged: number | null; data: any }
  | { kind: 'rejected'; message: string }
  | { kind: 'unknown'; message: string };

async function call(path: string, body: Record<string, unknown>): Promise<ShResult> {
  const key = process.env.SEAMLESHUB_API_KEY?.trim();
  if (!key) return { kind: 'rejected', message: 'Service temporarily unavailable. Please try again shortly.' };
  let json: any = null;
  let httpStatus = 0;
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
    });
    httpStatus = res.status;
    json = await res.json().catch(() => null);
  } catch {
    return { kind: 'unknown', message: 'No clear answer from provider.' };
  }
  if ((httpStatus === 403 || httpStatus === 429) && json?.status !== 'success') {
    return {
      kind: 'rejected',
      message: httpStatus === 429
        ? 'Provider rate limit reached (HTTP 429)'
        : 'Provider blocked this server (HTTP 403)',
    };
  }
  if (json?.status === 'success') {
    const top: any = { ...json };
    delete top.status;
    delete top.data;
    const d: any = { ...top, ...(json.data ?? {}) };
    const ref = d.reference ?? d.transaction_ref ?? d.ticket_id ?? null;
    return {
      kind: 'accepted',
      reference: ref ? String(ref) : null,
      charged: d.amount_charged != null ? Number(d.amount_charged) : null,
      data: d,
    };
  }
  if (json?.status === 'error') {
    return { kind: 'rejected', message: String(json?.message ?? 'Provider rejected the request.') };
  }
  return { kind: 'unknown', message: 'Unreadable provider response.' };
}

export const ipeSubmit = (trackingId: string) =>
  call('/api/v1/ipe/clearance.php', { tracking_id: trackingId });

export const ipeStatus = (trackingId: string) =>
  call('/api/v1/ipe/clearance.php', { action: 'check_status', tracking_id: trackingId });

// ---- NIN Validation (async, webhook + poll) ----
const shKey = () => process.env.SEAMLESHUB_API_KEY?.trim() ?? '';

export const ninValidateSubmit = (nin: string) =>
  call('/api/v1/nin/validate.php', { api_key: shKey(), nin });

export const ninValidateStatus = (reference: string) =>
  call('/api/v1/nin/validate.php', { api_key: shKey(), action: 'check_status', reference });
