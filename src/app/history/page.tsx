import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'History — DeenByte Verify' };

const BADGE: Record<string, string> = {
  successful: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'successful', label: 'Successful' },
  { key: 'failed', label: 'Failed' },
  { key: 'processing', label: 'Processing' },
];

export default async function HistoryPage(props: { searchParams: Promise<Record<string, string>> }) {
  const sp = await props.searchParams;
  const filter = FILTERS.some((f) => f.key === sp.status) ? String(sp.status) : 'all';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let q = supabase
    .from('verification_requests')
    .select('id, status, created_at, selling_price, request_reference, safe_request_data, verification_services(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (filter !== 'all') q = q.eq('status', filter);
  const { data: rows } = await q;

  const list = (rows ?? []).map((r: any) => {
    const svc = Array.isArray(r.verification_services) ? r.verification_services[0] : r.verification_services;
    return { ...r, serviceName: svc?.name ?? 'Verification', identifier: r.safe_request_data?.identifier ?? '' };
  });

  return (
    <AppShell title="History">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">Verification history</h2>
          <p className="text-sm text-muted mt-1">Every request with its status and downloadable slip.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Link key={f.key} href={'/history?status=' + f.key}
              className={'shrink-0 rounded-full px-4 py-2 text-xs font-semibold border ' +
                (filter === f.key ? 'bg-primary text-white border-primary' : 'bg-white text-dark border-border')}>
              {f.label}
            </Link>
          ))}
        </div>

        {list.length === 0 && (
          <div className="card3d p-6 text-center">
            <p className="text-sm text-muted">No verifications here yet.</p>
            <p className="text-xs text-muted mt-1">Run your first verification and it will appear here with its slip.</p>
            <Link href="/verify" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white">Explore Services</Link>
          </div>
        )}

        <div className="space-y-3">
          {list.map((r: any) => (
            <div key={r.id} className="card3d p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{r.serviceName}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">{r.identifier} · {r.request_reference}</p>
                  <p className="text-xs text-muted mt-0.5">{new Date(r.created_at).toLocaleString()} · ₦{Number(r.selling_price).toLocaleString('en-NG')}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={'inline-block text-[10px] font-semibold px-2 py-1 rounded-full border ' + (BADGE[r.status] ?? 'bg-light text-muted border-border')}>
                    {r.status}
                  </span>
                  {r.status === 'successful' && (
                    <p className="mt-1">
                      <Link href={'/api/v1/slip/' + r.id} target="_blank" rel="noopener"
                        className="text-xs font-bold text-primary underline">Slip</Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
