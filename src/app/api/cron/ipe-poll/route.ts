import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncIpeRequest } from '@/lib/services/ipe';
import { syncBvnRequest } from '@/lib/services/bvn-retrieval';
import { syncNinValidationRequest } from '@/lib/services/nin-validation';
import { LB, syncLbRequest } from '@/lib/services/lorabiz-async';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERVICES: { id: string; sync: (row: any) => Promise<unknown> }[] = [
  { id: 'ipe_clearance', sync: syncIpeRequest },
  { id: 'bvn_retrieval', sync: syncBvnRequest },
  { id: 'nin_validation', sync: syncNinValidationRequest },
  { id: 'lorabiz_ipe', sync: (row: any) => syncLbRequest(LB.ipe, row) },
  { id: 'lorabiz_personalization', sync: (row: any) => syncLbRequest(LB.personalization, row) },
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
    let rowsQuery = admin
      .from('verification_requests').select('*')
      .eq('service_id', svc.id).eq('status', 'pending');

    // Legacy providers require a provider reference. Lorabiz can look up
    // requests by our client reference when its provider reference is absent.
    if (!s.id.startsWith('lorabiz_')) {
      rowsQuery = rowsQuery.not('provider_reference', 'is', null);
    }

    const { data: rows } = await rowsQuery.limit(50);
    for (const row of rows ?? []) {
      try { await s.sync(row); checked++; } catch { /* retry next run */ }
    }
  }
  return NextResponse.json({ checked });
}
