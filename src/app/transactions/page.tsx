import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transactions — DeenByte Verify' };

const TYPE_STYLES: Record<string, string> = {
  credit: 'bg-green-50 text-green-700 border-green-200',
  reversal: 'bg-amber-50 text-amber-700 border-amber-200',
  refund: 'bg-amber-50 text-amber-700 border-amber-200',
  debit: 'bg-red-50 text-red-700 border-red-200',
};

const POSITIVE = ['credit', 'reversal', 'refund'];

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard"><BrandLogo /></Link>
          <LogoutButton />
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-dark">Transactions</h1>
          <p className="text-sm text-muted">Wallet activity — charges, top-ups and reversals</p>
        </div>
        {error && (
          <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">
            Transactions are unavailable right now.
          </div>
        )}
        {!error && (!rows || rows.length === 0) && (
          <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">No transactions yet.</div>
        )}
        <div className="space-y-3">
          {rows?.map((r: any) => {
            const positive = POSITIVE.includes(String(r.type));
            return (
              <div key={r.id} className="bg-white border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{r.description ?? r.type}</p>
                  <p className="text-xs text-muted mt-0.5">{r.reference ?? ''} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={'inline-block text-xs font-semibold px-2 py-1 rounded-full border ' + (TYPE_STYLES[String(r.type)] ?? 'bg-light text-muted border-border')}>
                    {r.type}
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
    </main>
  );
}
