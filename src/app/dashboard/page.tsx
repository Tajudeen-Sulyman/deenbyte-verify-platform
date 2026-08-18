import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — DeenByte Verify' };

const BADGE: Record<string, string> = {
  successful: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: recent } = await supabase
    .from('verification_requests')
    .select('id, status, created_at, verification_services(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const rows = (recent ?? []).map((r: any) => {
    const svc = Array.isArray(r.verification_services) ? r.verification_services[0] : r.verification_services;
    return { ...r, serviceName: svc?.name ?? 'Verification' };
  });

  return (
    <AppShell title="Dashboard">
      <div className="space-y-5">
        <section className="rounded-2xl bg-white border border-border shadow-card p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-dark">Welcome back 👋</h2>
            <p className="text-sm text-muted mt-1">Manage verifications, wallet and transactions from one place.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/wallet" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
              Fund Wallet
            </Link>
            <Link href="/verify" className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-dark">
              New Verification
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link href="/verify" className="rounded-2xl bg-white border border-border shadow-card p-4 hover:border-primary">
            <p className="text-sm font-semibold text-dark">Verify NIN / BVN</p>
            <p className="text-xs text-muted mt-1">Instant official slips</p>
          </Link>
          <Link href="/history" className="rounded-2xl bg-white border border-border shadow-card p-4 hover:border-primary">
            <p className="text-sm font-semibold text-dark">History</p>
            <p className="text-xs text-muted mt-1">Slips &amp; statuses</p>
          </Link>
          <Link href="/transactions" className="rounded-2xl bg-white border border-border shadow-card p-4 hover:border-primary">
            <p className="text-sm font-semibold text-dark">Transactions</p>
            <p className="text-xs text-muted mt-1">Wallet activity</p>
          </Link>
          <Link href="/wallet" className="rounded-2xl bg-white border border-border shadow-card p-4 hover:border-primary">
            <p className="text-sm font-semibold text-dark">Wallet</p>
            <p className="text-xs text-muted mt-1">Fund &amp; manage</p>
          </Link>
        </section>

        <section className="rounded-2xl bg-white border border-border shadow-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-dark">Recent activity</h3>
            <Link href="/history" className="text-xs font-semibold text-primary">View all</Link>
          </div>
          {rows.length === 0 ? (
            <div className="mt-4 text-center py-6">
              <p className="text-sm text-muted">No verifications yet.</p>
              <p className="text-xs text-muted mt-1">Run your first verification to see it here.</p>
              <Link href="/verify" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white">
                Explore Services
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {rows.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">{r.serviceName}</p>
                    <p className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <span className={'text-xs font-semibold px-2 py-1 rounded-full border ' + (BADGE[r.status] ?? 'bg-light text-muted border-border')}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
