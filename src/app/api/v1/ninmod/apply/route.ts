import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { MOD_FEE, MOD_TYPES } from '@/lib/mod-data';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const SH = process.env.SEAMLESHUB_API_KEY || process.env.SEAMLESHUB_KEY || '';

export async function submitToProvider(nin: string, modType: string, vals: Record<string, string>, support: string, attest: string) {
const t = MOD_TYPES.find((x) => x.key === modType)!;
const body: Record<string, string> = { api_key: SH, nin, modification_type: modType, support_doc_base64: support };
if (attest) body.attestation_file_base64 = attest;
for (const f of [...t.cur, ...t.neu]) if (vals[f]) body[f] = vals[f];
const r = await fetch('https://seamleshub.com/api_nin_modification_api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
return await r.json().catch(() => ({}));
}

export async function POST(req: NextRequest) {
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
const b = await req.json();
const nin = String(b.nin ?? '').replace(/\D/g, '');
const t = MOD_TYPES.find((x) => x.key === b.mod_type);
if (nin.length !== 11) return NextResponse.json({ error: 'Enter a valid 11-digit NIN.' }, { status: 400 });
if (!t) return NextResponse.json({ error: 'Select a modification service.' }, { status: 400 });
for (const f of t.neu) if (!b.vals?.[f]) return NextResponse.json({ error: 'Fill all NEW fields: ' + f.replace('new_', '') }, { status: 400 });
if (!b.support_doc) return NextResponse.json({ error: 'Supporting document is required.' }, { status: 400 });
if (b.consent !== true) return NextResponse.json({ error: 'Consent is required (NDPA 2023).' }, { status: 400 });
const fee = MOD_FEE;
const reference = 'MOD-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);

if (b.payMethod === 'wallet') {
const { data: w } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
const bal = Number(w?.balance ?? 0);
if (bal < fee) return NextResponse.json({ error: 'Insufficient wallet balance. Required: ₦' + fee.toLocaleString('en-NG') }, { status: 400 });
await admin.from('wallets').update({ balance: bal - fee }).eq('user_id', user.id);
await admin.from('wallet_transactions').insert({ reference, user_id: user.id, amount: fee, type: 'nin_modification', status: 'successful', description: 'NIN Modification ' + t.label + ' ' + reference });
await admin.from('nin_mod_requests').insert({ user_id: user.id, reference, nin, mod_type: t.key, fee, status: 'processing', payload: b.vals ?? {} });
let j: any = {};
try { j = await submitToProvider(nin, t.key, b.vals ?? {}, b.support_doc, b.attest ?? ''); } catch { j = {}; }
if (j.status !== 'success') {
await admin.from('nin_mod_requests').update({ status: 'failed', admin_note: 'Provider submit failed' }).eq('reference', reference);
const { data: w2 } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
await admin.from('wallets').update({ balance: Number(w2?.balance ?? 0) + fee }).eq('user_id', user.id);
await admin.from('wallet_transactions').insert({ reference: reference + '-R', user_id: user.id, amount: fee, type: 'reversal', status: 'successful', description: 'Modification refund ' + reference });
return NextResponse.json({ error: 'Provider: ' + String(j.message ?? 'unreachable') + ' — payment refunded.' }, { status: 502 });
}
await admin.from('nin_mod_requests').update({ provider_ref: String(j.data?.transaction_ref ?? '') }).eq('reference', reference);
await admin.from('notifications').insert({ user_id: user.id, title: 'Modification submitted', body: reference + ' queued — 1–48 hrs.' });
return NextResponse.json({ ok: true, reference });
}

await admin.from('nin_mod_requests').insert({ user_id: user.id, reference, nin, mod_type: t.key, fee, status: 'awaiting_payment', payload: { ...(b.vals ?? {}), _support: b.support_doc, _attest: b.attest ?? '' } });
const ps = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: fee * 100, email: b.email || user.email, metadata: { reference } }) });
const pj = await ps.json();
if (!pj.status) { await admin.from('nin_mod_requests').update({ status: 'failed' }).eq('reference', reference); return NextResponse.json({ error: 'Paystack init failed.' }, { status: 502 }); }
return NextResponse.json({ authorization_url: pj.data.authorization_url, reference });
}
