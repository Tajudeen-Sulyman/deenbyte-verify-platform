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
  if (event === 'nin_validation.completed' || event === 'nin_validation.failed') {
    const nin = String(data.nin ?? '');
    const completed = event === 'nin_validation.completed';
    if (nin) {
      const { data: rows } = await admin.from('nin_val_requests')
        .select('id').eq('nin', nin).in('status', ['awaiting_payment', 'pending', 'processing'])
        .order('created_at', { ascending: false }).limit(1);
      if (rows && rows[0]) {
        await admin.from('nin_val_requests').update({
          status: completed ? 'completed' : 'failed',
          result_text: completed ? String(data.result ?? '').slice(0, 1000) || 'Validation completed.' : null,
          error_message: completed ? null : String(data.result ?? data.admin_note ?? 'Validation failed.').slice(0, 500),
        }).eq('id', rows[0].id);
      }
    }
  }
  // ipe.* handled when IPE service goes live; always ack 200
  return NextResponse.json({ received: true });
}
