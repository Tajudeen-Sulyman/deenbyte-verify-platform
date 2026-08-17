import { ProviderError } from './fastverify';

const BASE_URL = 'https://aijalon.ng/api/v1';
const API_KEY = process.env.AIJALON_API_KEY!;

function authHeaders() {
  if (!API_KEY || API_KEY.includes('your_')) {
    throw new ProviderError(503, 'Provider not configured. Contact support.');
  }
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer ' + API_KEY,
  };
}

async function call(path: string, body: any) {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new ProviderError(503, 'Could not reach verification provider. Try again.');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message ?? 'Verification failed.';
    if (res.status === 402 || /insufficient/i.test(msg)) {
      throw new ProviderError(402, 'Service temporarily unavailable. Contact support.');
    }
    if (res.status === 401) throw new ProviderError(503, 'Provider authentication error. Contact support.');
    if (res.status === 404) throw new ProviderError(404, 'Record not found. Check the details and try again.');
    throw new ProviderError(res.status, msg);
  }
  if (String(json.status).toLowerCase() !== 'success') {
    throw new ProviderError(400, json.message ?? 'Verification failed.');
  }
  return json;
}

function normalizeGender(g: any): string {
  const v = String(g ?? '').toLowerCase();
  if (v === 'm' || v === 'male') return 'Male';
  if (v === 'f' || v === 'female') return 'Female';
  return g ?? '';
}

function mapNIN(d: any) {
  return {
    first_name: d.firstname ?? d.firstName ?? '',
    middle_name: d.middlename ?? d.middleName ?? '',
    last_name: d.surname ?? d.lastName ?? '',
    date_of_birth: d.birthdate ?? d.dateOfBirth ?? '',
    gender: normalizeGender(d.gender),
    residence_state: d.residence_state ?? d.stateOfResidence ?? '',
    residence_lga: d.residence_lga ?? d.lgaOfResidence ?? '',
    residence_address: d.residence_address ?? d.residentialAddress ?? '',
    birth_state: d.birthstate ?? d.stateOfOrigin ?? '',
    birth_lga: d.birthlga ?? d.lgaOfOrigin ?? '',
    phone: d.telephoneno ?? d.phoneNumber1 ?? '',
    nin: d.nin ?? '',
    tracking_id: d.trackingId ?? d.tracking_id ?? '',
  };
}

function mapBVN(d: any) {
  return {
    first_name: d.firstName ?? '',
    middle_name: d.middleName ?? '',
    last_name: d.lastName ?? '',
    date_of_birth: d.dateOfBirth ?? '',
    gender: normalizeGender(d.gender),
    phone: d.phoneNumber1 ?? '',
    state_of_origin: d.stateOfOrigin ?? '',
    lga_of_origin: d.lgaOfOrigin ?? '',
    state_of_residence: d.stateOfResidence ?? '',
    lga_of_residence: d.lgaOfResidence ?? '',
    residential_address: d.residentialAddress ?? '',
    enrollment_bank: d.enrollmentBank ?? '',
    enrollment_branch: d.enrollmentBranch ?? '',
    nin: d.nin ?? '',
    bvn: d.number ?? '',
  };
}

export const AijalonProvider = {
  async verifyNIN(nin: string, slipType: string) {
    const type = (slipType === 'premium' || slipType === 'standard') ? 'prem' : 'nonprem';
    const json = await call('/nin', { number: nin, type });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapNIN(json.data),
      tracking_id: json.reportID ?? json.data?.trackingId,
    };
  },

  async verifyNINByPhone(phone: string, slipType: string) {
    const type = (slipType === 'premium' || slipType === 'standard') ? 'prem' : 'nonprem';
    const json = await call('/phone', { number: phone, type });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapNIN(json.data),
      tracking_id: json.reportID ?? json.data?.trackingId,
    };
  },

  async demographicSearch(input: { firstname: string; lastname: string; gender: string; dob: string }, slipType: string) {
    const type = (slipType === 'premium' || slipType === 'standard') ? 'prem' : 'nonprem';
    const dob = input.dob.split('-').reverse().join('-'); // HTML gives YYYY-MM-DD; Aijalon wants DD-MM-YYYY
    const json = await call('/demo', {
      firstname: input.firstname, lastname: input.lastname,
      gender: input.gender, dob, type,
    });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapNIN(json.data),
      tracking_id: json.reportID ?? json.data?.trackingId,
    };
  },

  async verifyBVN(bvn: string, _slipType?: string) {
    const json = await call('/bvn', { number: bvn });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapBVN(json.data),
      tracking_id: json.reportID,
    };
  },
};
