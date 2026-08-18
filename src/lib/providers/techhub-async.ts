import { ProviderError } from './fastverify';

const BASE_URL = 'https://techhubltd.co/api/verification';
const API_KEY = process.env.TECHHUB_API_KEY!;

function key(): string {
  if (!API_KEY || API_KEY.includes('your_')) {
    throw new ProviderError(503, 'Provider not configured. Contact support.');
  }
  return API_KEY;
}

async function post(path: string, body: any) {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ api_key: key(), ...body }),
    });
  } catch {
    throw new ProviderError(503, 'Could not reach verification provider. Try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message ?? 'Request failed.';
    if (res.status === 400 && /insufficient|balance|not priced/i.test(msg)) {
      throw new ProviderError(402, 'Service temporarily unavailable. Contact support.');
    }
    if (res.status === 401) throw new ProviderError(503, 'Provider authentication error. Contact support.');
    throw new ProviderError(res.status, msg);
  }
  if (json.success !== true) throw new ProviderError(400, json.message ?? 'Submission failed.');
  return json;
}

async function getStatus(path: string, ticketId: string) {
  let res: Response;
  try {
    res = await fetch(
      BASE_URL + path + '?api_key=' + encodeURIComponent(key()) + '&ticket_id=' + encodeURIComponent(ticketId),
      { method: 'GET', headers: { Accept: 'application/json' } }
    );
  } catch {
    throw new ProviderError(503, 'Could not reach verification provider. Try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 404) throw new ProviderError(404, 'Ticket not found.');
  if (!res.ok) throw new ProviderError(res.status, json?.message ?? 'Status check failed.');
  if (json.success !== true) throw new ProviderError(400, json?.message ?? 'Status check failed.');
  return json;
}

export function thPollState(json: any): 'success' | 'pending' | 'failed' {
  const s = String(json?.status ?? '').toLowerCase();
  if (s === 'success') return 'success';
  if (s === 'pending') return 'pending';
  return 'failed';
}

export const TechHubAsync = {
  post,
  getStatus,
  paths: {
    ipe_clearance: '/ipe_clearance.php',
    personalization: '/personalization.php',
    nin_validation: '/nin_validation.php',
    bvn_retrieval: '/bvn_retrieval.php',
    delink: '/delinking.php',
  } as Record<string, string>,
};
