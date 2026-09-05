import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const CATS = ['Business Name', 'Company (LLC)', 'Incorporated Trustee', 'Limited Partnership', 'Limited Liability Partnership'];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  const type = b.type === 'non_individual' ? 'non_individual' : 'individual';
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = String(b.phone ?? '').trim();
  const consent = b.consent === true;
  if (!email || !phone) return NextResponse.json({ error: 'Email and phone are required.' }, { status: 400 });
  if (!consent) return NextResponse.json({ error: 'You must accept the NDPA 2023 declaration.' }, { status: 400 });

  let nin = '', first = '', last = '', dob = '', rc = '', cat = '', org = '';
  if (type === 'individual') {
    nin = String(b.nin ?? '').replace(/\D/g, '');
    first = String(b.firstName ?? '').trim(); last = String(b.lastName ?? '').trim(); dob = String(b.dob ?? '').trim();
    if (nin.length !== 11) return NextResponse.json({ error: 'NIN must be 11 digits.' }, { status: 400 });
    if (!first || !last || !dob) return NextResponse.json({ error: 'First name, last name and date of birth are required.' }, { status: 400 });
  } else {
    rc = String(b.rcNumber ?? '').trim().toUpperCase();
    cat = String(b.category ?? '').trim(); org = String(b.orgName ?? '').trim();
    if (!/^(RC|BN)?\d{6,10}$/.test(rc)) return NextResponse.json({ error: 'Enter a valid RC/BN number.' }, { status: 400 });
    if (!CATS.includes(cat)) return NextResponse.json({ error: 'Select a registration category.' }, { status: 400 });
  }
  const fee = type === 'individual' ? 500 : 1000;
  const reference = 'TIN-' + Date.now() + Math.floor(1000 + Math.random() * 9000);
  const row = {
    user_id: user.id, reference, request_type: type,
    nin: nin || null, first_name: first || null, last_name: last || null, dob: dob || null,
    rc_number: rc || null, category: cat || null, org_name: org || null,
    email, phone, fee, consent, status: 'awaiting_payment',
  };

  if (b.payMethod === 'wallet') {
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    const bal = Number(wallet?.balance ?? 0);
    if (bal < fee) return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
    const { error } = await admin.from('tin_requests').insert({ ...row, status: 'pending' });
    if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
    await admin.from('wallets').update({ balance: bal - fee }).eq('user_id', user.id);
    await admin.from('wallet_transactions').insert({ user_id: user.id, amount: fee, type: 'tin_application', status: 'successful', description: 'TIN application ' + reference });
    return NextResponse.json({ ok: true, reference });
  }

  const { error } = await admin.from('tin_requests').insert(row);
  if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels: ['card', 'bank_transfer', 'ussd', 'bank'], email, amount: fee * 100, reference, callback_url: req.nextUrl.origin + '/tin/success' }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.status) return NextResponse.json({ error: 'Paystack initialization failed.' }, { status: 400 });
  return NextResponse.json({ authorization_url: json.data.authorization_url, reference });
}
