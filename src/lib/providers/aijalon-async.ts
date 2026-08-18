import { ProviderError } from './fastverify';

const BASE_URL = 'https://aijalon.ng/api/v1';
const API_KEY = process.env.AIJALON_API_KEY!;

async function callRaw(path: string, body: any) {
  if (!API_KEY || API_KEY.includes('your_')) {
    throw new ProviderError(503, 'Provider not configured. Contact support.');
  }
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + API_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ProviderError(503, 'Could not reach verification provider. Try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message ?? 'Request failed.';
    if (res.status === 402 || /insufficient/i.test(msg)) {
      throw new ProviderError(402, 'Service temporarily unavailable. Contact support.');
    }
    if (res.status === 401) throw new ProviderError(503, 'Provider authentication error. Contact support.');
    if (res.status === 404) throw new ProviderError(404, 'Record not found. Check the details and try again.');
    throw new ProviderError(res.status, msg);
  }
  return json;
}

export function pollState(json: any): 'success' | 'pending' | 'failed' {
  const s = String(json?.status ?? '').toLowerCase();
  if (s === 'success') return 'success';
  if (s === 'pending') return 'pending';
  return 'failed';
}

export function stripImages(data: any) {
  if (!data || typeof data !== 'object') return {};
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' && v.startsWith('data:image')) continue;
    out[k] = v;
  }
  return out;
}

export const AijalonAsync = {
  submitIPE: (n: string) => callRaw('/ipe', { number: n }),
  ipeStatus: (n: string) => callRaw('/ipe/status', { number: n }),
  submitPersonalization: (n: string) => callRaw('/tracking-id', { number: n }),
  personalizationStatus: (n: string) => callRaw('/tracking-id/status', { number: n }),
  submitValidation: (n: string) => callRaw('/val', { number: n }),
  validationStatus: (n: string) => callRaw('/val/status', { number: n }),
};
