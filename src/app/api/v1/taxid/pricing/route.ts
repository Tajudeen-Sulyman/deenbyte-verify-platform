import { NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const { data, error } = await admin.from('taxid_pricing').select('tier, price');
  if (error) return NextResponse.json({ error: 'Could not load pricing.' }, { status: 500 });
  const prices: Record<string, number> = { standard: 300, premium: 700 };
  (data ?? []).forEach((r: any) => { prices[r.tier] = Number(r.price); });
  return NextResponse.json(prices);
}
