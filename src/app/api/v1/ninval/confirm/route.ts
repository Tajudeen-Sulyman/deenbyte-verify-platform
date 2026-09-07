import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('reference') ?? '';
  const trx = req.nextUrl.searchParams.get('trxref') ?? '';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  const v = await fetch('https://api.paystack.co/transaction/verify/' + trx, { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } });
  const vj = await v.json();
  if (vj.status && vj.data.status === 'success') {
    const { data: row } = await admin.from('nin_validation_requests').select('*').eq('reference', ref).maybeSingle();
    if (row && row.status === 'awaiting_payment') {
      await admin.from('nin_validation_requests').update({ status: 'processing' }).eq('reference', ref);
      const sub = await fetch('https://aijalon.ng/api/v1/val', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.AIJALON_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ number: row.nin }) });
      const j = await sub.json().catch(() => ({}));
      if (j.status === 'success') await admin.from('nin_validation_requests').update({ provider_ref: String(j.reportID ?? '') }).eq('reference', ref);
      await admin.from('wallet_transactions').insert({ reference: ref, user_id: user.id, amount: row.fee, type: 'nin_validation', status: 'successful', description: 'Validation ' + row.category + ' ' + ref });
      await admin.from('notifications').insert({ user_id: user.id, title: 'Validation submitted', body: ref + ' queued — results in 24–48h.' });
    }
  }
  return NextResponse.redirect(new URL('/nin/validation', req.url));
}
