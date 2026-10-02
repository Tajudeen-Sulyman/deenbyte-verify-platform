import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function notify(user_id: string, title: string, body: string) {
  await admin.from('notifications').insert({ user_id, title, body });
}

export async function POST(req: NextRequest) {
  const secret = process.env.SEAMLESHUB_WEBHOOK_KEY?.trim();
  const given = new URL(req.url).searchParams.get('k');
  if (!secret || given !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const event = String(body?.event ?? '');
  const data = body?.data ?? {};

  if (event === 'modification.processed') {
    const ref = String(data.transaction_ref ?? '');
    if (ref) {
      const status = String(data.status ?? '') === 'completed' ? 'completed' : 'failed';
      const { data: mrow } = await admin.from('nin_mod_requests').select('user_id').eq('provider_ref', ref).maybeSingle();
      await admin.from('nin_mod_requests').update({
        status,
        provider_status: String(data.status ?? ''),
        completed_document: String(data.completed_document ?? '') || null,
        admin_note: String(data.admin_note ?? '') || null,
      }).eq('provider_ref', ref);
      if (mrow) await notify(mrow.user_id, status === 'completed' ? 'NIN Modification completed ✅' : 'NIN Modification update', status === 'completed' ? 'Your result document is ready to download in Modification History.' : String(data.admin_note ?? 'Your request needs attention — check History.'));
    }
  }
  if (event === 'nin_validation.completed' || event === 'nin_validation.failed') {
    const nin = String(data.nin ?? '');
    const completed = event === 'nin_validation.completed';
    if (nin) {
      const { data: rows } = await admin.from('nin_val_requests')
        .select('*').eq('nin', nin).in('status', ['awaiting_payment', 'pending', 'processing'])
        .order('created_at', { ascending: false }).limit(1);
      if (rows && rows[0]) {
        await admin.from('nin_val_requests').update({
          status: completed ? 'completed' : 'failed',
          result_text: completed ? String(data.result ?? '').slice(0, 1000) || 'Validation completed.' : null,
          error_message: completed ? null : String(data.result ?? data.admin_note ?? 'Validation failed.').slice(0, 500),
        }).eq('id', rows[0].id);
        await notify(rows[0].user_id, completed ? 'NIN Validation completed ✅' : 'NIN Validation failed', completed ? String(data.result ?? 'Your validation result is ready.') : 'Your validation failed. Check History for details.');
      }
    }
  }
  if (event === 'ipe.completed' || event === 'ipe.failed') {
    const completed = event === 'ipe.completed';
    const trk = String(data.tracking_id ?? '');
    const prov = String(data.reference ?? data.transaction_ref ?? '');
    const mask = (v: unknown) => {
      const s = String(v ?? '');
      return s.length > 5 ? s.slice(0, 3) + '*****' + s.slice(-2) : s;
    };
    const { data: svc } = await admin.from('verification_services').select('id').eq('service_id', 'ipe_clearance').maybeSingle();
    const find = async (col: string, val: string) => {
      if (!svc?.id || !val) return null;
      const { data: rows } = await admin.from('verification_requests').select('*')
        .eq('service_id', svc.id).eq('status', 'processing').eq(col, val)
        .order('created_at', { ascending: false }).limit(1);
      return rows?.[0] ?? null;
    };
    const row: any = (await find('provider_reference', prov)) ?? (await find('safe_request_data->fields->>tracking_id', trk));
    if (row) {
      if (completed) {
        await admin.from('verification_requests').update({
          status: 'successful',
          safe_response_data: { message: 'IPE clearance completed', nin: mask(data.nin), full_name: data.full_name ?? null },
          completed_at: new Date().toISOString(),
        }).eq('id', row.id).eq('status', 'processing');
        await notify(row.user_id, 'IPE Clearance completed ✅', 'Your NIN is now clear: ' + mask(data.nin));
      } else {
        // refund the customer first: credit_wallet is atomic and the reference is UNIQUE, so a repeat is a no-op
        const { error: refErr } = await admin.rpc('credit_wallet', {
          p_user_id: row.user_id, p_amount: row.selling_price, p_type: 'reversal',
          p_reference: 'REV-' + row.request_reference,
          p_description: 'Reversal for failed IPE Clearance',
          p_verification_id: row.id,
        });
        if (refErr && refErr.code !== '23505') {
          return NextResponse.json({ error: 'Retry' }, { status: 500 });
        }
        await admin.from('verification_requests').update({
          status: 'failed', error_code: 'provider_failed',
          error_message: String(data.admin_note ?? data.message ?? 'IPE clearance failed.').slice(0, 300),
          safe_response_data: { provider_refunded: !!data.refunded },
          completed_at: new Date().toISOString(),
        }).eq('id', row.id).eq('status', 'processing');
        await notify(row.user_id, 'IPE Clearance failed', 'Your request could not be completed. Your wallet has been refunded.');
      }
    }
  }
  // always ack 200
  return NextResponse.json({ received: true });
}
