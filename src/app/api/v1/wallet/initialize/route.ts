import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function publicOrigin(req: Request): string {
  const envUrl = process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host');
  if (host) return proto + '://' + host.split(',')[0].trim();
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 100 || amount > 500000) {
    return NextResponse.json({ error: 'Amount must be between ₦100 and ₦500,000.' }, { status: 422 });
  }

  const reference = 'DBF-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const { error: insertError } = await supabaseAdmin.from('payment_transactions').insert({
    user_id: user.id,
    paystack_reference: reference,
    amount,
  });
  if (insertError) return NextResponse.json({ error: 'Could not create payment.' }, { status: 400 });

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: Math.round(amount * 100),
      reference,
      callback_url: publicOrigin(req) + '/wallet/callback',
    }),
  });

  const json = await res.json();
  if (!json.status) return NextResponse.json({ error: json.message ?? 'Paystack initialization failed.' }, { status: 400 });

  return NextResponse.json({ authorization_url: json.data.authorization_url, reference });
}
