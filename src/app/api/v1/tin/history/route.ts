import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const { data } = await supabase.from('tin_requests')
    .select('reference, request_type, nin, first_name, last_name, rc_number, category, org_name, fee, status, issued_tin, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ rows: data ?? [] });
}
