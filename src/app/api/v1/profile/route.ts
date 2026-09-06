import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ avatarUrl: null });
  const lst = await admin.storage.from('avatars').list(user.id, { limit: 1 });
  const avatarUrl = lst.data && lst.data.length > 0
    ? admin.storage.from('avatars').getPublicUrl(user.id + '/' + lst.data[0].name).data.publicUrl
    : null;
  return NextResponse.json({ avatarUrl });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const b = await req.json();
  if (!b.base64) return NextResponse.json({ error: 'No image.' }, { status: 400 });
  const ext = ['png', 'jpg', 'jpeg', 'webp'].includes(b.ext) ? b.ext : 'jpg';
  const path = user.id + '/avatar.' + ext;
  const up = await admin.storage.from('avatars').upload(path, Buffer.from(b.base64, 'base64'), { contentType: 'image/' + ext, upsert: true });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  return NextResponse.json({ avatarUrl: admin.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now() });
}
