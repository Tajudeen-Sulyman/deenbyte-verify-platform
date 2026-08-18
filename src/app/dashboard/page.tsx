import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('user_id', user.id).single();

  const balance = Number(wallet?.balance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  const isAdmin = (profile?.role ?? 'customer') === 'admin';

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogo />
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Dashboard</h1>
          <p className="text-sm text-muted">Welcome back, {user.email}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/wallet" className="bg-white border border-border rounded-2xl p-5 hover:border-primary transition">
            <p className="text-sm text-muted">Wallet Balance</p>
            <p className="text-2xl font-bold text-dark mt-1">₦{balance}</p>
          </Link>
          
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/verify" className="bg-white border border-border rounded-2xl p-4 text-sm font-semibold text-dark hover:border-primary transition">Verify</Link>
          <Link href="/wallet" className="bg-white border border-border rounded-2xl p-4 text-sm font-semibold text-dark hover:border-primary transition">Wallet</Link>
          <Link href="/history" className="bg-white border border-border rounded-2xl p-4 text-sm font-semibold text-dark hover:border-primary transition">History</Link>
          <Link href="/transactions" className="bg-white border border-border rounded-2xl p-4 text-sm font-semibold text-dark hover:border-primary transition">Transactions</Link>
          {isAdmin && (
            <Link href="/admin" className="col-span-2 bg-dark rounded-2xl p-4 text-sm font-semibold text-white text-center hover:bg-primary transition">
              Admin Dashboard
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
