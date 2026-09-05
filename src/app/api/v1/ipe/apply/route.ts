import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { shPost } from '@/lib/seamleshub';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const FEE = 450;

async function submit(tracking_id: string) {
  const json = await shPost('/api/v1/ipe/clearance.php', { tracking_id });
  if (json?.status === 'success') {
    return { ok: true as const, provider_ref: String(json?.data?.reference ?? json?.data?.transaction_ref ?? '') };
  }
  return { ok: false as const, error: String(json?.message ?? 'IPE submission failed.') };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  const tracking_id = String(b.trackingId ?? '').trim().toUpperCase();
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = String(b.phone ?? '').trim();
  if (!/^[A-Z0-9-]{10,20}$/.test(tracking_id)) return NextResponse.json({ error: 'Enter a valid NIMC tracking ID (10–20 alphanumeric characters).' }, { status: 400 });
  if (!email || !phone) return NextResponse.json({ error: 'Email and phone are required.' }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: 'You must accept the NDPA declaration.' }, { status: 400 });
  const reference = 'IPE-' + Date.now() + Math.floor(1000 + Math.random() * 9000);
  const row = { user_id: user.id, reference, tracking_id, fee: FEE, email, phone, status: 'awaiting_payment' };

  if (b.payMethod === 'wallet') {
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    const bal = Number(wallet?.balance ?? 0);
    if (bal < FEE) return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
    const { error } = await admin.from('ipe_requests').insert(row);
    if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
    await admin.from('wallets').update({ balance: bal - FEE }).eq('user_id', user.id);
    await admin.from('wallet_transactions').insert({ user_id: user.id, amount: FEE, type: 'ipe_clearance', status: 'successful', description: 'IPE clearance ' + reference });
    const sub = await submit(tracking_id);
    if (sub.ok) {
      await admin.from('ipe_requests').update({ status: 'processing', provider_ref: sub.provider_ref || null }).eq('reference', reference);
      return NextResponse.json({ ok: true, reference });
    }
    await admin.from('ipe_requests').update({ status: 'failed', error_message: sub.error }).eq('reference', reference);
    return NextResponse.json({ error: sub.error }, { status: 400 });
  }

  const { error } = await admin.from('ipe_requests').insert(row);
  if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels: ['card', 'bank_transfer', 'ussd', 'bank'], email, amount: FEE * 100, reference, callback_url: req.nextUrl.origin + '/nin/ipe/success' }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.status) return NextResponse.json({ error: 'Paystack initialization failed.' }, { status: 400 });
  return NextResponse.json({ authorization_url: json.data.authorization_url, reference });
}
