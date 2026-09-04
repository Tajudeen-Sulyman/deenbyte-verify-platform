import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
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
    const reference = 'TAXID-' + Date.now() + Math.floor(1000 + Math.random() * 9000);

    const { error } = await admin.from('taxid_slips').insert({
      reference, email, phone, full_name: fullName, first_name: firstName, last_name: lastName,
      middle_name: String(b.middleName ?? '').trim() || null,
      address: String(b.address ?? '').trim() || null,
      tin, slip_type: slipType, tier, amount, status: 'pending',
    });
    if (error) return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email, amount: amount * 100, reference,
        callback_url: req.nextUrl.origin + '/taxid/success',
      }),
    });
    const json = await res.json().catch(() => null);
    if (!json?.status) return NextResponse.json({ error: 'Paystack initialization failed.' }, { status: 400 });
    return NextResponse.json({ authorization_url: json.data.authorization_url, reference });
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
}
