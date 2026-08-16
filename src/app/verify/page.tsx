import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { VerifyForm } from '@/components/verify-form';

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: services } = await supabase
    .from('verification_services')
    .select('service_id, name, category, selling_price, supports_pdf')
    .eq('status', 'active')
    .eq('enabled', true)
    .order('name');

  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('user_id', user.id).single();

  const balance = Number(wallet?.balance ?? 0);

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard"><BrandLogo /></Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-dark">
              ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Verify</h1>
          <p className="text-sm text-muted">Choose a service and enter the number to verify.</p>
        </div>

        {!services || services.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">
            No verification services are currently active. Check back soon.
          </div>
        ) : (
          services.map((s) => (
            <VerifyForm key={s.service_id} service={s} walletBalance={balance} />
          ))
        )}
      </div>
    </main>
  );
}
