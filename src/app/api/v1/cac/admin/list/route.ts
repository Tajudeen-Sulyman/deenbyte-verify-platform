import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ADMIN = 'deenbyte.technologies@gmail.com';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const { data } = await admin.from('cac_applications').select('*').order('created_at', { ascending: false }).limit(200);
  return NextResponse.json({ rows: data ?? [] });
}
