import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { shPost } from '@/lib/seamleshub';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference') ?? '';
  if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 });
  const { data: row } = await admin.from('ipe_requests').select('*').eq('reference', reference).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'awaiting_payment') return NextResponse.json({ confirmed: true, status: row.status });
  const v = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
    { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }).then((r) => r.json()).catch(() => null);
  if (v?.status === true && v?.data?.status === 'success' && Number(v?.data?.amount ?? 0) >= Number(row.fee) * 100) {
    const sub = await shPost('/api/v1/ipe/clearance.php', { tracking_id: row.tracking_id });
    if (sub?.status === 'success') {
      await admin.from('ipe_requests').update({ status: 'processing', provider_ref: String(sub?.data?.reference ?? sub?.data?.transaction_ref ?? '') || null }).eq('reference', reference);
      return NextResponse.json({ confirmed: true, status: 'processing' });
    }
    await admin.from('ipe_requests').update({ status: 'failed', error_message: String(sub?.message ?? 'Provider error') }).eq('reference', reference);
    return NextResponse.json({ confirmed: true, status: 'failed' });
  }
  return NextResponse.json({ confirmed: false });
}
