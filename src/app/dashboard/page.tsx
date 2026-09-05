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
  if (isAsync) return 'bg-white/70 text-amber-700';
  if (cat === 'BVN') return 'bg-white/70 text-blue-700';
  return 'bg-white/70 text-primary';
}

function tileCls(cat: string, isAsync: boolean) {
  if (isAsync) return 'from-amber-500 to-orange-600';
  if (cat === 'BVN') return 'from-violet-500 to-purple-600';
  return 'from-emerald-500 to-teal-600';
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
    { href: '/verify?s=nin_regular', t: 'NIN Verification', d: 'Official NIMC slips with instant database lookup.', time: 'Instant', g: 'from-emerald-600 to-teal-800' },
    { href: '/verify?s=nin_by_phone', t: 'NIN by Phone', d: 'Retrieve an NIN record using a phone number.', time: 'Instant', g: 'from-teal-600 to-cyan-800' },
    { href: '/verify?s=nin_demographic', t: 'Demographic Search', d: 'Search NIN records by demographics.', time: 'Instant', g: 'from-cyan-600 to-sky-800' },
    { href: '/nin/validation', t: 'NIN Validation', d: 'Resolve No-Record, VNIN sync & modification issues.', time: '24–48 hrs', g: 'from-sky-700 to-blue-900' },
    { href: '/nin/modification', t: 'NIN Modification', d: 'Change of Name, Phone, or Address. ₦5,800.', time: '1–48 hrs', g: 'from-teal-700 to-cyan-900' },
    { href: '/verify?s=bvn_basic', t: 'BVN Verification', d: 'Official BVN slip in seconds.', time: 'Instant', g: 'from-violet-600 to-purple-900' },
    { href: '/verify?s=bvn_retrieval', t: 'BVN Retrieval', d: 'Get BVN from phone or NIN.', time: 'Instant', g: 'from-fuchsia-600 to-pink-900' },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="space-y-5">
        <section className="card3d p-5">
          <h2 className="text-lg font-bold text-dark">Welcome back 👋</h2>
          <p className="text-sm text-muted mt-1">Manage verifications, wallet and transactions from one place.</p>
        </section>

        <section className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-emerald-600 to-teal-700 shadow-card">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-emerald-100">Wallet Balance</p>
              <p className="text-2xl font-bold text-white">
                ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/wallet" className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                Fund Wallet
              </Link>
              <Link href="/transactions" className="rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20">
                Transactions
              </Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">New — no account needed</p>
          <h3 className="mt-1 text-lg font-extrabold">TIN Verification Slip</h3>
          <p className="mt-1 text-xs text-emerald-100">Pay once, get your slip in under 90 seconds. From ₦50.</p>
          <Link href="/taxid" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-extrabold text-white">Get yours →</Link>
        </section>

        <section>
          <h3 className="text-sm font-bold text-dark mb-2">Service Hub</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {hubs.map((h) => (
              <Link key={h.t} href={h.href} className={'relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br shadow-card ' + h.g}>
                <p className="text-sm font-extrabold">{h.t}</p>
                <p className="mt-1 text-[11px] text-white/80">{h.d}</p>
                <span className="mt-3 inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">🕐 {h.time}</span>
                <span className="ml-2 inline-block rounded-full bg-green-400/20 text-green-200 px-2.5 py-1 text-[10px] font-bold">● ACTIVE</span>
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
