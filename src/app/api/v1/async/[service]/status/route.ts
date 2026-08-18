import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { AijalonAsync, pollState, stripImages } from '@/lib/providers/aijalon-async';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATUS_CALLS: Record<string, (n: string) => Promise<any>> = {
  ipe_clearance: AijalonAsync.ipeStatus,
  personalization: AijalonAsync.personalizationStatus,
  nin_validation: AijalonAsync.validationStatus,
};

export async function POST(req: Request, ctx: { params: Promise<{ service: string }> }) {
  const { service } = await ctx.params;
  const statusCall = STATUS_CALLS[service];
  if (!statusCall) return NextResponse.json({ error: 'Unknown service.' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const requestId = String(body.request_id ?? '');

  const { data: row } = await supabaseAdmin
    .from('verification_requests').select('*')
    .eq('id', requestId).eq('user_id', user.id).single();
  if (!row) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (row.status !== 'processing') {
    return NextResponse.json({ status: row.status, data: row.safe_response_data ?? null, reference: row.request_reference });
  }

  const identifier = String(row.safe_request_data?.identifier ?? '');
  if (!identifier) return NextResponse.json({ error: 'Stored request is missing its identifier.' }, { status: 500 });

  try {
    const json = await statusCall(identifier);
    const state = pollState(json);

    if (state === 'pending') {
      return NextResponse.json({ status: 'processing', message: json?.message ?? 'Still processing. Check later.' });
    }

    if (state === 'success') {
      const raw = json?.data ?? {};
      const safeData = stripImages({ ...raw, nin: raw.nin ?? json.nin, tracking_id: raw.trackingId ?? json.tracking_id });
      await supabaseAdmin.from('verification_requests')
        .update({
          status: 'successful',
          provider_reference: json?.reportID ?? row.provider_reference,
          safe_response_data: safeData,
          completed_at: new Date().toISOString(),
        })
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
        error_message: json?.message ?? 'Request failed at provider',
        completed_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    return NextResponse.json({ status: 'failed', refunded: true, message: json?.message ?? 'Request failed. Wallet reversed.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status check failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
