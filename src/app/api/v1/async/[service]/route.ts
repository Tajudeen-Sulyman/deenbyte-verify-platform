import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { ProviderError } from '@/lib/providers/fastverify';
import { AijalonAsync, pollState } from '@/lib/providers/aijalon-async';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERVICES: Record<string, {
  serviceId: string;
  input: 'tracking' | 'nin';
  submit: (n: string) => Promise<any>;
}> = {
  ipe_clearance: { serviceId: 'ipe_clearance', input: 'tracking', submit: AijalonAsync.submitIPE },
  personalization: { serviceId: 'personalization', input: 'tracking', submit: AijalonAsync.submitPersonalization },
  nin_validation: { serviceId: 'nin_validation', input: 'nin', submit: AijalonAsync.submitValidation },
};

export async function POST(req: Request, ctx: { params: Promise<{ service: string }> }) {
  const { service } = await ctx.params;
  const config = SERVICES[service];
  if (!config) return NextResponse.json({ error: 'Unknown service.' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const identifier = String(body.identifier ?? '').trim();
  if (config.input === 'nin' && !/^\d{11}$/.test(identifier)) {
    return NextResponse.json({ error: 'NIN must be exactly 11 digits.' }, { status: 422 });
  }
  if (config.input === 'tracking' && identifier.length < 5) {
    return NextResponse.json({ error: 'Enter a valid tracking ID.' }, { status: 422 });
  }

  const { data: serviceRow } = await supabaseAdmin
    .from('verification_services').select('*')
    .eq('service_id', config.serviceId).single();
  if (!serviceRow || serviceRow.status !== 'active' || !serviceRow.enabled) {
    return NextResponse.json({ error: 'Service is not available right now.' }, { status: 400 });
  }
  const price = Number(serviceRow.selling_price);

  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('balance').eq('user_id', user.id).single();
  if (Number(wallet?.balance ?? 0) < price) {
    return NextResponse.json({ error: 'Insufficient wallet balance. Fund your wallet and try again.' }, { status: 400 });
  }

  const requestRef = 'DBV-' + Date.now().toString().slice(-8);
  const hash = Buffer.from(config.serviceId + ':' + identifier).toString('base64');

  const { data: request, error: reqErr } = await supabaseAdmin
    .from('verification_requests')
    .insert({
      user_id: user.id,
      service_id: serviceRow.id,
      request_reference: requestRef,
      request_hash: hash,
      status: 'processing',
      selling_price: price,
      provider_cost: serviceRow.provider_cost,
      safe_request_data: { identifier },
    })
    .select()
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
  }

  try {
    await supabaseAdmin.rpc('deduct_wallet', {
      p_user_id: user.id,
      p_amount: price,
      p_type: 'debit',
      p_reference: requestRef,
      p_description: 'Charge for ' + serviceRow.name,
      p_verification_id: request.id,
    });
  } catch {
    await supabaseAdmin.from('verification_requests')
      .update({ status: 'failed', error_code: 'wallet_error', error_message: 'Wallet charge failed', completed_at: new Date().toISOString() })
      .eq('id', request.id);
    return NextResponse.json({ error: 'Wallet charge failed. Try again.' }, { status: 500 });
  }

  try {
    const json = await config.submit(identifier);
    if (pollState(json) === 'failed') {
      throw new ProviderError(400, json?.message ?? 'Submission failed.');
    }
    await supabaseAdmin.from('verification_requests')
      .update({ provider_reference: json?.reportID ?? null })
      .eq('id', request.id);
    return NextResponse.json({
      success: true,
      reference: requestRef,
      requestId: request.id,
      status: 'processing',
      message: 'Request submitted. Processing takes 10 minutes to 24 hours. Use Check Status in History.',
    });
  } catch (err) {
    await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: user.id,
      p_amount: price,
      p_type: 'reversal',
      p_reference: 'REV-' + requestRef,
      p_description: 'Reversal for failed ' + serviceRow.name,
      p_verification_id: request.id,
    });
    await supabaseAdmin.from('verification_requests')
      .update({
        status: 'failed',
        error_code: err instanceof ProviderError ? String(err.code) : 'unknown',
        error_message: err instanceof Error ? err.message : 'Submission failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', request.id);
    const message = err instanceof Error ? err.message : 'Submission failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
