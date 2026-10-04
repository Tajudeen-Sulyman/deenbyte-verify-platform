import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { submitBvnRetrievalRequest, syncBvnRequest } from '@/lib/services/bvn-retrieval';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  try {
    const out = await submitBvnRetrievalRequest(user.id, body);
    return NextResponse.json({ success: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Request failed.' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const reference = new URL(req.url).searchParams.get('reference');
  if (!reference) return NextResponse.json({ error: 'reference is required.' }, { status: 400 });

  const { data: row } = await admin
    .from('verification_requests').select('*')
    .eq('request_reference', reference).eq('user_id', user.id).single();
  if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  if (row.status === 'pending' && row.provider_reference) {
    try { return NextResponse.json({ reference, ...(await syncBvnRequest(row)) }); }
    catch { /* fall through to stored state */ }
  }
  const d = row.safe_response_data ?? {};
  return NextResponse.json({
    reference, status: row.status, bvn: d.retrieved_bvn ?? null, note: d.bvn_note ?? null,
    error: row.error_message ?? undefined,
  });
}
