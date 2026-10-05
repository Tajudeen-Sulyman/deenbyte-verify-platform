import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { ninValidateSubmit, ninValidateStatus } from '@/lib/providers/seamleshub-async';

const SERVICE_ID = 'nin_validation';
// SeamlessHub says failed validations are refunded to us when its provider refunds it.
// Set to false to refund users manually instead.
const AUTO_REFUND_ON_FAIL = true;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function notify(userId: string, title: string, body: string) {
  await admin.from('notifications').insert({ user_id: userId, title, body });
}

async function refund(userId: string, amount: number, ref: string, name: string, requestId: string) {
  await admin.rpc('credit_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'reversal',
    p_reference: 'REV-' + ref,
    p_description: 'Reversal for failed ' + name,
    p_verification_id: requestId,
  });
}

export async function submitNinValidationRequest(userId: string, input: any) {
  const nin = String(input?.nin ?? '').replace(/\s/g, '');
  if (!/^\d{11}$/.test(nin)) throw new Error('NIN must be exactly 11 digits.');

  const { data: svc } = await admin
    .from('verification_services').select('*').eq('service_id', SERVICE_ID).single();
  if (!svc || svc.status !== 'active' || !svc.enabled) {
    throw new Error('Service is currently unavailable.');
  }

  const hash = createHash('sha256').update(`${userId}:${SERVICE_ID}:${nin}`).digest('hex');
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dup } = await admin
    .from('verification_requests').select('id')
    .eq('request_hash', hash).in('status', ['pending', 'processing'])
    .gte('created_at', dayAgo).limit(1);
  if (dup && dup.length > 0) throw new Error('A validation for this NIN is already in progress.');

  const ref = 'DBV-' + Date.now().toString().slice(-8);
  const { data: request, error: reqErr } = await admin
    .from('verification_requests')
    .insert({
      user_id: userId,
      service_id: svc.id,
      request_reference: ref,
      request_hash: hash,
      status: 'processing',
      selling_price: svc.selling_price,
      provider_cost: svc.provider_cost,
      safe_request_data: { identifier: nin.slice(0, 3) + '*****' + nin.slice(-2) },
    })
    .select().single();
  if (reqErr || !request) throw new Error('Could not create request.');

  const { data: ok, error: dedErr } = await admin.rpc('deduct_wallet', {
    p_user_id: userId,
    p_amount: svc.selling_price,
    p_reference: ref,
    p_verification_id: request.id,
  });
  if (dedErr || !ok) {
    await admin.from('verification_requests')
      .update({ status: 'failed', error_message: 'Insufficient wallet balance' })
      .eq('id', request.id);
    throw new Error('Insufficient wallet balance. Fund your wallet and try again.');
  }

  const r = await ninValidateSubmit(nin);

  if (r.kind === 'accepted' && r.reference) {
    await admin.from('verification_requests').update({
      status: 'pending',
      provider_reference: r.reference,
      safe_response_data: { val_reference: r.reference, val_status: 'processing' },
    }).eq('id', request.id);
    return { reference: ref, requestId: request.id, status: 'pending' };
  }

  if (r.kind === 'rejected') {
    await refund(userId, svc.selling_price, ref, svc.name, request.id);
    await admin.from('verification_requests').update({
      status: 'failed', error_message: r.message, completed_at: new Date().toISOString(),
    }).eq('id', request.id);
    throw new Error(
      /balance|insufficient|fund|credit|priced|unavailable/i.test(r.message)
        ? 'This service is temporarily unavailable. You have not been charged.'
        : r.message
    );
  }

  // unknown outcome (timeout / unreadable / accepted without a reference): no refund, no retry
  await admin.from('verification_requests')
    .update({ error_message: 'Submit unconfirmed - needs manual review' })
    .eq('id', request.id);
  throw new Error(`We could not confirm your request. Do not resubmit. Contact support with reference ${ref}.`);
}

type Outcome = 'completed' | 'failed' | 'processing';

export async function applyNinValidationResult(row: any, outcome: Outcome, result: string | null) {
  if (outcome === 'processing') return { status: 'pending', result: null as string | null };
  const text = result ? result.slice(0, 2000) : null;
  const patch: any = {
    status: outcome === 'completed' ? 'successful' : 'failed',
    completed_at: new Date().toISOString(),
    safe_response_data: { ...(row.safe_response_data ?? {}), val_status: outcome, val_result: text },
  };
  if (outcome === 'failed') patch.error_message = (text ?? 'Validation failed').slice(0, 500);

  // Only the call that flips pending -> terminal may refund or notify (idempotent)
  const { data: updated } = await admin
    .from('verification_requests').update(patch)
    .eq('id', row.id).eq('status', 'pending').select('id');

  if (updated?.length) {
    if (outcome === 'failed' && AUTO_REFUND_ON_FAIL) {
      await refund(row.user_id, row.selling_price, row.request_reference, 'NIN validation', row.id);
    }
    await notify(
      row.user_id,
      outcome === 'completed' ? 'NIN Validation completed' : 'NIN Validation failed',
      outcome === 'completed'
        ? 'Your validation result is ready. Check History.'
        : 'Your validation failed. Check History for details.'
    );
  }
  return { status: patch.status as string, result: text };
}

export async function syncNinValidationRequest(row: any) {
  const r = await ninValidateStatus(row.provider_reference);
  if (r.kind !== 'accepted') return { status: 'pending', result: null as string | null };
  const d = r.data ?? {};
  const vs = String(d.verification_status ?? '').toLowerCase();
  const outcome: Outcome = vs === 'completed' ? 'completed' : vs === 'failed' ? 'failed' : 'processing';
  return applyNinValidationResult(row, outcome, String(d.result ?? d.message ?? '') || null);
}

// Called by /api/webhooks/seamleshub. Returns true if the event belonged to a new-style request.
export async function handleNinValidationWebhook(data: any): Promise<boolean> {
  const ref = String(data?.reference ?? '').trim();
  if (!ref) return false;
  const { data: svc } = await admin
    .from('verification_services').select('id').eq('service_id', SERVICE_ID).maybeSingle();
  if (!svc) return false;
  const { data: row } = await admin
    .from('verification_requests').select('*')
    .eq('service_id', svc.id).eq('provider_reference', ref).maybeSingle();
  if (!row) return false; // older requests fall through to the legacy handler
  if (row.status !== 'pending') return true; // already handled
  const vs = String(data?.verification_status ?? '').toLowerCase();
  const outcome: Outcome = vs === 'completed' ? 'completed' : vs === 'failed' ? 'failed' : 'processing';
  await applyNinValidationResult(row, outcome, String(data?.result ?? '') || null);
  return true;
}
