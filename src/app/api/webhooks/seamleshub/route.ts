import { NextRequest, NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function notify(user_id: string, title: string, body: string) {
  await admin.from('notifications').insert({ user_id, title, body });
}

export async function POST(req: NextRequest) {
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
    const trk = String(data.tracking_id ?? '');
    const completed = event === 'ipe.completed';
    if (trk) {
      const { data: rows } = await admin.from('ipe_requests').select('*').eq('tracking_id', trk)
        .in('status', ['awaiting_payment', 'pending', 'processing']).order('created_at', { ascending: false }).limit(1);
      const row = rows?.[0];
      if (row) {
        await admin.from('ipe_requests').update({
          status: completed ? 'completed' : 'failed',
          result_text: completed ? ('NIN: ' + String(data.nin ?? '') + ' • Name: ' + String(data.full_name ?? '')) : null,
          error_message: completed ? null : ('IPE clearance failed. ' + (data.refunded ? 'Provider auto-refunded — wallet credited.' : 'Contact support.')),
        }).eq('id', row.id);
        await notify(row.user_id, completed ? 'IPE Clearance completed ✅' : 'IPE Clearance failed', completed ? ('Your NIN is now clear: ' + String(data.nin ?? '')) : (data.refunded ? 'Failed — your wallet has been refunded.' : 'Failed. Contact support.'));
        if (!completed && data.refunded) {
          const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', row.user_id).maybeSingle();
          await admin.from('wallets').update({ balance: Number(wallet?.balance ?? 0) + Number(row.fee) }).eq('user_id', row.user_id);
          await admin.from('wallet_transactions').insert({ user_id: row.user_id, amount: Number(row.fee), type: 'reversal', status: 'successful', description: 'IPE refund ' + row.reference });
        }
      }
    }
  }
  // always ack 200
  return NextResponse.json({ received: true });
}
