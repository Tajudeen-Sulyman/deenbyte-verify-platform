import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { shPost } from '@/lib/seamleshub';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const FEES: Record<string, number> = { no_record: 1100, sim_vnin: 1100, modification: 1600, photographic: 1600 };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  const category = FEES[b.category] ? b.category : '';
  const nin = String(b.nin ?? '').replace(/\D/g, '');
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = String(b.phone ?? '').trim();
  if (!category) return NextResponse.json({ error: 'Select a validation category.' }, { status: 400 });
  if (nin.length !== 11) return NextResponse.json({ error: 'NIN must be 11 digits.' }, { status: 400 });
  if (!email || !phone) return NextResponse.json({ error: 'Email and phone are required.' }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: 'You must accept the NDPA declaration.' }, { status: 400 });
  const fee = FEES[category];
  const reference = 'NINVAL-' + Date.now() + Math.floor(1000 + Math.random() * 9000);
  const row = { user_id: user.id, reference, category, nin, fee, email, phone, status: 'awaiting_payment' };

  if (b.payMethod === 'wallet') {
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    const bal = Number(wallet?.balance ?? 0);
    if (bal < fee) return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
    const { error } = await admin.from('nin_val_requests').insert(row);
    if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
    await admin.from('wallets').update({ balance: bal - fee }).eq('user_id', user.id);
    await admin.from('wallet_transactions').insert({ user_id: user.id, amount: fee, type: 'nin_validation', status: 'successful', description: 'NIN validation ' + reference });
    const json = await shPost('/api/v1/nin/validate.php', { nin });
    if (json?.status === 'success') {
      await admin.from('nin_val_requests').update({ status: 'processing', provider_ref: String(json?.data?.transaction_ref ?? json?.data?.reference ?? '') || null }).eq('reference', reference);
      return NextResponse.json({ ok: true, reference });
    }
    await admin.from('nin_val_requests').update({ status: 'failed', error_message: String(json?.message ?? 'Provider error') }).eq('reference', reference);
    return NextResponse.json({ error: String(json?.message ?? 'Provider error') }, { status: 400 });
  }

  const { error } = await admin.from('nin_val_requests').insert(row);
  if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels: ['card', 'bank_transfer', 'ussd', 'bank'], email, amount: fee * 100, reference, callback_url: req.nextUrl.origin + '/nin/validation/success' }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.status) return NextResponse.json({ error: 'Paystack initialization failed.' }, { status: 400 });
  return NextResponse.json({ authorization_url: json.data.authorization_url, reference });
}
