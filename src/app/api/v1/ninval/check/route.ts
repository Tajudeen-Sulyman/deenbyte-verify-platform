import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const AIJ = process.env.AIJALON_TOKEN || process.env.AIJALON_API_KEY || process.env.AIJALON_KEY || process.env.AIJALON_BEARER || '';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  const { data: row } = await admin.from('nin_validation_requests').select('*').eq('reference', b.reference).eq('user_id', user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (row.status === 'completed') return NextResponse.json({ row });
  const st = await fetch('https://aijalon.ng/api/v1/val/status', { method: 'POST', headers: { Authorization: 'Bearer ' + AIJ, 'Content-Type': 'application/json' }, body: JSON.stringify({ number: row.nin }) });
  const sj = await st.json().catch(() => ({}));
  if (String(sj.message ?? '').toLowerCase().includes('complet')) {
    const sl = await fetch('https://aijalon.ng/api/v1/val/slip', { method: 'POST', headers: { Authorization: 'Bearer ' + AIJ, 'Content-Type': 'application/json' }, body: JSON.stringify({ number: row.nin, type: row.slip_type === 'prem' ? 'prem' : 'nonprem' }) });
    const lj = await sl.json().catch(() => ({}));
    if (lj.status === 'success') {
      await admin.from('nin_validation_requests').update({ status: 'completed', slip: lj.data ?? lj, updated_at: new Date().toISOString() }).eq('reference', row.reference);
      await admin.from('notifications').insert({ user_id: user.id, title: 'Validation completed ✅', body: row.reference + ' — your result is ready.' });
      const { data: fresh } = await admin.from('nin_validation_requests').select('*').eq('reference', row.reference).maybeSingle();
      return NextResponse.json({ row: fresh });
    }
  }
  return NextResponse.json({ row: { ...row, provider_message: sj.message ?? 'Still processing' } });
}
