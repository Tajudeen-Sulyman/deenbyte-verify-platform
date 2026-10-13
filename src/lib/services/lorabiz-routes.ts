import { NextResponse } from 'next/server';
import { createClient as serverClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { submitLbRequest, syncLbRequest, type LbCfg } from '@/lib/services/lorabiz-async';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function handleSubmit(cfg: LbCfg, req: Request) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  try {
    const out = await submitLbRequest(cfg, user.id, body);
    return NextResponse.json({ success: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Request failed.' }, { status: 400 });
  }
}

export async function handleStatus(cfg: LbCfg, req: Request) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const reference = new URL(req.url).searchParams.get('reference');
  if (!reference) return NextResponse.json({ error: 'reference is required.' }, { status: 400 });

  const { data: svc } = await admin.from('verification_services').select('id')
    .eq('service_id', cfg.serviceId).maybeSingle();
  if (!svc) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const { data: row } = await admin.from('verification_requests').select('*')
    .eq('request_reference', reference).eq('user_id', user.id).eq('service_id', svc.id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  if (row.status === 'pending') {
    try { await syncLbRequest(cfg, row); } catch { /* stored state is kept; the next check retries */ }
  }
  const { data: fresh } = await admin.from('verification_requests').select('*').eq('id', row.id).single();
  const d: any = fresh?.safe_response_data ?? {};
  return NextResponse.json({
    reference,
    status: fresh?.status ?? row.status,
    lb_status: d.lb_status ?? null,
    new_tracking_id: d.lb_new_tracking_id ?? null,
    pdf_ready: !!d.lb_pdf_path,
    error: fresh?.error_message ?? undefined,
  });
}
