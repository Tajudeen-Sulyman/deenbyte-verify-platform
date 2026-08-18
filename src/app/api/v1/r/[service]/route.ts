import { NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { runVerification, ReverifyRequiredError } from '@/lib/services/verification';
import { TechHubProvider } from '@/lib/providers/techhub';
import { AijalonProvider } from '@/lib/providers/aijalon';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Call = (v: any, s: any) => Promise<any>;

const SERVICES: Record<string, {
  serviceId: string;
  validate?: (v: string) => string | null;
  th?: Call; aj?: Call;
  defaultSlip: string;
}> = {
  nin_regular: {
    serviceId: 'nin_regular',
    validate: (v) => (/^\d{11}$/.test(v) ? null : 'NIN must be exactly 11 digits.'),
    th: (v, s) => TechHubProvider.verifyNIN(v, s),
    aj: (v, s) => AijalonProvider.verifyNIN(v, s),
    defaultSlip: 'premium',
  },
  nin_by_phone: {
    serviceId: 'nin_by_phone',
    validate: (v) => (/^0\d{10}$/.test(v) ? null : 'Phone must be 11 digits starting with 0.'),
    th: (v, s) => TechHubProvider.verifyNINByPhone(v, s),
    defaultSlip: 'premium',
  },
  bvn_basic: {
    serviceId: 'bvn_basic',
    validate: (v) => (/^\d{11}$/.test(v) ? null : 'BVN must be exactly 11 digits.'),
    th: (v, s) => TechHubProvider.verifyBVN(v, s),
    aj: (v, s) => AijalonProvider.verifyBVN(v, s),
    defaultSlip: 'premium',
  },
};

export async function POST(req: Request, ctx: { params: Promise<{ service: string }> }) {
  const { service } = await ctx.params;

  const auth = req.headers.get('authorization') ?? '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!key) return NextResponse.json({ error: 'Missing API key. Send Authorization: Bearer <key>.' }, { status: 401 });

  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const { data: keyRow } = await supabaseAdmin
    .from('api_keys').select('*').eq('key_hash', hash).single();
  if (!keyRow || !keyRow.enabled) return NextResponse.json({ error: 'Invalid or revoked API key.' }, { status: 401 });

  const config = SERVICES[service];
  if (!config) {
    return NextResponse.json({ error: 'Unknown service. Available: ' + Object.keys(SERVICES).join(', ') }, { status: 404 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const identifier = String(body.identifier ?? '').trim();
  const slipType = String(body.slip_type ?? config.defaultSlip);
  const validationError = config.validate ? config.validate(identifier) : null;
  if (validationError) return NextResponse.json({ error: validationError }, { status: 422 });

  const { data: svc } = await supabaseAdmin
    .from('verification_services').select('*')
    .eq('service_id', config.serviceId).single();
  if (!svc || !svc.enabled || svc.status !== 'active') {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }
  const provider = String(svc.provider ?? 'techhub');
  const call = (provider === 'aijalon' && config.aj) ? config.aj : (config.th ?? config.aj);
  if (!call) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id).then(() => {});

  try {
    const outcome = await runVerification({
      userId: keyRow.user_id,
      serviceId: config.serviceId,
      identifier,
      slipType,
      confirmReverify: Boolean(body.confirm_reverify),
      callProvider: call,
    });
    const origin = new URL(req.url).origin;
    if (outcome?.requestId) {
      supabaseAdmin.from('verification_requests').update({ api_key_id: keyRow.id }).eq('id', outcome.requestId).then(() => {});
    }
    return NextResponse.json({
      success: true,
      reference: outcome.requestReference ?? null,
      status: 'successful',
      data: outcome.data ?? null,
      slip_url: outcome.requestId ? origin + '/api/v1/slip/' + outcome.requestId : null,
    });
  } catch (err) {
    if (err instanceof ReverifyRequiredError) {
      return NextResponse.json({
        error: err.message, code: 'reverify_required',
        previous_reference: err.previousReference,
      }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Verification failed.';
    const insufficient = /insufficient/i.test(message);
    return NextResponse.json({
      error: message,
      code: insufficient ? 'insufficient_balance' : 'verification_failed',
    }, { status: insufficient ? 402 : 400 });
  }
}
