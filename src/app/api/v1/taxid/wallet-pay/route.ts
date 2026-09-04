import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required to pay with wallet.' }, { status: 401 });

  const b = await req.json();
  const firstName = String(b.firstName ?? '').trim();
  const lastName = String(b.lastName ?? '').trim();
  const tin = String(b.tin ?? '').replace(/\s/g, '');
  const email = String(b.email ?? '').trim().toLowerCase();
  const fullName = String(b.fullName ?? '').trim();
  const phone = String(b.phone ?? '').trim();
  const slipType = b.slipType === 'corporate' ? 'corporate' : 'individual';
  const tier = b.tier === 'premium' ? 'premium' : 'standard';
  if (!firstName || !lastName || !tin || !email || !fullName || !phone)
    return NextResponse.json({ error: 'All required fields must be filled.' }, { status: 400 });
  if (!/^\d{10,15}$/.test(tin))
    return NextResponse.json({ error: 'Enter a valid TIN (10-15 digits).' }, { status: 400 });

  const amount = 50; // TEST PRICE (revert: tier === 'premium' ? 700 : 300)
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
  const bal = Number(wallet?.balance ?? 0);
  if (bal < amount) return NextResponse.json({ error: 'Insufficient wallet balance. Fund your wallet or pay with card.' }, { status: 400 });

  const reference = 'TAXID-' + Date.now() + Math.floor(1000 + Math.random() * 9000);
  const { error: e1 } = await admin.from('taxid_slips').insert({
    reference, email, phone, full_name: fullName, first_name: firstName, last_name: lastName,
    middle_name: String(b.middleName ?? '').trim() || null,
    address: String(b.address ?? '').trim() || null,
    tin, slip_type: slipType, tier, amount, status: 'paid',
  });
  if (e1) return NextResponse.json({ error: 'Could not create slip.' }, { status: 500 });

  await admin.from('wallets').update({ balance: bal - amount }).eq('user_id', user.id);
  await admin.from('wallet_transactions').insert({
    user_id: user.id, amount, type: 'taxid_purchase', status: 'successful',
    description: 'TIN slip purchase ' + reference,
  });
  return NextResponse.json({ ok: true, reference });
}
