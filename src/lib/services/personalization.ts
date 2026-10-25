import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { submitPersonalization, statusPersonalization, personalizationConfigured } from '@/lib/providers/seamleshub-personalization';

const SERVICE_ID = 'seamleshub_personalization';
const BUCKET = 'personalization-slips';
const TRACKING_RE = /^[A-Za-z0-9]{15}$/;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function refund(userId: string, amount: number, ref: string, requestId: string) {
  const { error } = await admin.rpc('credit_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'reversal',
    p_reference: 'REV-' + ref,
    p_description: 'Reversal for failed NIN personalization',
    p_verification_id: requestId,
  });
  if (error) throw new Error('Refund failed: ' + error.message);
}

async function notify(userId: string, title: string, body: string) {
  await admin.from('notifications').insert({ user_id: userId, title, body });
}

export async function submitPersonalizationRequest(userId: string, input: any) {
  const tid = String(input?.tracking_id ?? '').trim();
  if (!TRACKING_RE.test(tid)) throw new Error('A NIMC tracking ID is exactly 15 letters or numbers.');
  if (!personalizationConfigured()) throw new Error('This service is currently unavailable.');

  const { data: svc } = await admin.from('verification_services').select('*')
    .eq('service_id', SERVICE_ID).maybeSingle();
  if (!svc || svc.status !== 'active' || !svc.enabled) {
    throw new Error('This service is currently unavailable.');
  }

  const hash = createHash('sha256').update(`${userId}:${SERVICE_ID}:${tid.toLowerCase()}`).digest('hex');
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dup } = await admin.from('verification_requests').select('id')
    .eq('request_hash', hash).in('status', ['pending', 'processing']).gte('created_at', dayAgo).limit(1);
  if (dup && dup.length > 0) throw new Error('A request for this tracking ID is already in progress.');

  const ref = 'DBV-' + Date.now().toString().slice(-8);
  const { data: request, error: reqErr } = await admin.from('verification_requests').insert({
    user_id: userId,
    service_id: svc.id,
    request_reference: ref,
    request_hash: hash,
    status: 'pending',
    selling_price: svc.selling_price,
    provider_cost: svc.provider_cost,
    provider: 'seamleshub',
    safe_request_data: { identifier: tid.slice(0, 3) + '*********' + tid.slice(-3) },
  }).select().single();
  if (reqErr || !request) throw new Error('Could not create request.');

  const { data: ok, error: dedErr } = await admin.rpc('deduct_wallet', {
    p_user_id: userId,
    p_amount: svc.selling_price,
    p_reference: ref,
    p_verification_id: request.id,
  });
  if (dedErr || !ok) {
    await admin.from('verification_requests')
      .update({ status: 'failed', error_message: 'Insufficient wallet balance' }).eq('id', request.id);
    throw new Error('Insufficient wallet balance. Fund your wallet and try again.');
  }

  const r = await submitPersonalization(tid);

  if (r.kind === 'accepted') {
    await admin.from('verification_requests').update({
      status: 'pending',
      provider_reference: r.reference,
      safe_response_data: { pers_status: 'processing' },
    }).eq('id', request.id);
    return { reference: ref, requestId: request.id, status: 'pending' };
  }

  if (r.kind === 'rejected') {
    await refund(userId, svc.selling_price, ref, request.id);
    await admin.from('verification_requests').update({
      status: 'failed', error_message: r.message, completed_at: new Date().toISOString(),
    }).eq('id', request.id);
    throw new Error(r.code === 'INVALID_TRACKING_ID'
      ? r.message
      : 'This service is temporarily unavailable. You have not been charged.');
  }

  // No reference and no clear answer: hold for manual review, never retry automatically
  await admin.from('verification_requests')
    .update({ error_message: 'Submit unconfirmed - needs manual review' }).eq('id', request.id);
  throw new Error(`We could not confirm your request. Do not resubmit. Contact support with reference ${ref}.`);
}

export async function syncPersonalizationRequest(row: any) {
  const s = await statusPersonalization(row.provider_reference);
  if (!s.ok) return { status: 'pending' };
  const d = s.data;
  const st = String(d.request_status).toLowerCase();

  if (st === 'completed') {
    // Store the PDF first; only then flip the row, so a success never lacks its slip
    const pdfPath = `${row.user_id}/${row.request_reference}.pdf`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(
      pdfPath, Buffer.from(String(d.pdf_base64), 'base64'),
      { contentType: 'application/pdf', upsert: true }
    );
    if (upErr) throw new Error('Could not store the slip: ' + upErr.message);

    const nin = String(d.nin ?? '');
    const masked = nin.length === 11 ? nin.slice(0, 3) + '*****' + nin.slice(-2) : null;
    const { data: flipped } = await admin.from('verification_requests').update({
      status: 'successful',
      completed_at: new Date().toISOString(),
      safe_response_data: { pers_status: 'completed', pers_pdf_path: pdfPath, pers_nin_masked: masked },
    }).eq('id', row.id).eq('status', 'pending').select('id');
    if (flipped?.length) {
      await notify(row.user_id, 'NIN personalization ready', 'Your slip is ready. Open it from History.');
    }
    return { status: 'successful' };
  }

  if (st === 'failed') {
    // Only the call that flips pending to failed refunds, so repeated checks cannot pay out twice
    const { data: flipped } = await admin.from('verification_requests').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: String(d.message ?? 'Could not resolve this tracking ID.').slice(0, 300),
      safe_response_data: { pers_status: 'failed' },
    }).eq('id', row.id).eq('status', 'pending').select('id');
    if (flipped?.length) {
      await refund(row.user_id, row.selling_price, row.request_reference, row.id);
      await notify(row.user_id, 'NIN personalization refunded',
        `Your request ${row.request_reference} could not be completed. ₦${Number(row.selling_price).toLocaleString()} was returned to your wallet.`);
    }
    return { status: 'failed' };
  }

  return { status: 'pending' };
}
