import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncIpeRequest } from '@/lib/services/ipe';
import { syncBvnRequest } from '@/lib/services/bvn-retrieval';
import { syncNinValidationRequest } from '@/lib/services/nin-validation';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERVICES: { id: string; sync: (row: any) => Promise<unknown> }[] = [
  { id: 'ipe_clearance', sync: syncIpeRequest },
  { id: 'bvn_retrieval', sync: syncBvnRequest },
  { id: 'nin_validation', sync: syncNinValidationRequest },
];

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  let checked = 0;
  for (const s of SERVICES) {
    const { data: svc } = await admin
      .from('verification_services').select('id').eq('service_id', s.id).single();
    if (!svc) continue;
    const { data: rows } = await admin
      .from('verification_requests').select('*')
      .eq('service_id', svc.id).eq('status', 'pending')
      .not('provider_reference', 'is', null).limit(50);
    for (const row of rows ?? []) {
      try { await s.sync(row); checked++; } catch { /* retry next run */ }
    }
  }
  return NextResponse.json({ checked });
}
