import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { VerifyForm } from '@/components/verify-form';
import { DemographicForm } from '@/components/demographic-form';
import { AsyncForm } from '@/components/async-form';

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: services } = await supabase
    .from('verification_services').select('*')
    .eq('enabled', true).eq('status', 'active')
    .order('category').order('name');

  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('user_id', user.id).single();
  const walletBalance = Number(wallet?.balance ?? 0);

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
          <h1 className="text-xl font-bold text-dark">Verify Identity</h1>
          <p className="text-sm text-muted">Choose a service below</p>
        </div>
        {(!services || services.length === 0) && (
          <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">No services available.</div>
        )}
        {services?.map((s: any) =>
          s.is_async ? (
            <AsyncForm key={s.service_id} service={s} walletBalance={walletBalance} />
          ) : s.service_id === 'nin_demographic' ? (
            <DemographicForm key={s.service_id} service={s} walletBalance={walletBalance} />
          ) : (
            <VerifyForm key={s.service_id} service={s} walletBalance={walletBalance} />
          )
        )}
      </div>
    </main>
  );
}
