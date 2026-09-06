import { AppShell } from '@/components/shell';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CacAdmin } from '@/components/cac-admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'CAC Queue — Admin' };

export default async function AdminCacPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.email !== 'deenbyte.technologies@gmail.com') redirect('/dashboard');
  return (
    <AppShell title="CAC Queue">
      <CacAdmin />
    </AppShell>
  );
}
