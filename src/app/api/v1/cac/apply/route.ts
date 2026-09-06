import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { CAC_FEES } from '@/lib/cac-data';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  const entity = b.entity === 'ltd' ? 'ltd' : 'bn';
  const fee = entity === 'ltd' ? CAC_FEES.ltd : CAC_FEES.bn;
  const name = b.name ?? {}; const company = b.company ?? {}; const persons = Array.isArray(b.persons) ? b.persons : [];
  const docs = b.docs ?? {};
  if (!name.proposed || !name.category || !name.nature) return NextResponse.json({ error: 'Name, category and nature are required.' }, { status: 400 });
  if (!company.email || !company.state || !company.city || !company.street) return NextResponse.json({ error: 'Company details incomplete.' }, { status: 400 });
  if (persons.length === 0) return NextResponse.json({ error: 'At least one proprietor/director required.' }, { status: 400 });
  for (const p of persons) if (!p.surname || !p.first || !p.email || !p.phone) return NextResponse.json({ error: 'Person details incomplete.' }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: 'Consent is required.' }, { status: 400 });

  const reference = 'CAC-' + Date.now() + Math.floor(1000 + Math.random() * 9000);
  const docPaths: Record<string, string> = {};
  for (const key of Object.keys(docs)) {
    const [pi, kind] = key.split('_');
    const ext = String(docs[key]).startsWith('JVBERi') ? 'pdf' : 'jpg';
    const path = user.id + '/' + reference + '/' + pi + '_' + kind + '.' + ext;
    const up = await admin.storage.from('cac-docs').upload(path, Buffer.from(docs[key], 'base64'), { contentType: ext === 'pdf' ? 'application/pdf' : 'image/jpeg', upsert: true });
    if (up.error) return NextResponse.json({ error: 'Document upload failed: ' + key }, { status: 500 });
    docPaths[key] = path;
  }

  const row = {
    user_id: user.id, reference, entity_type: entity, fee,
    payload: { name, ownership: b.ownership, company, persons, docPaths },
    email: company.email, phone: persons[0]?.phone ?? '', status: 'awaiting_payment',
  };

  if (b.payMethod === 'wallet') {
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    const bal = Number(wallet?.balance ?? 0);
    if (bal < fee) return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
    const { error } = await admin.from('cac_applications').insert(row);
    if (error) return NextResponse.json({ error: 'Could not create application.' }, { status: 500 });
    await admin.from('wallets').update({ balance: bal - fee }).eq('user_id', user.id);
    await admin.from('wallet_transactions').insert({ user_id: user.id, amount: fee, type: 'cac_' + entity, status: 'successful', description: 'CAC ' + entity.toUpperCase() + ' ' + reference });
    await admin.from('cac_applications').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('reference', reference);
    await admin.from('notifications').insert({ user_id: user.id, title: 'CAC application received ✅', body: reference + ' is now in our processing queue.' });
    return NextResponse.json({ ok: true, reference });
  }

  const { error } = await admin.from('cac_applications').insert(row);
  if (error) return NextResponse.json({ error: 'Could not create application.' }, { status: 500 });
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels: ['card', 'bank_transfer', 'ussd', 'bank'], email: company.email, amount: fee * 100, reference, callback_url: req.nextUrl.origin + '/cac/history' }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.status) return NextResponse.json({ error: 'Paystack initialization failed.' }, { status: 400 });
  return NextResponse.json({ authorization_url: json.data.authorization_url, reference });
}
