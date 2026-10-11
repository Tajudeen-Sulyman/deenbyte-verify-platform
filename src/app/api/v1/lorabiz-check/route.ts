import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });

  const raw = process.env.LORABIZ_API_KEY ?? '';
  const key = raw.trim();
  const probe = key
    ? await fetch('https://api.lorabiz.com/api/v1/nin/ipe/status?client_reference=probe_' + Date.now(), {
        headers: { Authorization: 'Bearer ' + key },
        cache: 'no-store',
      }).then((r) => r.status).catch(() => 'network error')
    : 'no key';

  return NextResponse.json({
    vercel_env: process.env.VERCEL_ENV ?? 'unknown',
    key_present: raw.length > 0,
    key_length: raw.length,
    key_has_stray_space: raw !== key,
    lorabiz_probe_http: probe,
  });
}
