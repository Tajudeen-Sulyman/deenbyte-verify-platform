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

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogo />
          <div className="flex items-center gap-4">
            <Link href="/verify" className="text-sm font-medium text-muted hover:text-dark">Verify</Link>
            <Link href="/wallet" className="text-sm font-medium text-muted hover:text-dark">Wallet</Link>
            <LogoutButton />
          </div>
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
          <div className="bg-white border border-border rounded-2xl p-5">
            <p className="text-sm text-muted">Account Type</p>
            <p className="text-2xl font-bold text-primary mt-1 uppercase">{profile?.role ?? 'customer'}</p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-dark">Quick Verification</p>
            <p className="text-sm text-muted mt-1">NIN and BVN verification are live.</p>
          </div>
          <Link href="/verify" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
            Verify
          </Link>
        </div>
      </div>
    </main>
  );
}
