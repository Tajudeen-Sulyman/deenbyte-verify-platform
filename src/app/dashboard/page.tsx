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

const ICONS: Record<string, string> = {
  nin_regular: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z',
  nin_by_phone: 'M7 3h10v18H7zM11 18h2',
  nin_demographic: 'M8 10a3 3 0 106 0 3 3 0 00-6 0zM4 20c0-3 3-5 8-5s8 2 8 5',
  bvn_basic: 'M3 6h18v12H3zM7 10h4M7 14h7',
  bvn_retrieval: 'M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5M18 3v4h-4M6 21v-4h4',
  ipe_clearance: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7',
  personalization: 'M8 10a3 3 0 106 0 3 3 0 00-6 0zM4 20c0-3 3-5 8-5h2M17 14l2 2 4-4',
  nin_validation: 'M9 3h6v3H9zM9 3H7v18h10V3h-2M9 12l2 2 4-4',
};
const FALLBACK = 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z';

function badgeCls(cat: string, isAsync: boolean) {
  if (isAsync) return 'bg-amber-50 text-amber-700';
  if (cat === 'BVN') return 'bg-blue-50 text-blue-700';
  return 'bg-primary/10 text-primary';
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [walletRes, servicesRes, recentRes] = await Promise.all([
    supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
    supabase.from('verification_services')
      .select('service_id, name, category, selling_price, is_async')
      .eq('enabled', true).eq('status', 'active')
      .order('category').order('name'),
    supabase.from('verification_requests')
      .select('id, status, created_at, verification_services(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const balance = Number(walletRes.data?.balance ?? 0);
  const services = servicesRes.data ?? [];
  const rows = (recentRes.data ?? []).map((r: any) => {
    const svc = Array.isArray(r.verification_services) ? r.verification_services[0] : r.verification_services;
    return { ...r, serviceName: svc?.name ?? 'Verification' };
  });

  return (
    <AppShell title="Dashboard">
      <div className="space-y-5">
        <section className="card3d p-5">
          <h2 className="text-lg font-bold text-dark">Welcome back 👋</h2>
          <p className="text-sm text-muted mt-1">Manage verifications, wallet and transactions from one place.</p>
        </section>

        <section className="card3d p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Wallet Balance</p>
              <p className="text-2xl font-bold text-dark">
                ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/wallet" className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-dark">
                Fund Wallet
              </Link>
              <Link href="/transactions" className="rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-semibold text-dark">
                Transactions
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-dark">All services</h3>
            <Link href="/services" className="text-xs font-semibold text-primary">View all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {services.map((s: any) => (
              <Link key={s.service_id} href={'/verify?s=' + s.service_id}
                className="relative card3d p-4 pt-6 flex flex-col items-center text-center gap-2 hover:border-primary hover:-translate-y-0.5">
                <span className={'absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full ' + badgeCls(String(s.category), !!s.is_async)}>
                  {s.is_async ? 'ASYNC' : String(s.category)}
                </span>
                <span className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                    <path d={ICONS[s.service_id] ?? FALLBACK} />
                  </svg>
                </span>
                <p className="text-sm font-semibold text-dark leading-tight">{s.name}</p>
                <p className="text-xs font-bold text-primary">₦{Number(s.selling_price).toLocaleString('en-NG')}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="card3d p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-dark">Recent activity</h3>
            <Link href="/history" className="text-xs font-semibold text-primary">View all</Link>
          </div>
          {rows.length === 0 ? (
            <div className="mt-4 text-center py-6">
              <p className="text-sm text-muted">No verifications yet.</p>
              <p className="text-xs text-muted mt-1">Run your first verification to see it here.</p>
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
