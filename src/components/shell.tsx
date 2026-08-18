import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShellChrome } from './shell-chrome';
import { LogoutButton } from './logout-button';

export async function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('user_id', user.id).single();
  const { data: p1 } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const { data: p2 } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = String(p1?.role ?? p2?.role ?? '').toLowerCase() === 'admin';

  return (
    <ShellChrome
      balance={Number(wallet?.balance ?? 0)}
      isAdmin={isAdmin}
      title={title}
      logoutSlot={<LogoutButton />}
    >
      {children}
    </ShellChrome>
  );
}
