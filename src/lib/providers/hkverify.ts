import { ProviderError } from './fastverify';

const BASE_URL = process.env.HKVERIFY_API_BASE_URL || 'https://dataverify.com.ng/api/developers';
const API_KEY = process.env.HKVERIFY_API_KEY!;

function normalizeGender(g: string): string {
  const v = String(g ?? '').toLowerCase();
  if (v === 'm' || v === 'male') return 'Male';
  if (v === 'f' || v === 'female') return 'Female';
  return g ?? '';
}

export const HKVerifyProvider = {
  async verifyNIN(nin: string, _slipType?: string): Promise<any> {
    if (!API_KEY || API_KEY.includes('your_')) {
      throw new ProviderError(503, 'Provider not configured. Contact support.');
    }

    let res: Response;
    try {
      res = await fetch(BASE_URL + '/fetch_nin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ api_key: API_KEY, nin }),
      });
    } catch {
      throw new ProviderError(503, 'Could not reach verification provider. Try again.');
    }

    const json = await res.json().catch(() => ({}));
    const row = Array.isArray(json?.response) ? json.response[0] : null;

    if (!res.ok || !row) {
      throw new ProviderError(res.status, json?.message ?? json?.error ?? 'Record not found. Check the number and try again.');
    }

    return {
      success: true,
      message: 'Verification successful.',
      data: {
        first_name: row.firstname ?? '',
        middle_name: row.middlename ?? '',
        last_name: row.surname ?? '',
        date_of_birth: row.birthdate ?? '',
        gender: normalizeGender(row.gender),
        residence_state: row.birthstate ?? '',
        birth_lga: row.birthlga ?? '',
        phone: row.telephoneno ?? '',
        email: row.email ?? '',
        nin: row.nin ?? nin,
        title: row.title ?? '',
        tracking_id: row.trackingId ?? '',
      },
    };
  },

  async verifyBVN(bvn: string, _slipType?: string): Promise<any> {
    if (!API_KEY || API_KEY.includes('your_')) {
      throw new ProviderError(503, 'Provider not configured. Contact support.');
    }

    let res: Response;
    try {
      res = await fetch(BASE_URL + '/fetch_bvn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ api_key: API_KEY, bvn }),
      });
    } catch {
      throw new ProviderError(503, 'Could not reach verification provider. Try again.');
    }

    const json = await res.json().catch(() => ({}));
    const outer = Array.isArray(json?.response) ? json.response[0] : null;
    const inner = outer?.response ?? null;

    if (!res.ok || !outer || outer.verificationStatus !== 'VERIFIED' || !inner) {
      throw new ProviderError(res.status, outer?.description ?? json?.message ?? 'Record not found. Check the number and try again.');
    }

    return {
      success: true,
      message: outer.description ?? 'Verification successful.',
      data: {
        first_name: inner.firstName ?? '',
        middle_name: inner.middleName ?? '',
        last_name: inner.lastName ?? '',
        date_of_birth: inner.dob ?? '',
        gender: normalizeGender(inner.gender),
        residence_state: inner.stateOfOrigin ?? '',
        phone: inner.phone ?? '',
        alternate_phone: inner.alternatePhone ?? '',
        email: inner.email ?? '',
        nin: inner.nin ?? '',
        bvn,
        tracking_id: outer.transactionReference ?? '',
      },
    };
  },
};
