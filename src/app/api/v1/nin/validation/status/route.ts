import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const supabaseAdmin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BASE = 'https://aijalon.ng';
const TOKEN = process.env.AIJALON_API_KEY!;

async function post(path: string, body: any) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return await r.json().catch(() => null);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const reference = String(body.reference ?? '');
  if (!reference) return NextResponse.json({ error: 'Reference required.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { data: row } = await supabaseAdmin.from('verification_requests').select('*').eq('reference', reference).eq('user_id', user.id).single();
  if (!row) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  const number = String(row.identifier ?? '');

  const st = await post('/api/v1/val/status', { number });
  const msg = String(st?.message ?? '');
  const done = st?.status === 'success' && /complet|verif|success/i.test(msg) && !/pend|process|queue|shortly/i.test(msg);
  const failed = /fail|error|invalid|not eligible|refund|unable/i.test(msg) && !done;

  if (!done && !failed) {
    return NextResponse.json({ status: row.status, message: msg || 'Still processing. Please check back later.' });
  }
  if (failed) {
    if (row.status !== 'failed') {
      await supabaseAdmin.from('verification_requests').update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() }).eq('id', row.id);
      await supabaseAdmin.rpc('credit_wallet', { p_user_id: user.id, p_amount: row.selling_price, p_type: 'reversal', p_reference: 'REV-' + reference, p_description: 'Refund: failed validation ' + reference, p_verification_id: row.id });
    }
    return NextResponse.json({ status: 'failed', message: msg, refund: true });
  }
  const slip = await post('/api/v1/val/slip', { number, type: 'nonprem' });
  const data = slip?.data ?? null;
  await supabaseAdmin.from('verification_requests').update({
    status: 'successful',
    safe_response_data: data ?? row.safe_response_data,
    provider_reference: slip?.reportID ?? row.provider_reference,
    completed_at: new Date().toISOString(),
  }).eq('id', row.id);
  return NextResponse.json({ status: 'successful', message: slip?.message ?? msg, data });
}
