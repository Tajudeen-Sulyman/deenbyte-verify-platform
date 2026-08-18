import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { AijalonAsync, pollState, stripImages } from '@/lib/providers/aijalon-async';
import { TechHubAsync, thPollState } from '@/lib/providers/techhub-async';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AIJALON_STATUS: Record<string, (n: string) => Promise<any>> = {
  ipe_clearance: AijalonAsync.ipeStatus,
  personalization: AijalonAsync.personalizationStatus,
  nin_validation: AijalonAsync.validationStatus,
};

function clean(obj: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'string' && v.startsWith('data:image')) continue;
    out[k] = v;
  }
  return out;
}

export async function POST(req: Request, ctx: { params: Promise<{ service: string }> }) {
  const { service } = await ctx.params;
  if (!TechHubAsync.paths[service] && !AIJALON_STATUS[service]) {
    return NextResponse.json({ error: 'Unknown service.' }, { status: 404 });
  }

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

  try {
    let state: 'success' | 'pending' | 'failed';
    let json: any;

    if (provider === 'techhub') {
      const ticket = String(row.provider_reference ?? '');
      if (!ticket) return NextResponse.json({ error: 'Missing provider ticket for this request.' }, { status: 500 });
      json = await TechHubAsync.getStatus(TechHubAsync.paths[service], ticket);
      state = thPollState(json);
    } else {
      const fields = row.safe_request_data?.fields ?? {};
      const main = String(fields.nin ?? fields.tracking_id ?? row.safe_request_data?.identifier ?? '');
      json = await AIJALON_STATUS[service](main);
      state = pollState(json);
    }

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
