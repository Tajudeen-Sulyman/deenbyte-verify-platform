import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { FastVerifyProvider, ProviderError } from '@/lib/providers/fastverify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface VerificationOutcome {
  reference: string;
  requestId: string;
  data: any;
  hasSlip: boolean;
  message: string;
}

export class ReverifyRequiredError extends Error {
  code = 'reverify_required';
  previousReference: string;
  previousAt: string;
  constructor(previousReference: string, previousAt: string) {
    super('This number was verified recently. Confirm to verify again.');
    this.previousReference = previousReference;
    this.previousAt = previousAt;
  }
}

function maskNumber(v: string): string {
  return v.slice(0, 3) + '*****' + v.slice(-2);
}

export async function runVerification(opts: {
  userId: string;
  serviceId: string;
  identifier: string;
  slipType: string;
  confirmReverify?: boolean;
  callProvider: (identifier: string, slipType: string) => Promise<any>;
}): Promise<VerificationOutcome> {
  const { userId, serviceId, identifier, slipType, confirmReverify, callProvider } = opts;

  const { data: service, error: svcErr } = await supabaseAdmin
    .from('verification_services')
    .select('*')
    .eq('service_id', serviceId)
    .single();

  if (svcErr || !service || service.status !== 'active' || !service.enabled) {
    throw new Error('Service is currently unavailable.');
  }

  const hash = createHash('sha256').update(userId + ':' + serviceId + ':' + identifier).digest('hex');

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dup } = await supabaseAdmin
    .from('verification_requests')
    .select('id,status,request_reference,created_at')
    .eq('request_hash', hash)
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (dup && dup.length > 0) {
    const d = dup[0];
    if (d.status === 'pending' || d.status === 'processing') {
      throw new Error('A verification for this number is already in progress.');
    }
    if (d.status === 'successful' && !confirmReverify) {
      throw new ReverifyRequiredError(d.request_reference, d.created_at);
    }
  }

  const requestRef = 'DBV-' + Date.now().toString().slice(-8);
  const { data: request, error: reqErr } = await supabaseAdmin
    .from('verification_requests')
    .insert({
      user_id: userId,
      service_id: service.id,
      request_reference: requestRef,
      request_hash: hash,
      status: 'processing',
      selling_price: service.selling_price,
      provider_cost: service.provider_cost,
      safe_request_data: { identifier: maskNumber(identifier), slip_type: slipType },
    })
    .select()
    .single();

  if (reqErr || !request) throw new Error('Could not create verification request.');

  const { data: ok, error: dedErr } = await supabaseAdmin.rpc('deduct_wallet', {
    p_user_id: userId,
    p_amount: service.selling_price,
    p_reference: requestRef,
    p_verification_id: request.id,
  });

  if (dedErr || !ok) {
    await supabaseAdmin.from('verification_requests')
      .update({ status: 'failed', error_message: 'Insufficient wallet balance' })
      .eq('id', request.id);
    throw new Error('Insufficient wallet balance. Fund your wallet and try again.');
  }

  try {
    const result = await callProvider(identifier, slipType);
    const rawData = result.data ?? {};
    const safeData = { ...rawData };
    delete safeData.photo;
    delete safeData.base64Image;

    await supabaseAdmin.from('verification_requests')
      .update({
        status: 'successful',
        provider_reference: rawData?.verification?.reference ?? rawData?.tracking_id ?? null,
        safe_response_data: safeData,
        slip_base64: result.pdf_base64 ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    return {
      reference: requestRef,
      requestId: request.id,
      data: safeData,
      hasSlip: true,
      message: result.message ?? 'Verification successful.',
    };
  } catch (err) {
    await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: service.selling_price,
      p_type: 'reversal',
      p_reference: 'REV-' + requestRef,
      p_description: 'Reversal for failed ' + service.name,
      p_verification_id: request.id,
    });

    await supabaseAdmin.from('verification_requests')
      .update({
        status: 'failed',
        error_code: err instanceof ProviderError ? String(err.code) : 'unknown',
        error_message: err instanceof Error ? err.message : 'Verification failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    throw err instanceof Error ? err : new Error('Verification failed.');
  }
}
