import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const supabaseAdmin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const reference = String(body.reference ?? '');
  if (!reference) return NextResponse.json({ error: 'Reference required.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { data: row } = await supabaseAdmin.from('verification_requests').select('slip_base64, safe_response_data').eq('reference', reference).eq('user_id', user.id).single();
  if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ pdf_base64: row.slip_base64 ?? null, data: row.safe_response_data ?? null });
}
