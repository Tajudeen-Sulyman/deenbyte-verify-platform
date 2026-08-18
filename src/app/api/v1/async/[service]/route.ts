import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { ProviderError } from '@/lib/providers/fastverify';
import { AijalonAsync, pollState } from '@/lib/providers/aijalon-async';
import { TechHubAsync } from '@/lib/providers/techhub-async';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Field = { key: string; label: string; required: boolean; kind: 'nin' | 'phone' | 'email' | 'text' };

const FIELDS: Record<string, Field[]> = {
  ipe_clearance: [{ key: 'tracking_id', label: 'Tracking ID', required: true, kind: 'text' }],
  personalization: [{ key: 'tracking_id', label: 'Tracking ID', required: true, kind: 'text' }],
  nin_validation: [
    { key: 'nin', label: 'NIN', required: true, kind: 'nin' },
    { key: 'validation_type', label: 'Validation type', required: false, kind: 'text' },
  ],
  bvn_retrieval: [
    { key: 'first_name', label: 'First name', required: true, kind: 'text' },
    { key: 'last_name', label: 'Last name', required: true, kind: 'text' },
    { key: 'phone_number', label: 'Phone number', required: true, kind: 'phone' },
  ],
  delink: [
    { key: 'nin', label: 'NIN', required: true, kind: 'nin' },
    { key: 'email', label: 'Email', required: true, kind: 'email' },
  ],
};

const AIJALON_SUBMIT: Record<string, (n: string) => Promise<any>> = {
  ipe_clearance: AijalonAsync.submitIPE,
  personalization: AijalonAsync.submitPersonalization,
  nin_validation: AijalonAsync.submitValidation,
};

export async function POST(req: Request, ctx: { params: Promise<{ service: string }> }) {
  const { service } = await ctx.params;
  const fields = FIELDS[service];
  if (!fields) return NextResponse.json({ error: 'Unknown service.' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const input = typeof body.identifier === 'object' && body.identifier ? body.identifier : {};

  for (const f of fields) {
    const v = String(input[f.key] ?? '').trim();
    if (f.required && !v) {
      return NextResponse.json({ error: f.label + ' is required.' }, { status: 422 });
    }
    if (v && f.kind === 'nin' && !/^\d{11}$/.test(v)) {
      return NextResponse.json({ error: f.label + ' must be exactly 11 digits.' }, { status: 422 });
    }
    if (v && f.kind === 'phone' && !/^(0\d{10}|\d{11})$/.test(v)) {
      return NextResponse.json({ error: f.label + ' must be 11 digits.' }, { status: 422 });
    }
    if (v && f.kind === 'email' && !v.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });
    }
    input[f.key] = v;
  }
  const display = fields.filter((f) => input[f.key]).map((f) => input[f.key]).join(' | ');

  const { data: serviceRow } = await supabaseAdmin
    .from('verification_services').select('*')
    .eq('service_id', service).single();
  if (!serviceRow || serviceRow.status !== 'active' || !serviceRow.enabled) {
    return NextResponse.json({ error: 'Service is not available right now.' }, { status: 400 });
  }
  const provider = String(serviceRow.provider ?? 'techhub');
  const price = Number(serviceRow.selling_price);

  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('balance').eq('user_id', user.id).single();
  if (Number(wallet?.balance ?? 0) < price) {
    return NextResponse.json({ error: 'Insufficient wallet balance. Fund your wallet and try again.' }, { status: 400 });
  }

  const requestRef = 'DBV-' + Date.now().toString().slice(-8);
  const hash = Buffer.from(service + ':' + display).toString('base64');

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
      safe_request_data: { identifier: display, fields: input },
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
    let ticket: string | null = null;
    if (provider === 'techhub') {
      const json = await TechHubAsync.post(TechHubAsync.paths[service], input);
      ticket = json?.ticket_id ?? null;
    } else {
      const main = String(input.nin ?? input.tracking_id ?? display);
      const submitFn = AIJALON_SUBMIT[service];
      const json = await submitFn(main);
      if (pollState(json) === 'failed') throw new ProviderError(400, json?.message ?? 'Submission failed.');
      ticket = json?.reportID ?? null;
    }
    await supabaseAdmin.from('verification_requests')
      .update({ provider_reference: ticket })
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
