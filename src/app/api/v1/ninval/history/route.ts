import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ rows: [] });
  const { data } = await admin.from('nin_validation_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ rows: data ?? [] });
}
