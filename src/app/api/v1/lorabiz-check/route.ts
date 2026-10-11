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
  const url = 'https://lorabiz.com/api/v1/nin/ipe/status?client_reference=probe_' + Date.now();

  const probe = async (headers: Record<string, string>) => {
    try {
      const response = await fetch(url, { headers, cache: 'no-store' });
      return response.status;
    } catch {
      return 'network error';
    }
  };

  const auth_results = key
    ? {
        bearer: await probe({ Authorization: 'Bearer ' + key }),
        direct: await probe({ Authorization: key }),
        x_api_key: await probe({ 'x-api-key': key }),
      }
    : 'no key';

  return NextResponse.json({
    vercel_env: process.env.VERCEL_ENV ?? 'unknown',
    key_present: raw.length > 0,
    key_length: raw.length,
    key_has_stray_space: raw !== key,
    lorabiz_auth_results: auth_results,
  });
}
