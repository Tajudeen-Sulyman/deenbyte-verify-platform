import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: keys } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, key_prefix, enabled, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return NextResponse.json({ keys: keys ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const name = String(body.name ?? 'Default key').slice(0, 40) || 'Default key';
  const plain = 'db_live_' + crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(plain).digest('hex');
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({ user_id: user.id, name, key_hash: hash, key_prefix: plain.slice(0, 12) })
    .select('id, name, key_prefix, created_at').single();
  if (error) return NextResponse.json({ error: 'Could not create key.' }, { status: 400 });
  return NextResponse.json({ key: plain, ...data });
}
