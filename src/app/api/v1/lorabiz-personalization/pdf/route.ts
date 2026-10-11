import { NextResponse } from 'next/server';
import { createClient as serverClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const reference = new URL(req.url).searchParams.get('reference') ?? '';
  const { data: row } = await admin.from('verification_requests').select('safe_response_data')
    .eq('request_reference', reference).eq('user_id', user.id).maybeSingle();
  const path = row?.safe_response_data?.lb_pdf_path;
  if (!path) return NextResponse.json({ error: 'No slip available.' }, { status: 404 });

  const { data, error } = await admin.storage.from('personalization-slips').createSignedUrl(path, 300);
  if (error || !data) return NextResponse.json({ error: 'Could not open the slip.' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
