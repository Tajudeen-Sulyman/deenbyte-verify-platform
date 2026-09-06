import { AppShell } from '@/components/shell';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileCard } from '@/components/profile-card';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile — DeenByte Verify' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <AppShell title="Profile">
      <ProfileCard />
    </AppShell>
  );
}
