import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ loggedIn: false, balance: 0 });
  const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ loggedIn: true, balance: Number(data?.balance ?? 0) });
}
