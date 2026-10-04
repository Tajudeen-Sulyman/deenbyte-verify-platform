import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncIpeRequest } from '@/lib/services/ipe';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const { data: svc } = await admin
    .from('verification_services').select('id').eq('service_id', 'ipe_clearance').single();
  if (!svc) return NextResponse.json({ checked: 0 });

  const { data: rows } = await admin
    .from('verification_requests').select('*')
    .eq('service_id', svc.id).eq('status', 'pending')
    .not('provider_reference', 'is', null).limit(50);

  let checked = 0;
  for (const row of rows ?? []) {
    try { await syncIpeRequest(row); checked++; } catch { /* retry next run */ }
  }
  return NextResponse.json({ checked });
}
