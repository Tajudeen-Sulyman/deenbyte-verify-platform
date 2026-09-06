import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const path = req.nextUrl.searchParams.get('path') ?? '';
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });
  const { data: email } = await admin.auth.admin.listUsers();
  const me = email.users.find((u) => u.id === user.id);
  const isAdmin = me?.email === 'deenbyte.technologies@gmail.com';
  if (!isAdmin && !path.startsWith(user.id + '/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const signed = await admin.storage.from('cac-docs').createSignedUrl(path, 600);
  if (signed.error) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  return NextResponse.json({ url: signed.data.signedUrl });
}
