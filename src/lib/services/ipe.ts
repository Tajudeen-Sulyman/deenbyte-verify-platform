import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { submitIpe, checkIpe } from '@/lib/providers/techhub';

const SERVICE_ID = 'ipe_clearance';
// Adjust once TechHub confirms its status values
const DONE = ['completed', 'resolved', 'approved', 'done', 'success', 'successful'];
const REJECTED = ['rejected', 'failed', 'declined', 'cancelled'];
// Keep false until TechHub confirms it refunds rejected tickets
const AUTO_REFUND_ON_REJECT = false;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function submitIpeRequest(userId: string, trackingIdRaw: string) {
  const tid = String(trackingIdRaw ?? '').trim();
  if (!/^[A-Za-z0-9]{1,20}$/.test(tid)) {
    throw new Error('Tracking ID must be 1-20 letters or numbers.');
  }

  const { data: svc } = await admin
    .from('verification_services').select('*').eq('service_id', SERVICE_ID).single();
  if (!svc || svc.status !== 'active' || !svc.enabled) {
    throw new Error('Service is currently unavailable.');
  }

  const hash = createHash('sha256').update(`${userId}:${SERVICE_ID}:${tid}`).digest('hex');
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dup } = await admin
    .from('verification_requests').select('id')
    .eq('request_hash', hash).in('status', ['pending', 'processing'])
    .gte('created_at', dayAgo).limit(1);
  if (dup && dup.length > 0) {
    throw new Error('A clearance request for this tracking ID is already in progress.');
  }

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
      safe_request_data: { identifier: tid.slice(0, 3) + '*****' },
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

  try {
    const r = await submitIpe(tid);
    await admin.from('verification_requests').update({
      status: 'pending',
      provider_reference: r.ticketId,
      safe_response_data: { ticket_id: r.ticketId, provider_status: r.status },
    }).eq('id', request.id);
    return { reference: ref, requestId: request.id, status: 'pending' };
  } catch (err) {
    // Plain Error = TechHub answered with a rejection (nothing charged to us) -> safe to refund.
    // TypeError / TimeoutError / SyntaxError = outcome unknown -> do NOT refund or retry.
    const definitive = err instanceof Error && err.name === 'Error';
    if (definitive) {
      await admin.rpc('credit_wallet', {
        p_user_id: userId,
        p_amount: svc.selling_price,
        p_type: 'reversal',
        p_reference: 'REV-' + ref,
        p_description: 'Reversal for failed ' + svc.name,
        p_verification_id: request.id,
      });
      await admin.from('verification_requests').update({
        status: 'failed',
        error_message: (err as Error).message,
        completed_at: new Date().toISOString(),
      }).eq('id', request.id);
      throw err;
    }
    await admin.from('verification_requests')
      .update({ error_message: 'Submit unconfirmed - needs manual review' })
      .eq('id', request.id);
    throw new Error(`We could not confirm your request. Do not resubmit. Contact support with reference ${ref}.`);
  }
}

export async function syncIpeRequest(row: {
  id: string; user_id: string; request_reference: string;
  provider_reference: string; selling_price: number; safe_response_data: any;
}) {
  const r = await checkIpe(row.provider_reference);
  const s = String(r.status ?? '').toLowerCase();
  const now = new Date().toISOString();
  const patch: any = {
    safe_response_data: {
      ...(row.safe_response_data ?? {}),
      provider_status: r.status,
      note: r.note ?? null,
      new_tracking_id: r.newTrackingId ?? null,
      new_nin: r.newNin ?? null,
    },
  };
  if (DONE.includes(s)) { patch.status = 'successful'; patch.completed_at = now; }
  else if (REJECTED.includes(s)) {
    patch.status = 'failed'; patch.completed_at = now;
    patch.error_message = r.note ?? 'Rejected by provider';
  }

  // Only the call that flips pending -> terminal may refund (idempotent)
  const { data: updated } = await admin
    .from('verification_requests').update(patch)
    .eq('id', row.id).eq('status', 'pending').select('id');

  if (updated?.length && patch.status === 'failed' && AUTO_REFUND_ON_REJECT) {
    await admin.rpc('credit_wallet', {
      p_user_id: row.user_id,
      p_amount: row.selling_price,
      p_type: 'reversal',
      p_reference: 'REV-' + row.request_reference,
      p_description: 'Reversal for rejected IPE clearance',
      p_verification_id: row.id,
    });
  }
  return { status: patch.status ?? 'pending', ...patch.safe_response_data };
}
