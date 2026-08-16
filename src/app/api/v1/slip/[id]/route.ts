import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url), 302);

  const { data: row, error } = await supabase
    .from('verification_requests')
    .select('slip_base64, request_reference')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !row?.slip_base64) {
    return NextResponse.json({ error: 'Slip not found.' }, { status: 404 });
  }

  const pdf = Buffer.from(row.slip_base64, 'base64');
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="' + row.request_reference + '.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
