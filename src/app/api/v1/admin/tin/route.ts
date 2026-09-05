import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p1 } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const { data: p2 } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (String(p1?.role ?? p2?.role ?? '').toLowerCase() !== 'admin') return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const { data } = await admin.from('tin_requests').select('*').order('created_at', { ascending: false }).limit(200);
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const b = await req.json();
  const reference = String(b.reference ?? '');
  const action = String(b.action ?? '');
  if (action === 'completed') {
    const tin = String(b.issued_tin ?? '').replace(/\D/g, '');
    if (tin.length !== 13) return NextResponse.json({ error: 'Issued TIN must be 13 digits.' }, { status: 400 });
    await admin.from('tin_requests').update({ status: 'completed', issued_tin: tin }).eq('reference', reference);
    return NextResponse.json({ status: 'completed', issued_tin: tin });
  }
  if (action === 'processing' || action === 'failed' || action === 'pending') {
    await admin.from('tin_requests').update({ status: action }).eq('reference', reference);
    return NextResponse.json({ status: action });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
