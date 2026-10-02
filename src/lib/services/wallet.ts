import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyWithPaystack(reference: string) {
  const res = await fetch(
    'https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
    { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY }, signal: AbortSignal.timeout(10000) }
  );
  return res.json();
}

export async function settlePayment(reference: string): Promise<{ credited: boolean; amount?: number; reason?: string; retry?: boolean }> {
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
    const ps = String(v?.data?.status ?? '');
    if (v?.status && (ps === 'failed' || ps === 'reversed')) {
      await supabaseAdmin.from('payment_transactions').update({ status: 'failed' }).eq('id', payment.id);
      return { credited: false, reason: 'Payment was not successful.' };
    }
    // abandoned / ongoing / API hiccup: not final, so leave it pending and retryable
    return { credited: false, reason: 'Payment not confirmed yet.', retry: true };
  }

  // 3. Amount integrity check (Paystack returns kobo)
  const paidNaira = Number(v.data.amount) / 100;
  if (Math.abs(paidNaira - Number(payment.amount)) > 0.01) {
    await supabaseAdmin.from('payment_transactions').update({ status: 'failed' }).eq('id', payment.id);
    return { credited: false, reason: 'Paid amount does not match requested amount.' };
  }

  // 4. Credit first. credit_wallet is atomic and wallet_transactions.reference is UNIQUE,
  //    so a repeat call fails with 23505 and changes nothing.
  const { error: creditErr } = await supabaseAdmin.rpc('credit_wallet', {
    p_user_id: payment.user_id,
    p_amount: payment.amount,
    p_type: 'deposit',
    p_reference: 'DEP-' + reference,
    p_description: 'Wallet funding via Paystack',
  });
  const alreadyCredited = creditErr?.code === '23505';
  if (creditErr && !alreadyCredited) {
    return { credited: false, reason: 'Wallet credit failed - will retry.', retry: true };
  }

  // 5. Bookkeeping only. If this fails the payment stays pending; the retry hits the
  //    unique reference above, then repairs the status here.
  await supabaseAdmin.from('payment_transactions').update({
    status: 'successful',
    channel: v.data.channel ?? null,
    paid_at: v.data.paid_at ?? new Date().toISOString(),
  }).eq('id', payment.id).in('status', ['pending', 'failed']);

  if (alreadyCredited) return { credited: false, reason: 'Already processed.' };
  return { credited: true, amount: Number(payment.amount) };
}
