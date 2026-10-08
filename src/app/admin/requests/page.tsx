import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { AppShell } from '@/components/shell';
import RefundButton from '@/components/refund-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Requests — Admin' };

const FILTERS = [
  { key: 'attention', label: 'Needs attention', statuses: ['failed', 'pending', 'processing'] },
  { key: 'failed', label: 'Failed', statuses: ['failed'] },
  { key: 'open', label: 'Pending', statuses: ['pending', 'processing'] },
];

export default async function AdminRequestsPage(props: { searchParams: Promise<Record<string, string>> }) {
  const sp = await props.searchParams;
  const f = FILTERS.find((x) => x.key === sp.f) ?? FILTERS[0];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) redirect('/dashboard');

  const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: rows } = await admin
    .from('verification_requests')
    .select('id, user_id, status, created_at, selling_price, request_reference, error_message, refunded_at, safe_request_data, verification_services(name)')
    .in('status', f.statuses)
    .order('created_at', { ascending: false })
    .limit(100);
  const list: any[] = rows ?? [];

  // ledger: which requests were charged / already refunded
  const charged = new Set<string>();
  const refunded = new Set<string>();
  if (list.length) {
    const { data: txs } = await admin
      .from('wallet_transactions').select('related_verification_id, type')
      .in('related_verification_id', list.map((r) => r.id))
      .in('type', ['verification_charge', 'reversal', 'refund']);
    for (const t of (txs ?? []) as any[]) {
      if (t.type === 'verification_charge') charged.add(t.related_verification_id);
      else refunded.add(t.related_verification_id);
    }
  }

  // user emails
  const emails: Record<string, string> = {};
  const ids = Array.from(new Set(list.map((r) => r.user_id as string))).slice(0, 60);
  await Promise.all(ids.map(async (id) => {
    const { data } = await admin.auth.admin.getUserById(id);
    emails[id] = data?.user?.email ?? id.slice(0, 8);
  }));

  return (
    <AppShell title="Requests">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">Requests</h2>
          <p className="text-sm text-muted mt-1">Refund a failed or stuck request. Charges and earlier refunds are checked against the wallet ledger.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((x) => (
            <Link key={x.key} href={'/admin/requests?f=' + x.key}
              className={'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ' + (f.key === x.key ? 'bg-primary text-white border-primary' : 'bg-white text-dark border-border')}>
              {x.label}
            </Link>
          ))}
        </div>
        {list.length === 0 && <div className="card3d p-4 text-sm text-muted">Nothing here.</div>}
        {list.map((r) => {
          const svc = Array.isArray(r.verification_services) ? r.verification_services[0] : r.verification_services;
          const done = r.refunded_at || refunded.has(r.id);
          const wasCharged = charged.has(r.id);
          return (
            <div key={r.id} className="card3d p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark">{svc?.name ?? 'Verification'} · {r.request_reference}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{emails[r.user_id]}</p>
                  <div className="mt-1">
                    <span className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold text-dark">
                      Provider: {r.provider ?? 'techhub'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.safe_request_data?.identifier ?? ''} · {new Date(r.created_at).toLocaleString()} · ₦{Number(r.selling_price).toLocaleString()}
                  </p>
                  {r.error_message && <p className="mt-1 text-xs text-red-600">{r.error_message}</p>}
                  {(r.status === 'pending' || r.status === 'processing') && (() => {
                    const h = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3600000);
                    return <p className={'mt-1 text-xs font-semibold ' + (h >= 24 ? 'text-red-600' : 'text-amber-700')}>{h >= 24 ? 'Stuck: ' : 'Open: '}{h}h since submitted</p>;
                  })()}
                </div>
                <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold">{r.status}</span>
              </div>
              {done ? (
                <p className="mt-3 text-xs font-semibold text-green-700">Refunded</p>
              ) : !wasCharged ? (
                <p className="mt-3 text-xs text-muted">Not charged, nothing to refund.</p>
              ) : (
                <RefundButton requestId={r.id} amount={Number(r.selling_price)} status={r.status} />
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
