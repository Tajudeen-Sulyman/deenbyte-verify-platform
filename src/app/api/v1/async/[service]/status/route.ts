import { ipeStatus } from '@/lib/providers/seamleshub-async';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { TechHubAsync, thPollState } from '@/lib/providers/techhub-async';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { data: row } = await supabaseAdmin
    .from('verification_requests')
    .select('*, verification_services(provider, service_id)')
    .eq('id', String(body.request_id ?? '')).eq('user_id', user.id).single();
  if (!row) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (row.status !== 'processing') {
    return NextResponse.json({ status: row.status, data: row.safe_response_data ?? null, reference: row.request_reference });
  }
  const provider = String(row.verification_services?.provider ?? 'techhub');
  const service = String(row.verification_services?.service_id ?? '');

  if ((provider === 'seamleshub' || (row.safe_response_data as any)?.accepted === true) && service === 'ipe_clearance') {
    const trk = String((row.safe_request_data as any)?.fields?.tracking_id ?? '');
    if (!trk) return NextResponse.json({ error: 'Missing tracking ID for this request.' }, { status: 500 });
    const st = await ipeStatus(trk);
    if (st.kind !== 'accepted') {
      await supabaseAdmin.from('verification_requests').update({
        safe_response_data: { ...((row.safe_response_data as any) ?? {}), last_check: { at: new Date().toISOString(), kind: st.kind, msg: String((st as any).message ?? '').replace(/\d{6,}/g, '***').slice(0, 120) } },
      }).eq('id', row.id);
      // unclear or rejected status call: never change the order from here
      return NextResponse.json({ status: 'processing', message: 'Still processing. Check again later.' });
    }
    const d: any = st.data ?? {};
    const raw = String(d.request_status ?? d.status ?? d.state ?? '').toLowerCase().trim();
    const shMsg = String(d.message ?? '');
    const msgOk = /\b(completed|successful|successfully|cleared)\b/i.test(shMsg) && !/\b(not|fail|failed|failure|reject|rejected|declined|error|unable|invalid)\b/i.test(shMsg);
    const done = !!d.nin && (/^(completed|complete|successful|success|done|cleared|approved)$/.test(raw) || msgOk);
    const bad = /^(failed|failure|rejected|declined|cancelled|canceled|refunded)$/.test(raw) || (!d.nin && /\b(failed|failure|rejected|declined|cancelled|canceled|refunded)\b/i.test(shMsg));
    const mask = (v: unknown) => { const x = String(v ?? ''); return x.length > 5 ? x.slice(0, 3) + '*****' + x.slice(-2) : x; };
    if (done) {
      await supabaseAdmin.from('verification_requests').update({
        status: 'successful',
        safe_response_data: { message: 'IPE clearance completed', nin: mask(d.nin), full_name: d.full_name ?? null, tracking_id: d.tracking_id ?? null, old_tracking_id: d.old_tracking_id ?? null },
        completed_at: new Date().toISOString(),
      }).eq('id', row.id).eq('status', 'processing');
      return NextResponse.json({ status: 'successful', reference: row.request_reference, data: { nin: mask(d.nin), full_name: d.full_name ?? null, tracking_id: d.tracking_id ?? null, old_tracking_id: d.old_tracking_id ?? null } });
    }
    if (bad) {
      const { error: refErr } = await supabaseAdmin.rpc('credit_wallet', {
        p_user_id: user.id, p_amount: Number(row.selling_price), p_type: 'reversal',
        p_reference: 'REV-' + row.request_reference,
        p_description: 'Reversal for failed IPE Clearance',
        p_verification_id: row.id,
      });
      if (refErr && refErr.code !== '23505') {
        return NextResponse.json({ error: 'Refund pending. Contact support with ref ' + row.request_reference }, { status: 500 });
      }
      await supabaseAdmin.from('verification_requests').update({
        status: 'failed', error_code: 'provider_failed',
        error_message: String(d.admin_note ?? d.message ?? 'IPE clearance failed.').slice(0, 300),
        completed_at: new Date().toISOString(),
      }).eq('id', row.id).eq('status', 'processing');
      return NextResponse.json({ status: 'failed', refunded: true, message: 'Request failed. Your wallet has been refunded.' });
    }
    // still processing, or an answer we do not recognise yet: record its shape, change nothing else
    await supabaseAdmin.from('verification_requests').update({
      safe_response_data: { ...((row.safe_response_data as any) ?? {}), last_check: { at: new Date().toISOString(), status: raw.slice(0, 40), keys: Object.keys(d).slice(0, 20), msg: String(d.message ?? '').replace(/\d{6,}/g, '***').slice(0, 120) } },
    }).eq('id', row.id);
    return NextResponse.json({ status: 'processing', message: 'Still processing. Check again later.' });
  }
  if (provider !== 'techhub') {
    return NextResponse.json({ error: 'Provider not configured for this service.' }, { status: 500 });
  }

  try {
    let state: 'success' | 'pending' | 'failed';
    let json: any;

    const ticket = String(row.provider_reference ?? '');
    if (!ticket) return NextResponse.json({ error: 'Missing provider ticket for this request.' }, { status: 500 });
    json = await TechHubAsync.getStatus(TechHubAsync.paths[service], ticket);
    state = thPollState(json);

    if (state === 'pending') {
      return NextResponse.json({ status: 'processing', message: json?.message ?? json?.note ?? 'Still processing. Check later.' });
    }

    if (state === 'success') {
      const safeData = clean({
        ...(json?.response && typeof json.response === 'object' ? json.response : {}),
        nin: json?.nin, bvn: json?.bvn,
        tracking_id: json?.tracking_id,
        new_tracking_id: json?.new_tracking_id,
        new_nin: json?.new_nin,
        note: json?.note ?? json?.response,
        ticket_id: json?.ticket_id,
      });
      await supabaseAdmin.from('verification_requests')
        .update({ status: 'successful', safe_response_data: safeData, completed_at: new Date().toISOString() })
        .eq('id', row.id);
      return NextResponse.json({ status: 'successful', data: safeData, reference: row.request_reference });
    }

    await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: user.id,
      p_amount: Number(row.selling_price),
      p_type: 'reversal',
      p_reference: 'REV-' + row.request_reference,
      p_description: 'Reversal for failed async request',
      p_verification_id: row.id,
    });
    await supabaseAdmin.from('verification_requests')
      .update({
        status: 'failed',
        error_code: 'provider_failed',
        error_message: json?.response ?? json?.message ?? 'Request failed at provider',
        completed_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    return NextResponse.json({ status: 'failed', refunded: true, message: json?.response ?? json?.message ?? 'Request failed. Wallet reversed.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status check failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
