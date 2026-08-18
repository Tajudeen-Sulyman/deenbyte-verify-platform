import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { HistoryList } from '@/components/history-list';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('verification_requests')
    .select('*, verification_services(name, service_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

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
          <h1 className="text-xl font-bold text-dark">Verification History</h1>
          <p className="text-sm text-muted">Your recent requests and their statuses</p>
        </div>
        <HistoryList initialRows={rows ?? []} />
      </div>
    </main>
  );
}
