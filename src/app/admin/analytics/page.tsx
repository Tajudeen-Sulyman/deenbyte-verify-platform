import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { BrandLogo } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analytics — DeenByte Admin' };

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ngn = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 });

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: p1 } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const { data: p2 } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  const role = String(p1?.role ?? p2?.role ?? '').toLowerCase();
  if (role !== 'admin') redirect('/dashboard');

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from('verification_requests')
    .select('status, selling_price, provider_cost, created_at, verification_services(name)')
    .gte('created_at', since);

  const all = rows ?? [];
  const successful = all.filter((r: any) => r.status === 'successful');
  const failed = all.filter((r: any) => r.status === 'failed');
  const open = all.length - successful.length - failed.length;

  const revenue = successful.reduce((s: number, r: any) => s + Number(r.selling_price ?? 0), 0);
  const cost = successful.reduce((s: number, r: any) => s + Number(r.provider_cost ?? 0), 0);
  const margin = revenue - cost;
  const rate = successful.length + failed.length > 0
    ? Math.round((successful.length / (successful.length + failed.length)) * 100)
    : 0;

  const byService = new Map<string, { count: number; ok: number; revenue: number; cost: number }>();
  for (const r of all) {
    const svc = Array.isArray(r.verification_services) ? r.verification_services[0] : r.verification_services;
    const name = String(svc?.name ?? 'Other');
    const e = byService.get(name) ?? { count: 0, ok: 0, revenue: 0, cost: 0 };
    e.count += 1;
    if (r.status === 'successful') {
      e.ok += 1;
      e.revenue += Number(r.selling_price ?? 0);
      e.cost += Number(r.provider_cost ?? 0);
    }
    byService.set(name, e);
  }
  const serviceRows = [...byService.entries()].sort((a, b) => b[1].revenue - a[1].revenue);

  const days: { key: string; label: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const k = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ key: k, label: k.slice(8) + '/' + k.slice(5, 7), revenue: 0 });
  }
  for (const r of successful) {
    const k = String(r.created_at).slice(0, 10);
    const slot = days.find((d) => d.key === k);
    if (slot) slot.revenue += Number(r.selling_price ?? 0);
  }
  const maxDay = Math.max(...days.map((d) => d.revenue), 1);

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin"><BrandLogo /></Link>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-dark">Revenue Analytics</h1>
          <p className="text-sm text-muted">Last 30 days</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted">Revenue</p>
            <p className="text-lg font-bold text-primary">{ngn(revenue)}</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted">Margin</p>
            <p className="text-lg font-bold text-dark">{ngn(margin)}</p>
            <p className="text-xs text-muted">cost {ngn(cost)}</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted">Requests</p>
            <p className="text-lg font-bold text-dark">{all.length}</p>
            <p className="text-xs text-muted">{successful.length} ok · {failed.length} failed · {open} open</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted">Success rate</p>
            <p className="text-lg font-bold text-dark">{rate}%</p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-4">
          <p className="text-xs text-muted mb-3">Revenue — last 14 days</p>
          <div className="flex items-end gap-1 h-28">
            {days.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: Math.max((d.revenue / maxDay) * 96, d.revenue > 0 ? 6 : 2) + 'px', opacity: d.revenue > 0 ? 1 : 0.15 }}
                />
                <p className="text-[9px] text-muted">{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs text-muted">By service (30 days)</p>
          {serviceRows.map(([name, e]) => (
            <div key={name} className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-dark">{name}</p>
                <p className="text-xs text-muted">{e.count} requests · {e.ok} successful</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{ngn(e.revenue)}</p>
                <p className="text-xs text-muted">margin {ngn(e.revenue - e.cost)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
