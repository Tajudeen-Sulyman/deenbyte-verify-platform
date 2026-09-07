import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { VAL_FEE, SLIP_PREMIUM, VAL_CATEGORIES } from '@/lib/val-data';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  const raw = String(b.nin ?? '').trim();
  const nin = raw.replace(/\D/g, '');
  if (!(nin.length === 11 || raw.length >= 6)) return NextResponse.json({ error: 'Enter a valid 11-digit NIN or tracking ID.' }, { status: 400 });
  if (!VAL_CATEGORIES.includes(b.category)) return NextResponse.json({ error: 'Select a validation category.' }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: 'Consent is required (NDPA 2023).' }, { status: 400 });
  const slip = b.slip_type === 'prem' ? 'prem' : 'nonprem';
  const fee = VAL_FEE + (slip === 'prem' ? SLIP_PREMIUM : 0);
  const reference = 'VAL-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);

  if (b.payMethod === 'wallet') {
    const { data: w } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    const bal = Number(w?.balance ?? 0);
    if (bal < fee) return NextResponse.json({ error: 'Insufficient wallet balance. Required: ₦' + fee.toLocaleString('en-NG') }, { status: 400 });
    await admin.from('wallets').update({ balance: bal - fee }).eq('user_id', user.id);
    await admin.from('wallet_transactions').insert({ reference, user_id: user.id, amount: fee, type: 'nin_validation', status: 'successful', description: 'Validation ' + b.category + ' ' + reference });
    await admin.from('nin_validation_requests').insert({ user_id: user.id, reference, nin: raw, email: b.email ?? '', phone: b.phone ?? '', category: b.category, slip_type: slip, fee, status: 'processing' });
    const sub = await fetch('https://aijalon.ng/api/v1/val', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.AIJALON_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ number: raw }) });
    const j = await sub.json().catch(() => ({}));
    if (j.status !== 'success') {
      await admin.from('nin_validation_requests').update({ status: 'failed', admin_note: 'Provider submit failed' }).eq('reference', reference);
      const { data: w2 } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
      await admin.from('wallets').update({ balance: Number(w2?.balance ?? 0) + fee }).eq('user_id', user.id);
      await admin.from('wallet_transactions').insert({ reference: reference + '-R', user_id: user.id, amount: fee, type: 'reversal', status: 'successful', description: 'Validation refund ' + reference });
      return NextResponse.json({ error: 'Provider unavailable — payment refunded.' }, { status: 502 });
    }
    await admin.from('nin_validation_requests').update({ provider_ref: String(j.reportID ?? '') }).eq('reference', reference);
    await admin.from('notifications').insert({ user_id: user.id, title: 'Validation submitted', body: reference + ' queued — results in 24–48h.' });
    return NextResponse.json({ ok: true, reference });
  }

  await admin.from('nin_validation_requests').insert({ user_id: user.id, reference, nin: raw, email: b.email ?? '', phone: b.phone ?? '', category: b.category, slip_type: slip, fee, status: 'awaiting_payment' });
  const ps = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: fee * 100, email: b.email || user.email, metadata: { reference } }) });
  const pj = await ps.json();
  if (!pj.status) { await admin.from('nin_validation_requests').update({ status: 'failed' }).eq('reference', reference); return NextResponse.json({ error: 'Paystack init failed.' }, { status: 502 }); }
  return NextResponse.json({ authorization_url: pj.data.authorization_url, reference });
}
