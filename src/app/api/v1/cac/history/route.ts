import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const { data } = await supabase.from('cac_applications')
    .select('reference, entity_type, status, fee, payload, completed_docs, admin_note, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ rows: data ?? [] });
}
