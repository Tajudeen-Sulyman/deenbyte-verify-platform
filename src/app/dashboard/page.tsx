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

function tileCls(cat: string, isAsync: boolean) {
  if (isAsync) return 'from-amber-500 to-orange-600';
  if (cat === 'BVN') return 'from-emerald-500 to-emerald-600';
  return 'from-emerald-500 to-emerald-600';
}

function badgeCls(cat: string, isAsync: boolean) {
  if (isAsync) return 'bg-white/70 text-amber-700';
  if (cat === 'BVN') return 'bg-white/70 text-blue-700';
  return 'bg-white/70 text-primary';
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

  const hubs = [
    { href: '/verify?s=nin_regular', id: 'nin_regular', t: 'NIN Verification', d: 'Official NIMC slips with instant database lookup.', time: 'Instant', g: 'from-emerald-600 to-emerald-800' },
    { href: '/verify?s=nin_by_phone', id: 'nin_by_phone', t: 'NIN by Phone', d: 'Retrieve an NIN record using a phone number.', time: 'Instant', g: 'from-emerald-600 to-cyan-800' },
    { href: '/verify?s=nin_demographic', id: 'nin_demographic', t: 'Demographic Search', d: 'Search NIN records by demographics.', time: 'Instant', g: 'from-cyan-600 to-sky-800' },
    { href: '/verify?s=bvn_basic', id: 'bvn_basic', t: 'BVN Verification', d: 'Official BVN slip in seconds.', time: 'Instant', g: 'from-emerald-600 to-emerald-900' },
    { href: '/verify?s=bvn_retrieval', id: 'bvn_retrieval', t: 'BVN Retrieval', d: 'Get BVN from phone or NIN.', time: 'Instant', g: 'from-emerald-600 to-[var(--tile)]900' },
    { href: '/verify?s=ipe_clearance', id: 'ipe_clearance', t: 'IPE Clearance', d: 'Clear In-Processing errors on your NIN.' },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-2xl p-4 text-white vibe-gradient from-emerald-600 to-emerald-700 shadow-card">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-emerald-100">Welcome back · Wallet balance</p>
              <p className="text-xl font-bold text-white">
                ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/wallet" className="rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                Fund Wallet
              </Link>
              <Link href="/transactions" className="rounded-lg border border-white/40 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20">
                Transactions
              </Link>
            </div>
          </div>
        </section>

        

        <section>
          <h3 className="text-sm font-bold text-dark mb-2">Service Hub</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {hubs.map((h) => {
              const svc = h.id ? services.find((s: any) => s.service_id === h.id) : null;
              return (
                <Link key={h.t} href={h.href} className="relative card3d flex flex-col items-center justify-center text-center gap-1.5 hover:border-primary hover:-translate-y-0.5 p-2.5 pt-5 min-h-[112px]">
              {svc && (
                <span className={'absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold ' + badgeCls(String(svc.category), !!svc.is_async)}>
                  {svc.is_async ? 'ASYNC' : String(svc.category)}
                </span>
              )}
                  <span className={'h-10 w-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center ' + tileCls(svc ? String(svc.category) : '', !!svc?.is_async)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                      <path d={(h.id && ICONS[h.id]) ?? FALLBACK} />
                    </svg>
                  </span>
                  <p className="text-[11px] font-semibold text-dark leading-tight">{h.t}</p>
                  
                </Link>
              );
            })}
          </div>
        </section>


        <section className="card3d p-4">
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
