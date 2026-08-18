import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { runVerification, ReverifyRequiredError } from '@/lib/services/verification';
import { FastVerifyProvider } from '@/lib/providers/fastverify';
import { HKVerifyProvider } from '@/lib/providers/hkverify';
import { AijalonProvider } from '@/lib/providers/aijalon';
import { TechHubProvider } from '@/lib/providers/techhub';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Call = (v: any, s: any) => Promise<any>;

const SERVICES: Record<string, {
  serviceId: string;
  validate?: (v: string) => string | null;
  fv?: Call; hk?: Call; aj?: Call; th?: Call;
  defaultSlip: string;
  isDemographic?: boolean;
}> = {
  nin_verify: {
    serviceId: 'nin_verify',
    validate: (v: string) => (/^\d{11}$/.test(v) ? null : 'NIN must be exactly 11 digits.'),
    fv: (v: any, s: any) => FastVerifyProvider.verifyNIN(v, s),
    aj: (v: any, s: any) => AijalonProvider.verifyNIN(v, s),
    th: (v: any, s: any) => TechHubProvider.verifyNIN(v, s),
    defaultSlip: 'premium',
  },
  nin_regular: {
    serviceId: 'nin_regular',
    validate: (v: string) => (/^\d{11}$/.test(v) ? null : 'NIN must be exactly 11 digits.'),
    aj: (v: any, s: any) => AijalonProvider.verifyNIN(v, s),
    th: (v: any, s: any) => TechHubProvider.verifyNIN(v, s),
    defaultSlip: 'standard',
  },
  bvn_basic: {
    serviceId: 'bvn_basic',
    validate: (v: string) => (/^\d{11}$/.test(v) ? null : 'BVN must be exactly 11 digits.'),
    aj: (v: any, s: any) => AijalonProvider.verifyBVN(v, s),
    th: (v: any, s: any) => TechHubProvider.verifyBVN(v, s),
    defaultSlip: 'premium',
  },
  nin_by_phone: {
    serviceId: 'nin_by_phone',
    validate: (v: string) => (/^(0\d{10}|\d{11})$/.test(v) ? null : 'Phone must be 11 digits.'),
    aj: (v: any, s: any) => AijalonProvider.verifyNINByPhone(v, s),
    th: (v: any, s: any) => TechHubProvider.verifyNINByPhone(v, s),
    defaultSlip: 'premium',
  },
  nin_demographic: {
    serviceId: 'nin_demographic',
    aj: (i: any, s: any) => AijalonProvider.demographicSearch(i, s),
    th: (i: any, s: any) => TechHubProvider.demographicSearch(i, s),
    defaultSlip: 'premium',
    isDemographic: true,
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
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const slipType = String(body.slip_type ?? config.defaultSlip);
  const confirmReverify = Boolean(body.confirm_reverify);

  const { data: svcRow } = await supabaseAdmin
    .from('verification_services').select('provider')
    .eq('service_id', config.serviceId).single();
  const provider = String(svcRow?.provider ?? 'fastverify');

  let identifier: string;
  let call: Call;

  if (config.isDemographic) {
    const input = body.identifier ?? {};
    if (!input.firstname || !input.lastname || !input.gender || !input.dob) {
      return NextResponse.json({ error: 'Please fill all required fields.' }, { status: 422 });
    }
    identifier = `${input.firstname}|${input.lastname}|${input.gender}|${input.dob}`;
    call = (provider === 'techhub' ? config.th : config.aj) as Call;
    const demoCall = call;
    call = (_id: any, slip: any) => demoCall(input, slip);
  } else {
    identifier = String(body.identifier ?? '').trim();
    const validationError = config.validate ? config.validate(identifier) : null;
    if (validationError) return NextResponse.json({ error: validationError }, { status: 422 });

    if (provider === 'techhub' && config.th) call = config.th;
    else if (provider === 'aijalon' && config.aj) call = config.aj;
    else if (provider === 'hkverify' && config.hk) call = config.hk;
    else if (provider === 'fastverify' && config.fv) call = config.fv;
    else call = (config.th ?? config.aj ?? config.hk ?? config.fv) as Call;
  }

  try {
    const outcome = await runVerification({
      userId: user.id,
      serviceId: config.serviceId,
      identifier, slipType, confirmReverify,
      callProvider: call,
    });
    return NextResponse.json({ success: true, ...outcome });
  } catch (err) {
    if (err instanceof ReverifyRequiredError) {
      return NextResponse.json({
        error: err.message, code: 'reverify_required',
        previous_reference: err.previousReference, previous_at: err.previousAt,
      }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Verification failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
