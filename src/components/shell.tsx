import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShellChrome } from './shell-chrome';
import { LogoutButton } from './logout-button';
import { ThemeToggle } from '@/components/theme-toggle';

export async function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [walletRes, p1, p2] = await Promise.all([
    supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
  ]);
  const isAdmin = String(p1.data?.role ?? p2.data?.role ?? '').toLowerCase() === 'admin';

  let avatarUrl: string | undefined;
  if (user) {
    const lst = await supabase.storage.from('avatars').list(user.id, { limit: 1 });
    if (lst.data && lst.data.length > 0) avatarUrl = supabase.storage.from('avatars').getPublicUrl(user.id + '/' + lst.data[0].name).data.publicUrl;
  }
  return (
    <ShellChrome
      balance={Number(walletRes.data?.balance ?? 0)} avatarUrl={avatarUrl}
      isAdmin={isAdmin}
      email={String(user.email ?? '')}
      title={title}
      logoutSlot={<LogoutButton />}
    >
      {children}
    </ShellChrome>
  );
}
