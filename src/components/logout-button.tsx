'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm font-medium text-muted hover:text-dark"
    >
      Log out
    </button>
  );
}
