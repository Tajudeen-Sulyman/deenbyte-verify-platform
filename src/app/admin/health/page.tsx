import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { BrandLogo } from '@/components/brand';

export const dynamic = 'force-dynamic';

export default async function AdminHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const threshold = Number(process.env.FLOAT_ALERT_THRESHOLD ?? 3000);

  let aijalon: { ok: boolean; balance?: number; error?: string } = { ok: false };
  try {
    const res = await fetch('https://aijalon.ng/api/v1/user/wallet', {
      headers: {
        Authorization: 'Bearer ' + process.env.AIJALON_API_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.status === true) {
      aijalon = { ok: true, balance: Number(json.balance) };
    } else {
      aijalon = { ok: false, error: json?.message ?? ('HTTP ' + res.status) };
    }
  } catch (e: any) {
    aijalon = { ok: false, error: e?.message ?? 'Provider unreachable' };
  }

  const low = aijalon.ok && (aijalon.balance ?? 0) < threshold;

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin"><BrandLogo /></Link>
          <Link href="/admin" className="text-sm font-semibold text-primary">← Admin</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-dark">Supplier Health</h1>
          <p className="text-sm text-muted">Live upstream float status — refresh by reloading this page.</p>
        </div>

        {low && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
            ⚠ LOW FLOAT — top up Aijalon now or verifications will start failing.
          </div>
        )}
        {!aijalon.ok && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
            Could not read Aijalon balance: {aijalon.error}. Check API key / provider status.
          </div>
        )}

        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-dark">Aijalon Float</h2>
              <p className="text-xs text-muted">Alert threshold: ₦{threshold.toLocaleString('en-NG')}</p>
            </div>
            {aijalon.ok && (
              <span className={
                'text-xs font-bold rounded-full px-3 py-1 border ' +
                (low
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-green-50 text-green-700 border-green-200')
              }>
                {low ? 'LOW' : 'HEALTHY'}
              </span>
            )}
          </div>
          {aijalon.ok ? (
            <p className="mt-3 text-3xl font-extrabold text-dark">
              ₦{(aijalon.balance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">Balance unavailable.</p>
          )}
          <p className="mt-3 text-xs text-muted">
            ≈ {aijalon.ok ? Math.floor((aijalon.balance ?? 0) / 150) : 0} NIN verifications remaining at ₦150 each.
            Top up at aijalon.ng when low.
          </p>
        </div>
      </div>
    </main>
  );
}
