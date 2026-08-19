import { AppShell } from '@/components/shell';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FundForm } from '@/components/fund-form';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('user_id', user.id).single();
  const { data: txns } = await supabase
    .from('wallet_transactions')
    .select('reference, type, amount, status, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const balance = Number(wallet?.balance ?? 0);

  return (
    <AppShell title="Wallet">

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="card3d p-5">
          <p className="text-sm text-muted">Wallet Balance</p>
          <p className="text-3xl font-bold text-dark mt-1">
            ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card3d p-5">
          <h2 className="font-semibold text-dark">Fund Wallet</h2>
          <p className="text-sm text-muted mt-1">Payments are processed securely by Paystack.</p>
          <FundForm />
        </div>

        <div className="card3d p-5">
          <h2 className="font-semibold text-dark">Recent Transactions</h2>
          {!txns || txns.length === 0 ? (
            <p className="text-sm text-muted mt-3">No transactions yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {txns.map((t) => (
                <div key={t.reference} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{t.description ?? t.type}</p>
                    <p className="text-xs text-muted">{t.reference} · {new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={'text-sm font-semibold ' + (t.type === 'verification_charge' ? 'text-dark' : 'text-primary')}>
                      {t.type === 'verification_charge' ? '-' : '+'}₦{Number(t.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted capitalize">{t.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
