import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyWithPaystack(reference: string) {
  const res = await fetch(
    'https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
    { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }
  );
  return res.json();
}

export async function settlePayment(reference: string): Promise<{ credited: boolean; amount?: number; reason?: string }> {
  // 1. Find our record
  const { data: payment } = await supabaseAdmin
    .from('payment_transactions')
    .select('*')
    .eq('paystack_reference', reference)
    .single();

  if (!payment) return { credited: false, reason: 'Unknown payment reference.' };
  if (payment.status === 'successful') return { credited: false, reason: 'Already credited.' };

  // 2. Verify with Paystack (server-side only — never trust the browser)
  const v = await verifyWithPaystack(reference);
  if (!v?.status || v?.data?.status !== 'success') {
    await supabaseAdmin.from('payment_transactions').update({ status: 'failed' }).eq('id', payment.id);
    return { credited: false, reason: 'Payment was not successful.' };
  }

  // 3. Amount integrity check (Paystack returns kobo)
  const paidNaira = Number(v.data.amount) / 100;
  if (Math.abs(paidNaira - Number(payment.amount)) > 0.01) {
    await supabaseAdmin.from('payment_transactions').update({ status: 'failed' }).eq('id', payment.id);
    return { credited: false, reason: 'Paid amount does not match requested amount.' };
  }

  // 4. Idempotent flip: pending -> successful (only ONE caller can win)
  const { data: flipped } = await supabaseAdmin
    .from('payment_transactions')
    .update({
      status: 'successful',
      channel: v.data.channel ?? null,
      paid_at: v.data.paid_at ?? new Date().toISOString(),
    })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select()
    .single();

  if (!flipped) return { credited: false, reason: 'Already processed.' };

  // 5. Credit the ledger
  await supabaseAdmin.rpc('credit_wallet', {
    p_user_id: payment.user_id,
    p_amount: payment.amount,
    p_type: 'deposit',
    p_reference: 'DEP-' + reference,
    p_description: 'Wallet funding via Paystack',
  });

  return { credited: true, amount: Number(payment.amount) };
}
