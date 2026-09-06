import { AppShell } from '@/components/shell';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotifList } from '@/components/notif-list';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications — DeenByte Verify' };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <AppShell title="Notifications">
      <NotifList />
    </AppShell>
  );
}
