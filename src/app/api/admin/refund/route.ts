import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const requestId = String(body?.request_id ?? '');
  const note = String(body?.note ?? '').trim().slice(0, 200);
  if (!requestId) return NextResponse.json({ error: 'request_id is required.' }, { status: 400 });

  const { data: row } = await admin
    .from('verification_requests').select('*, verification_services(name)')
    .eq('id', requestId).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (row.refunded_at) return NextResponse.json({ error: 'Already refunded.' }, { status: 409 });
  if (!['failed', 'pending', 'processing'].includes(row.status)) {
    return NextResponse.json({ error: 'Successful requests cannot be refunded here.' }, { status: 400 });
  }

  // Ledger check: must have been charged, and must not already be refunded
  const { data: txs, error: txErr } = await admin
    .from('transactions').select('type, amount')
    .eq('verification_id', row.id)
    .in('type', ['verification_charge', 'reversal', 'refund']);
  if (txErr) {
    return NextResponse.json({ error: 'Could not read the wallet ledger. Nothing was refunded.' }, { status: 500 });
  }
  const charge = (txs ?? []).find((t: any) => t.type === 'verification_charge');
  if (!charge) return NextResponse.json({ error: 'No charge found for this request, so there is nothing to refund.' }, { status: 409 });
  if ((txs ?? []).some((t: any) => t.type === 'reversal' || t.type === 'refund')) {
    return NextResponse.json({ error: 'This request was already refunded.' }, { status: 409 });
  }
  const amount = Math.abs(Number(charge.amount));
  if (!amount || !isFinite(amount)) {
    return NextResponse.json({ error: 'Could not determine the amount charged.' }, { status: 500 });
  }

  // Claim the refund atomically so a double-tap cannot pay twice
  const { data: claimed } = await admin
    .from('verification_requests')
    .update({ refunded_at: new Date().toISOString(), refunded_by: user.id, refund_note: note || null })
    .eq('id', row.id).is('refunded_at', null).select('id');
  if (!claimed?.length) return NextResponse.json({ error: 'Already refunded.' }, { status: 409 });

  const svcName = Array.isArray(row.verification_services)
    ? row.verification_services[0]?.name : row.verification_services?.name;
  const { error: creditErr } = await admin.rpc('credit_wallet', {
    p_user_id: row.user_id,
    p_amount: amount,
    p_type: 'refund',
    p_reference: 'RFD-' + row.request_reference,
    p_description: 'Refund for ' + (svcName ?? 'verification') + (note ? ': ' + note : ''),
    p_verification_id: row.id,
  });
  if (creditErr) {
    // release the claim so it can be retried
    await admin.from('verification_requests')
      .update({ refunded_at: null, refunded_by: null, refund_note: null }).eq('id', row.id);
    return NextResponse.json({ error: 'Refund failed. Nothing was credited.' }, { status: 500 });
  }

  if (row.status !== 'failed') {
    await admin.from('verification_requests').update({
      status: 'failed',
      error_message: 'Refunded by admin',
      completed_at: new Date().toISOString(),
    }).eq('id', row.id);
  }
  await admin.from('notifications').insert({
    user_id: row.user_id,
    title: 'Refund issued',
    body: `₦${amount.toLocaleString()} for ${svcName ?? 'your request'} (${row.request_reference}) was returned to your wallet.${note ? ' ' + note : ''}`,
  });

  return NextResponse.json({ success: true, amount });
}
