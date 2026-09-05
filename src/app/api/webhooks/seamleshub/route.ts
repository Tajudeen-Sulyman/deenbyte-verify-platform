import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const event = String(body?.event ?? '');
  const data = body?.data ?? {};

  if (event === 'modification.processed') {
    const ref = String(data.transaction_ref ?? '');
    if (ref) {
      const status = String(data.status ?? '') === 'completed' ? 'completed' : 'failed';
      await admin.from('nin_mod_requests').update({
        status,
        provider_status: String(data.status ?? ''),
        completed_document: String(data.completed_document ?? '') || null,
        admin_note: String(data.admin_note ?? '') || null,
      }).eq('provider_ref', ref);
    }
  }
  // ipe.* / nin_validation.* handled when those services go live; always ack 200
  return NextResponse.json({ received: true });
}
