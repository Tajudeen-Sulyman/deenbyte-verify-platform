import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const { data } = await supabase.from('nin_val_requests')
    .select('reference, category, nin, fee, status, result_text, error_message, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ rows: data ?? [] });
}
