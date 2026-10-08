import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { submitBvnRetrieval, checkBvnRetrieval } from '@/lib/providers/techhub';

const SERVICE_ID = 'bvn_retrieval';
const REJECTED = ['rejected', 'failed', 'declined', 'cancelled'];
// Keep false until TechHub confirms it refunds rejected tickets
const AUTO_REFUND_ON_REJECT = false;
const NAME_RE = /^[A-Za-z][A-Za-z '\-]{0,49}$/;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normPhone(raw: unknown) {
  let p = String(raw ?? '').replace(/[\s-]/g, '');
  if (/^\+?234\d{10}$/.test(p)) p = '0' + p.replace(/^\+?234/, '');
  return p;
}

export async function submitBvnRetrievalRequest(userId: string, input: any) {
  const first = String(input?.first_name ?? '').trim();
  const last = String(input?.last_name ?? '').trim();
  const phone = normPhone(input?.phone_number);
  if (!NAME_RE.test(first) || !NAME_RE.test(last)) {
    throw new Error('Enter the first and last name exactly as registered on the BVN.');
  }
  if (!/^0\d{10}$/.test(phone)) throw new Error('Phone number must be 11 digits.');

  const { data: svc } = await admin
    .from('verification_services').select('*').eq('service_id', SERVICE_ID).single();
  if (!svc || svc.status !== 'active' || !svc.enabled) {
    throw new Error('Service is currently unavailable.');
  }

  const hash = createHash('sha256')
    .update(`${userId}:${SERVICE_ID}:${first.toLowerCase()}:${last.toLowerCase()}:${phone}`)
    .digest('hex');
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dup } = await admin
    .from('verification_requests').select('id')
    .eq('request_hash', hash).in('status', ['pending', 'processing'])
    .gte('created_at', dayAgo).limit(1);
  if (dup && dup.length > 0) throw new Error('A request for these details is already in progress.');

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
      provider: svc.provider ?? 'techhub',
      safe_request_data: { identifier: phone.slice(0, 3) + '*****' + phone.slice(-2) },
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
    const r = await submitBvnRetrieval({ firstName: first, lastName: last, phone });
    await admin.from('verification_requests').update({
      status: 'pending',
      provider_reference: r.ticketId,
      safe_response_data: { bvn_ticket_id: r.ticketId, bvn_status: r.status },
    }).eq('id', request.id);
    return { reference: ref, requestId: request.id, status: 'pending' };
  } catch (err) {
    // Plain Error = TechHub answered with a rejection -> refund. Timeout/network/parse = unknown -> no refund, no retry.
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
      const m = (err as Error).message ?? '';
      throw new Error(/balance|insufficient|fund|credit/i.test(m)
        ? 'This service is temporarily unavailable. You have not been charged.' : m);
    }
    await admin.from('verification_requests')
      .update({ error_message: 'Submit unconfirmed - needs manual review' })
      .eq('id', request.id);
    throw new Error(`We could not confirm your request. Do not resubmit. Contact support with reference ${ref}.`);
  }
}

export async function syncBvnRequest(row: any) {
  const r = await checkBvnRetrieval(row.provider_reference);
  const s = String(r.status ?? '').toLowerCase();
  const now = new Date().toISOString();
  const note = typeof r.response === 'string' ? r.response : null;
  const patch: any = {
    safe_response_data: {
      ...(row.safe_response_data ?? {}),
      bvn_status: r.status,
      bvn_note: note,
      retrieved_bvn: r.bvn ?? null,
    },
  };
  if (r.bvn) { patch.status = 'successful'; patch.completed_at = now; }
  else if (REJECTED.includes(s)) {
    patch.status = 'failed'; patch.completed_at = now;
    patch.error_message = note ?? 'Rejected by provider';
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
      p_description: 'Reversal for rejected BVN retrieval',
      p_verification_id: row.id,
    });
  }
  return { status: patch.status ?? 'pending', bvn: r.bvn ?? null, note };
}
