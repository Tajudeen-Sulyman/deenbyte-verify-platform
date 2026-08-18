import { ProviderError } from './fastverify';

const BASE_URL = 'https://techhubltd.co/api/verification';
const API_KEY = process.env.TECHHUB_API_KEY!;

function smallPdf(j: any) {
  const p = j && j.pdf_base64;
  return typeof p === 'string' && p.length < 300000 ? p : null;
}

const NIN_EP: Record<string, string> = {
  premium: '/nin_premium_slip.php',
  standard: '/nin_standard_slip.php',
  regular: '/nin_regular_slip.php',
  vnin: '/vnin_slip.php',
};
const PHONE_EP: Record<string, string> = {
  premium: '/nin_by_phone_premium.php',
  standard: '/nin_by_phone_standard.php',
  regular: '/nin_by_phone_regular.php',
  vnin: '/nin_by_phone_vnin.php',
};
const DEMO_EP: Record<string, string> = {
  premium: '/nin_by_demo_premium.php',
  standard: '/nin_by_demo_standard.php',
  regular: '/nin_by_demo_regular.php',
  vnin: '/nin_by_demo_vnin.php',
};
const BVN_EP: Record<string, string> = {
  premium: '/bvn_premium_slip.php',
  standard: '/bvn_standard_slip.php',
};
const FALLBACK = {
  nin: '/nin_by_nin.php',
  phone: '/nin_by_phone_premium.php',
  demo: '/nin_by_demo.php',
  bvn: '/bvn_by_bvn.php',
};

async function call(path: string, body: any) {
  if (!API_KEY || API_KEY.includes('your_')) {
    throw new ProviderError(503, 'Provider not configured. Contact support.');
  }
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ api_key: API_KEY, ...body }),
    });
  } catch {
    throw new ProviderError(503, 'Could not reach verification provider. Try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 404) throw new ProviderError(404, 'ENDPOINT_404');
  if (!res.ok) {
    const msg = json?.message ?? 'Request failed.';
    if (res.status === 400 && /insufficient|balance/i.test(msg)) {
      throw new ProviderError(402, 'Service temporarily unavailable. Contact support.');
    }
    if (res.status === 401) throw new ProviderError(503, 'Provider authentication error. Contact support.');
    throw new ProviderError(res.status, msg);
  }
  if (json.status !== 'success') {
    throw new ProviderError(400, json.message ?? 'Verification failed.');
  }
  return json;
}

async function callWithFallback(paths: string[], body: any) {
  let lastErr: any = null;
  for (const p of paths) {
    try {
      return await call(p, body);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof ProviderError) || e.code !== 404) throw e;
    }
  }
  throw lastErr;
}

function normGender(g: any): string {
  const v = String(g ?? '').toLowerCase();
  if (v === 'male' || v === 'm') return 'Male';
  if (v === 'female' || v === 'f') return 'Female';
  return g ?? '';
}

function mapUser(d: any) {
  return {
    first_name: d.first_name ?? '',
    middle_name: d.middle_name ?? '',
    last_name: d.last_name ?? '',
    date_of_birth: d.date_of_birth ?? '',
    gender: normGender(d.gender),
    phone: d.phone_number ?? '',
    nin: d.nin ?? '',
    bvn: d.bvn ?? '',
    address: d.address ?? '',
  };
}

export const TechHubProvider = {
  async verifyNIN(nin: string, slipType: string) {
    const tier = NIN_EP[slipType] ? slipType : 'premium';
    const json = await callWithFallback([NIN_EP[tier], FALLBACK.nin], { nin });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapUser(json.user_data ?? {}),
      pdf_base64: smallPdf(json),
    };
  },

  async verifyNINByPhone(phone: string, slipType: string) {
    const tier = PHONE_EP[slipType] ? slipType : 'premium';
    const json = await callWithFallback([PHONE_EP[tier], FALLBACK.phone], { phone });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapUser(json.user_data ?? {}),
      pdf_base64: smallPdf(json),
    };
  },

  async demographicSearch(input: { firstname: string; lastname: string; gender: string; dob: string }, slipType: string) {
    const tier = DEMO_EP[slipType] ? slipType : 'premium';
    const dob = input.dob.split('-').reverse().join('-');
    const gender = input.gender === 'm' ? 'MALE' : 'FEMALE';
    const json = await callWithFallback(
      [DEMO_EP[tier], FALLBACK.demo],
      { firstname: input.firstname, lastname: input.lastname, dob, gender }
    );
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapUser(json.user_data ?? {}),
      pdf_base64: smallPdf(json),
    };
  },

  async verifyBVN(bvn: string, slipType: string) {
    const tier = BVN_EP[slipType] ? slipType : 'premium';
    const json = await callWithFallback([BVN_EP[tier], FALLBACK.bvn], { bvn });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: mapUser(json.user_data ?? {}),
      pdf_base64: smallPdf(json),
    };
  },
};
