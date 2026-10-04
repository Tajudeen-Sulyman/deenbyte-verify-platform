export class ProviderError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

const BASE_URL = 'https://techhubltd.co/api/verification';
const API_KEY = process.env.TECHHUB_API_KEY!;

function findPdfDeep(obj: any, depth = 0): string | null {
  if (!obj || depth > 6) return null;
  if (typeof obj === 'string') {
    if (obj.startsWith('JVBERi') && obj.length > 1000) return obj;
    return null;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) { const r = findPdfDeep(v, depth + 1); if (r) return r; }
    return null;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) { const r = findPdfDeep((obj as any)[k], depth + 1); if (r) return r; }
  }
  return null;
}

function smallPdf(j: any) {
  return findPdfDeep(j);
}

function srcOf(json: any) {
  return json?.user_data?.user_data ?? json?.user_data ?? json?.data ?? json ?? {};
}

function isOk(json: any): boolean {
  const st = json?.status;
  return (
    st === true ||
    String(st ?? '').toLowerCase() === 'success' ||
    json?.response_code === '00' ||
    json?.success === true
  );
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
  premium: '/nin_by_demo.php',
  standard: '/nin_by_demo.php',
  regular: '/nin_by_demo.php',
  vnin: '/nin_by_demo.php',
};
const BVN_EP: Record<string, string> = {
  premium: '/bvn_premium_slip.php',
  standard: '/bvn_full_details_slip.php',
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
    if (/success/i.test(msg) && (json.data || json.pdf_base64 || json.user_data)) return json; // __resOkGuard
    throw new ProviderError(res.status, msg);
  }
  if (!isOk(json)) {
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
    first_name: d.first_name ?? d.firstName ?? '',
    middle_name: d.middle_name ?? d.middleName ?? '',
    last_name: d.last_name ?? d.surname ?? d.lastName ?? '',
    date_of_birth: d.date_of_birth ?? d.birthDate ?? '',
    gender: normGender(d.gender),
    phone: d.phone_number ?? d.phone ?? d.phoneNo ?? '',
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
      data: { ...(json.user_data ?? {}), ...(srcOf(json) ?? {}), ...mapUser(srcOf(json)) },
      pdf_base64: json.pdf_base64 ?? json.pdf ?? json.data?.pdf_base64 ?? json.data?.pdf ?? json.slip_base64 ?? json.pdfBase64 ?? smallPdf(json),
    };
  },

  async verifyNINByPhone(phone: string, slipType: string) {
    const tier = PHONE_EP[slipType] ? slipType : 'premium';
    const json = await callWithFallback([PHONE_EP[tier], '/nin_by_phone.php', FALLBACK.phone], { phone, nin: phone });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: { ...(json.user_data ?? {}), ...(srcOf(json) ?? {}), ...mapUser(srcOf(json)) },
      pdf_base64: json.pdf_base64 ?? json.pdf ?? json.data?.pdf_base64 ?? json.data?.pdf ?? json.slip_base64 ?? json.pdfBase64 ?? smallPdf(json),
    };
  },

  async demographicSearch(input: { firstname: string; lastname: string; gender: string; dob: string }, slipType: string) {
    const tier = DEMO_EP[slipType] ? slipType : 'premium';
    const dob = input.dob.split('-').reverse().join('-');
    const gender = String(input.gender ?? '').trim().toLowerCase().startsWith('m') ? 'MALE' : 'FEMALE';
    const json = await callWithFallback(
      [DEMO_EP[tier], FALLBACK.demo],
      { firstname: input.firstname, lastname: input.lastname, dob, gender }
    );
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: { ...(json.user_data ?? {}), ...(srcOf(json) ?? {}), ...mapUser(srcOf(json)) },
      pdf_base64: json.pdf_base64 ?? json.pdf ?? json.data?.pdf_base64 ?? json.data?.pdf ?? json.slip_base64 ?? json.pdfBase64 ?? smallPdf(json),
    };
  },

  async verifyBVN(bvn: string, slipType: string) {
    const tier = BVN_EP[slipType] ? slipType : 'premium';
    const json = await callWithFallback([BVN_EP[tier], FALLBACK.bvn], { bvn });
    return {
      success: true,
      message: json.message ?? 'Verification successful.',
      data: { ...(json.user_data ?? {}), ...(srcOf(json) ?? {}), ...mapUser(srcOf(json)) },
      pdf_base64: json.pdf_base64 ?? json.pdf ?? json.data?.pdf_base64 ?? json.data?.pdf ?? json.slip_base64 ?? json.pdfBase64 ?? smallPdf(json),
    };
  },
};

// ---- IPE Clearance (async) ----
const IPE_URL = "https://techhubltd.co/api/verification/ipe_clearance.php";

export async function submitIpe(trackingId: string) {
  if (!/^[A-Za-z0-9]{1,20}$/.test(trackingId)) throw new Error("Invalid tracking ID");
  const res = await fetch(IPE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.TECHHUB_API_KEY, tracking_id: trackingId }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "IPE submit failed");
  return { ticketId: data.ticket_id as string, status: data.status as string, cost: data.amount_charged as number };
}

export async function checkIpe(ticketId: string) {
  const url = `${IPE_URL}?api_key=${encodeURIComponent(process.env.TECHHUB_API_KEY!)}&ticket_id=${encodeURIComponent(ticketId)}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "IPE status check failed");
  return { status: data.status, note: data.note, newTrackingId: data.new_tracking_id, newNin: data.new_nin };
}

// ---- BVN Retrieval (async) ----
const BVN_RET_URL = "https://techhubltd.co/api/verification/bvn_retrieval.php";

export async function submitBvnRetrieval(i: { firstName: string; lastName: string; phone: string }) {
  const res = await fetch(BVN_RET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.TECHHUB_API_KEY, first_name: i.firstName, last_name: i.lastName, phone_number: i.phone }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "BVN retrieval submit failed");
  return { ticketId: data.ticket_id as string, status: data.status as string };
}

export async function checkBvnRetrieval(ticketId: string) {
  const url = `${BVN_RET_URL}?api_key=${encodeURIComponent(process.env.TECHHUB_API_KEY!)}&ticket_id=${encodeURIComponent(ticketId)}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "BVN retrieval status check failed");
  return { status: data.status, bvn: (data.bvn ?? null) as string | null, response: data.response ?? null };
}
