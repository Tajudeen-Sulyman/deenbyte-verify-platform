import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { submitToProvider } from '../apply/route';

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
const { data: row } = await admin.from('nin_mod_requests').select('*').eq('reference', ref).maybeSingle();
if (row && row.status === 'awaiting_payment') {
await admin.from('nin_mod_requests').update({ status: 'processing' }).eq('reference', ref);
const p = row.payload ?? {};
const j = await submitToProvider(row.nin, row.mod_type, p, p._support ?? '', p._attest ?? '').catch(() => ({}));
if ((j as any).status === 'success') await admin.from('nin_mod_requests').update({ provider_ref: String((j as any).data?.transaction_ref ?? '') }).eq('reference', ref);
await admin.from('wallet_transactions').insert({ reference: ref, user_id: user.id, amount: row.fee, type: 'nin_modification', status: 'successful', description: 'NIN Modification ' + ref });
await admin.from('notifications').insert({ user_id: user.id, title: 'Modification submitted', body: ref + ' queued — 1–48 hrs.' });
}
}
return NextResponse.redirect(new URL('/nin/modification', req.url));
}
