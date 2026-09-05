import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { submitNinModification } from '@/lib/seamleshub';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const FEE = 5800;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  const modType = ['name', 'phone', 'address'].includes(b.modType) ? b.modType : '';
  const nin = String(b.nin ?? '').replace(/\D/g, '');
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = String(b.phone ?? '').trim();
  const consent = b.consent === true;
  const doc = String(b.docBase64 ?? '');
  if (!modType) return NextResponse.json({ error: 'Select a modification service.' }, { status: 400 });
  if (nin.length !== 11) return NextResponse.json({ error: 'NIN must be 11 digits.' }, { status: 400 });
  if (!email || !phone) return NextResponse.json({ error: 'Email and phone are required.' }, { status: 400 });
  if (!consent) return NextResponse.json({ error: 'You must accept the NDPA declaration.' }, { status: 400 });
  if (doc.length < 1000 || !/^(JVBERi|\/9j\/|iVBORw)/.test(doc))
    return NextResponse.json({ error: 'Upload a valid supporting document (PDF/JPG/PNG).' }, { status: 400 });

  const payload: Record<string, string> = {};
  if (modType === 'name') {
    if (!b.newFirstname || !b.newLastname) return NextResponse.json({ error: 'New first and last name are required.' }, { status: 400 });
    payload.new_firstname = String(b.newFirstname).trim(); payload.new_lastname = String(b.newLastname).trim();
    if (b.newMiddlename) payload.new_middlename = String(b.newMiddlename).trim();
    if (b.curFirstname) payload.current_first_name = String(b.curFirstname).trim();
    if (b.curLastname) payload.current_last_name = String(b.curLastname).trim();
    if (b.curMiddlename) payload.current_middle_name = String(b.curMiddlename).trim();
  } else if (modType === 'phone') {
    const np = String(b.newPhone ?? '').replace(/\D/g, '');
    if (np.length !== 11 || !np.startsWith('0')) return NextResponse.json({ error: 'New phone must be 11 digits starting with 0.' }, { status: 400 });
    payload.new_phone = np;
    if (b.curPhone) payload.current_phone = String(b.curPhone).replace(/\D/g, '');
    if (b.curFullName) payload.current_first_name = String(b.curFullName).trim();
  } else {
    if (!b.newAddress) return NextResponse.json({ error: 'New address is required.' }, { status: 400 });
    payload.new_address = String(b.newAddress).trim();
    if (b.newState) payload.new_state = String(b.newState).trim();
    if (b.newLga) payload.new_lga = String(b.newLga).trim();
    if (b.curAddress) payload.current_address = String(b.curAddress).trim();
    if (b.curFullName) payload.current_first_name = String(b.curFullName).trim();
  }

  const reference = 'NINMOD-' + Date.now() + Math.floor(1000 + Math.random() * 9000);
  const row = {
    user_id: user.id, reference, mod_type: modType, nin, payload, doc_base64: doc,
    doc_name: String(b.docName ?? 'document'), fee: FEE, email, phone, consent: true, status: 'awaiting_payment',
  };

  if (b.payMethod === 'wallet') {
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    const bal = Number(wallet?.balance ?? 0);
    if (bal < FEE) return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
    const { error } = await admin.from('nin_mod_requests').insert(row);
    if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
    await admin.from('wallets').update({ balance: bal - FEE }).eq('user_id', user.id);
    await admin.from('wallet_transactions').insert({ user_id: user.id, amount: FEE, type: 'nin_modification', status: 'successful', description: 'NIN modification ' + reference });
    const sub = await submitNinModification(row);
    if (sub.ok) {
      await admin.from('nin_mod_requests').update({ status: 'processing', provider_ref: sub.provider_ref }).eq('reference', reference);
      return NextResponse.json({ ok: true, reference, status: 'processing' });
    }
    await admin.from('nin_mod_requests').update({ status: 'failed', error_message: sub.error }).eq('reference', reference);
    return NextResponse.json({ error: sub.error }, { status: 400 });
  }

  const { error } = await admin.from('nin_mod_requests').insert(row);
  if (error) return NextResponse.json({ error: 'Could not create request.' }, { status: 500 });
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels: ['card', 'bank_transfer', 'ussd', 'bank'], email, amount: FEE * 100, reference, callback_url: req.nextUrl.origin + '/nin/modification/success' }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.status) return NextResponse.json({ error: 'Paystack initialization failed.' }, { status: 400 });
  return NextResponse.json({ authorization_url: json.data.authorization_url, reference });
}
