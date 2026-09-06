import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ rows: [], unread: 0 });
  const { data } = await supabase.from('notifications').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
  const rows = data ?? [];
  return NextResponse.json({ rows, unread: rows.filter((r: any) => !r.read).length });
}
