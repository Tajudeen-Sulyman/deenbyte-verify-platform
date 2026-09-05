import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { shPost } from '@/lib/seamleshub';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const { data } = await supabase.from('ipe_requests').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  const rows = data ?? [];
  for (const r of rows.filter((x: any) => x.status === 'processing' || x.status === 'pending').slice(0, 5)) {
    const json = await shPost('/api/v1/ipe/clearance.php', { action: 'check_status', reference: r.provider_ref ?? undefined, tracking_id: r.tracking_id });
    const st = String(json?.data?.status ?? '').toLowerCase();
    if (/compl|success|done/.test(st)) {
      await admin.from('ipe_requests').update({ status: 'completed', result_text: 'NIN: ' + String(json?.data?.nin ?? '') + ' • Name: ' + String(json?.data?.full_name ?? '') }).eq('id', r.id);
      r.status = 'completed';
    } else if (/fail|reject|cancel/.test(st)) {
      await admin.from('ipe_requests').update({ status: 'failed', error_message: String(json?.data?.admin_note ?? 'IPE clearance failed.') }).eq('id', r.id);
      r.status = 'failed';
    }
  }
  return NextResponse.json({ rows: rows.map((r: any) => ({ reference: r.reference, tracking_id: r.tracking_id, fee: r.fee, status: r.status, result_text: r.result_text, error_message: r.error_message, created_at: r.created_at })) });
}
