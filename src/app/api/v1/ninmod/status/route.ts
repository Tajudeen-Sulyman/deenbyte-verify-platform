import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { modificationStatus } from '@/lib/seamleshub';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const reference = req.nextUrl.searchParams.get('reference') ?? '';
  const { data: row } = await admin.from('nin_mod_requests').select('*').eq('reference', reference).eq('user_id', user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if ((row.status === 'processing' || row.status === 'pending') && row.provider_ref) {
    const st = await modificationStatus(row.provider_ref);
    if (st.state === 'completed' || st.state === 'failed') {
      await admin.from('nin_mod_requests').update({ status: st.state, provider_status: JSON.stringify(st.raw ?? {}).slice(0, 500) }).eq('reference', reference);
      return NextResponse.json({ status: st.state });
    }
  }
  const { data: fresh } = await admin.from('nin_mod_requests').select('status, completed_document, admin_note').eq('reference', reference).maybeSingle();
  return NextResponse.json({ status: fresh?.status ?? row.status, completed_document: fresh?.completed_document ?? null, admin_note: fresh?.admin_note ?? null });
}
