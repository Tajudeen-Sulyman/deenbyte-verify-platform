import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function publicSlip(row: any) {
  return {
    reference: row.reference, firstName: row.first_name, middleName: row.middle_name,
    lastName: row.last_name, address: row.address, tin: row.tin, slipType: row.slip_type,
    tier: row.tier, fullName: row.full_name, email: row.email, prepared: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference') ?? '';
  if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 });
  const { data: row } = await admin.from('taxid_slips').select('*')
    .eq('reference', reference).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status === 'paid') return NextResponse.json({ paid: true, slip: publicSlip(row) });

  const v = await fetch(
    'https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
    { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }
  ).then((r) => r.json()).catch(() => null);

  const ok = v?.status === true && v?.data?.status === 'success'
    && Number(v?.data?.amount ?? 0) >= Number(row.amount) * 100;
  if (ok) {
    await admin.from('taxid_slips').update({ status: 'paid' }).eq('reference', reference);
    return NextResponse.json({ paid: true, slip: publicSlip(row) });
  }
  return NextResponse.json({ paid: false });
}
