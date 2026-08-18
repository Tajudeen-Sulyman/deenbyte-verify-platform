import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transactions — DeenByte Verify' };

const TYPE_STYLES: Record<string, string> = {
  credit: 'bg-green-50 text-green-700 border-green-200',
  topup: 'bg-green-50 text-green-700 border-green-200',
  wallet_topup: 'bg-green-50 text-green-700 border-green-200',
  reversal: 'bg-amber-50 text-amber-700 border-amber-200',
  refund: 'bg-amber-50 text-amber-700 border-amber-200',
  verification_charge: 'bg-red-50 text-red-700 border-red-200',
  debit: 'bg-red-50 text-red-700 border-red-200',
};

const POSITIVE = ['credit', 'reversal', 'refund', 'topup', 'wallet_topup'];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'charges', label: 'Charges' },
  { key: 'topups', label: 'Top-ups' },
  { key: 'reversals', label: 'Reversals' },
];

function inFilter(type: string, f: string) {
  if (f === 'all') return true;
  if (f === 'charges') return ['verification_charge', 'debit'].includes(type);
  if (f === 'topups') return ['credit', 'topup', 'wallet_topup'].includes(type);
  if (f === 'reversals') return ['reversal', 'refund'].includes(type);
  return true;
}

export default async function TransactionsPage(props: { searchParams: Promise<Record<string, string>> }) {
  const sp = await props.searchParams;
  const filter = FILTERS.some((f) => f.key === sp.status) ? String(sp.status) : 'all';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('wallet_transactions').select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  const list = (rows ?? []).filter((r: any) => inFilter(String(r.type), filter));

  return (
    <AppShell title="Transactions">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">Transactions</h2>
          <p className="text-sm text-muted mt-1">Every wallet movement — charges, top-ups and reversals.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Link key={f.key} href={'/transactions?status=' + f.key}
              className={'shrink-0 rounded-full px-4 py-2 text-xs font-semibold border ' +
                (filter === f.key ? 'bg-primary text-white border-primary' : 'bg-white text-dark border-border')}>
              {f.label}
            </Link>
          ))}
        </div>

        {error && (
          <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">Transactions are unavailable right now.</div>
        )}
        {!error && list.length === 0 && (
          <div className="bg-white border border-border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted">No transactions here yet.</p>
            <p className="text-xs text-muted mt-1">Your wallet activity will appear once you fund or verify.</p>
            <Link href="/wallet" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white">Fund Wallet</Link>
          </div>
        )}

        <div className="space-y-3">
          {list.map((r: any) => {
            const positive = POSITIVE.includes(String(r.type));
            return (
              <div key={r.id} className="bg-white border border-border rounded-2xl p-4 shadow-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{r.description ?? r.type}</p>
                  <p className="text-xs text-muted mt-0.5">{r.reference ?? ''} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={'inline-block text-[10px] font-semibold px-2 py-1 rounded-full border ' + (TYPE_STYLES[String(r.type)] ?? 'bg-light text-muted border-border')}>
                    {String(r.type).replace('_', ' ')}
                  </span>
                  <p className={'text-sm font-bold mt-1 ' + (positive ? 'text-green-700' : 'text-red-700')}>
                    {positive ? '+' : '−'}₦{Number(r.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
