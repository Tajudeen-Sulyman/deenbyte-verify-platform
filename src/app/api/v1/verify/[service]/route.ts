import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { runVerification, ReverifyRequiredError } from '@/lib/services/verification';
import { FastVerifyProvider } from '@/lib/providers/fastverify';
import { HKVerifyProvider } from '@/lib/providers/hkverify';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Call = (v: string, s: string) => Promise<any>;

const SERVICES: Record<string, {
  serviceId: string;
  validate: (v: string) => string | null;
  fv: Call;
  hk: Call;
  defaultSlip: string;
}> = {
  nin_verify: {
    serviceId: 'nin_verify',
    validate: (v) => (/^\d{11}$/.test(v) ? null : 'NIN must be exactly 11 digits.'),
    fv: (v, s) => FastVerifyProvider.verifyNIN(v, s),
    hk: (v, s) => HKVerifyProvider.verifyNIN(v, s),
    defaultSlip: 'premium',
  },
  nin_regular: {
    serviceId: 'nin_regular',
    validate: (v) => (/^\d{11}$/.test(v) ? null : 'NIN must be exactly 11 digits.'),
    fv: (v, s) => FastVerifyProvider.verifyNIN(v, s),
    hk: (v, s) => HKVerifyProvider.verifyNIN(v, s),
    defaultSlip: 'standard',
  },
  bvn_basic: {
    serviceId: 'bvn_basic',
    validate: (v) => (/^\d{11}$/.test(v) ? null : 'BVN must be exactly 11 digits.'),
    fv: (v, s) => FastVerifyProvider.verifyBVN(v, s),
    hk: (v, s) => HKVerifyProvider.verifyBVN(v, s),
    defaultSlip: 'basic',
  },
};

export async function POST(req: Request, ctx: { params: Promise<{ service: string }> }) {
  const { service } = await ctx.params;
  const config = SERVICES[service];
  if (!config) return NextResponse.json({ error: 'Unknown service.' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const identifier = String(body.identifier ?? '').trim();
  const slipType = String(body.slip_type ?? config.defaultSlip);
  const confirmReverify = Boolean(body.confirm_reverify);

  const validationError = config.validate(identifier);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 422 });

  // Provider switch lives in the database — no redeploy needed to flip
  const { data: svcRow } = await supabaseAdmin
    .from('verification_services')
    .select('provider')
    .eq('service_id', config.serviceId)
    .single();

  const call = svcRow?.provider === 'hkverify' ? config.hk : config.fv;

  try {
    const outcome = await runVerification({
      userId: user.id,
      serviceId: config.serviceId,
      identifier,
      slipType,
      confirmReverify,
      callProvider: call,
    });
    return NextResponse.json({ success: true, ...outcome });
  } catch (err) {
    if (err instanceof ReverifyRequiredError) {
      return NextResponse.json({
        error: err.message,
        code: 'reverify_required',
        previous_reference: err.previousReference,
        previous_at: err.previousAt,
      }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Verification failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
