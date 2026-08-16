import { ProviderError } from './fastverify';

const BASE_URL = process.env.HKVERIFY_API_BASE_URL || 'https://dataverify.com.ng/api/developers';
const API_KEY = process.env.HKVERIFY_API_KEY!;

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

    const g = String(row.gender ?? '').toLowerCase();
    return {
      success: true,
      message: 'Verification successful.',
      data: {
        first_name: row.firstname ?? '',
        middle_name: row.middlename ?? '',
        last_name: row.surname ?? '',
        date_of_birth: row.birthdate ?? '',
        gender: g === 'm' ? 'Male' : g === 'f' ? 'Female' : (row.gender ?? ''),
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
};
