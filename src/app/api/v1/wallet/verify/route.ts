import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { settlePayment } from '@/lib/services/wallet';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const reference = String(body.reference ?? '').trim();
  if (!reference) return NextResponse.json({ error: 'Missing reference.' }, { status: 400 });

  const result = await settlePayment(reference);
  return NextResponse.json(result);
}
