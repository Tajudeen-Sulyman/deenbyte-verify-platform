import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference') ?? '';
  if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 });
  const { data: row } = await admin.from('tin_requests').select('*').eq('reference', reference).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'awaiting_payment') return NextResponse.json({ confirmed: true, status: row.status });
  const v = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
    { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }).then((r) => r.json()).catch(() => null);
  if (v?.status === true && v?.data?.status === 'success' && Number(v?.data?.amount ?? 0) >= Number(row.fee) * 100) {
    await admin.from('tin_requests').update({ status: 'pending' }).eq('reference', reference);
    return NextResponse.json({ confirmed: true, status: 'pending' });
  }
  return NextResponse.json({ confirmed: false });
}
