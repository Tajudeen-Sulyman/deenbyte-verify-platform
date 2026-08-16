const BASE_URL = process.env.FASTVERIFY_API_BASE_URL!;
const API_KEY = process.env.FASTVERIFY_API_KEY!;

export interface FastVerifyResponse {
  success: boolean;
  status?: boolean;
  response_code?: string;
  message?: string;
  detail?: string;
  data?: any;
  pdf_base64?: string;
  error?: string;
}

export class ProviderError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

const FRIENDLY_ERRORS: Record<number, string> = {
  401: 'Verification provider authentication failed. Contact support.',
  402: 'Service temporarily unavailable. Contact support.',
  403: 'This service is not allowed for your account.',
  404: 'Record not found. Check the number and try again.',
  405: 'Service configuration error. Contact support.',
  422: 'The information provided failed validation. Check it and try again.',
  429: 'Verification service is temporarily busy. Please try again shortly.',
  500: 'Verification service experienced an internal error. Try again.',
  503: 'Verification service is temporarily unavailable. Try again shortly.',
};

async function call(endpoint: string, payload: Record<string, string>): Promise<FastVerifyResponse> {
  if (!BASE_URL || !API_KEY || API_KEY.includes('your_')) {
    throw new ProviderError(503, 'Provider not configured. Contact support.');
  }

  let res: Response;
  try {
    res = await fetch(BASE_URL + endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ProviderError(503, 'Could not reach verification provider. Try again.');
  }

  const json = (await res.json().catch(() => ({}))) as FastVerifyResponse;

  if (!res.ok || !json.success) {
    throw new ProviderError(res.status, FRIENDLY_ERRORS[res.status] ?? json.message ?? 'Verification failed. Try again.');
  }

  return json;
}

export const FastVerifyProvider = {
  verifyNIN: (nin: string, slipType: string) => call('/nin/verify', { nin, slip_type: slipType }),
  verifyBVN: (bvn: string, slipType: string) => call('/bvn/verify-basic', { bvn, slip_type: slipType }),
};
