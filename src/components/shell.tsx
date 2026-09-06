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

  return (
    <ShellChrome
      balance={Number(walletRes.data?.balance ?? 0)}
      isAdmin={isAdmin}
      email={String(user.email ?? '')}
      title={title}
      logoutSlot={<LogoutButton />}
    >
      {children}
    </ShellChrome>
  );
}
