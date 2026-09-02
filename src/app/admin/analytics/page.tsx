import { AppShell } from '@/components/shell';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analytics — DeenByte Admin' };

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ngn = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function maskEmail(e: string) {
  const at = e.indexOf('@');
  if (at < 1) return e.slice(0, 6);
  return e.slice(0, 2) + '***' + e.slice(at);
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: p1 } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const { data: p2 } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (String(p1?.role ?? p2?.role ?? '').toLowerCase() !== 'admin') redirect('/dashboard');

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const sel = 'request_reference, status, selling_price, provider_cost, created_at, user_id, verification_services(name)';
  const { data: rows30 } = await supabaseAdmin
    .from('verification_requests').select(sel)
    .gte('created_at', since).order('created_at', { ascending: false }).limit(2000);
  const { data: rowsAll } = await supabaseAdmin
    .from('verification_requests').select('status, selling_price, provider_cost')
    .order('created_at', { ascending: false }).limit(5000);
  const { data: deps } = await supabaseAdmin
    .from('wallet_transactions').select('amount')
    .eq('type', 'deposit').gte('created_at', since).limit(1000);
  const { count: userCount } = await supabaseAdmin
    .from('profiles').select('*', { count: 'exact', head: true });

  const all = (rows30 ?? []) as any[];
  const ok = all.filter((r) => r.status === 'successful');
  const bad = all.filter((r) => r.status === 'failed');
  const revenue = ok.reduce((s, r) => s + Number(r.selling_price ?? 0), 0);
  const cost = ok.reduce((s, r) => s + Number(r.provider_cost ?? 0), 0);
  const margin = revenue - cost;
  const successRate = all.length ? Math.round((ok.length / all.length) * 100) : 0;
  const deposits = (deps ?? []).reduce((s: number, d: any) => s + Number(d.amount ?? 0), 0);

  const allOk = (rowsAll ?? []).filter((r: any) => r.status === 'successful');
  const allRevenue = allOk.reduce((s: number, r: any) => s + Number(r.selling_price ?? 0), 0);
  const allMargin = allOk.reduce((s: number, r: any) => s + (Number(r.selling_price ?? 0) - Number(r.provider_cost ?? 0)), 0);

  const days: { key: string; label: string; count: number; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push({ key: d.toISOString().slice(0, 10), label: d.toISOString().slice(8, 10), count: 0, revenue: 0 });
  }
  const dayMap = new Map(days.map((d) => [d.key, d]));
  for (const r of all) {
    const d = dayMap.get(String(r.created_at).slice(0, 10));
    if (!d) continue;
    d.count++;
    if (r.status === 'successful') d.revenue += Number(r.selling_price ?? 0);
  }
  const maxRev = Math.max(1, ...days.map((d) => d.revenue));

  const svcMap = new Map<string, { name: string; count: number; revenue: number; margin: number }>();
  for (const r of all) {
    const name = Array.isArray(r.verification_services) ? r.verification_services[0]?.name : r.verification_services?.name;
    const key = String(name ?? 'Unknown');
    const e = svcMap.get(key) ?? { name: key, count: 0, revenue: 0, margin: 0 };
    e.count++;
    if (r.status === 'successful') {
      e.revenue += Number(r.selling_price ?? 0);
      e.margin += Number(r.selling_price ?? 0) - Number(r.provider_cost ?? 0);
    }
    svcMap.set(key, e);
  }
  const services = [...svcMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const maxSvc = Math.max(1, ...services.map((s) => s.revenue));

  const custMap = new Map<string, number>();
  for (const r of ok) custMap.set(String(r.user_id), (custMap.get(String(r.user_id)) ?? 0) + Number(r.selling_price ?? 0));
  const topIds = [...custMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let top: { email: string; spend: number }[] = [];
  if (topIds.length) {
    const { data: urows } = await supabaseAdmin.from('users').select('id, email').in('id', topIds.map((t) => t[0]));
    top = topIds.map(([id, spend]) => ({
      email: maskEmail(String((urows ?? []).find((u: any) => u.id === id)?.email ?? id)),
      spend,
    }));
  }

  const kpis = [
    { l: 'Revenue (30d)', v: ngn(revenue) },
    { l: 'Profit (30d)', v: ngn(margin) },
    { l: 'Verifications (30d)', v: String(all.length) },
    { l: 'Success rate', v: successRate + '%' },
    { l: 'Deposits (30d)', v: ngn(deposits) },
    { l: 'Users', v: String(userCount ?? 0) },
    { l: 'Revenue (all-time)', v: ngn(allRevenue) },
    { l: 'Profit (all-time)', v: ngn(allMargin) },
    { l: 'Failed (30d)', v: String(bad.length) },
  ];

  const csv = ['reference,status,service,selling_price,provider_cost,created_at']
    .concat(all.map((r) => {
      const name = Array.isArray(r.verification_services) ? r.verification_services[0]?.name : r.verification_services?.name;
      return [r.request_reference, r.status, String(name ?? '').replace(/,/g, ' '), r.selling_price, r.provider_cost, r.created_at].join(',');
    })).join('\n');

  return (
    <AppShell title="Analytics">
      <div className="space-y-5">
        <section className="card3d p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-dark">Business report</h2>
              <p className="text-sm text-muted mt-1">Last 30 days performance at a glance.</p>
            </div>
            <a download="deenbyte-report-30d.csv"
              href={'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)}
              className="rounded-lg bg-primary/10 text-primary px-3 py-2 text-xs font-bold">
              Download CSV
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {kpis.map((k) => (
              <div key={k.l} className="rounded-xl border border-border bg-light p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{k.l}</p>
                <p className="text-sm font-bold text-dark mt-1">{k.v}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card3d p-5">
          <h3 className="text-sm font-bold text-dark">Revenue — last 14 days</h3>
          <div className="flex items-end gap-1 mt-4" style={{ height: 128 }}>
            {days.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full"
                title={d.key + ': ' + ngn(d.revenue) + ' • ' + d.count + ' verifications'}>
                <div className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-teal-400"
                  style={{ height: Math.round((d.revenue / maxRev) * 112) + (d.count ? 6 : 2) }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            {days.map((d) => (
              <span key={d.key} className="flex-1 text-center text-[9px] text-muted">{d.label}</span>
            ))}
          </div>
        </section>

        <section className="card3d p-5">
          <h3 className="text-sm font-bold text-dark">Top services (30d)</h3>
          <div className="mt-2">
            {services.map((s) => (
              <div key={s.name} className="py-2 border-b border-border last:border-0">
                <div className="flex justify-between text-xs font-semibold text-dark">
                  <span>{s.name}</span><span>{ngn(s.revenue)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-light">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    style={{ width: Math.round((s.revenue / maxSvc) * 100) + '%' }} />
                </div>
                <p className="mt-1 text-[10px] text-muted">{s.count} verifications • profit {ngn(s.margin)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-5">
          <section className="card3d p-5">
            <h3 className="text-sm font-bold text-dark">Top customers (30d)</h3>
            <div className="mt-2 space-y-2">
              {top.length === 0 && <p className="text-xs text-muted">No successful verifications yet.</p>}
              {top.map((t, i) => (
                <div key={t.email} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-dark">{i + 1}. {t.email}</span>
                  <span className="font-bold text-primary">{ngn(t.spend)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card3d p-5">
            <h3 className="text-sm font-bold text-dark">Recent activity</h3>
            <div className="mt-2 space-y-2">
              {all.slice(0, 8).map((r) => {
                const name = Array.isArray(r.verification_services) ? r.verification_services[0]?.name : r.verification_services?.name;
                return (
                  <div key={r.request_reference} className="flex items-center justify-between text-xs border-b border-border last:border-0 pb-2 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-dark truncate">{name ?? 'Verification'}</p>
                      <p className="text-[10px] text-muted">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <span className={'text-[10px] font-bold px-2 py-1 rounded-full ' + (r.status === 'successful' ? 'bg-green-50 text-green-700' : r.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                      {r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
