'use client';

import { createClient } from '@/lib/supabase/client';

export function GoogleButton() {
  async function google() {
    const supabase = createClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin + '/dashboard' },
    });
    if (error) alert('Google sign-in failed: ' + error.message);
  }

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <button type="button" onClick={google}
        className="mt-4 w-full rounded-xl border border-border bg-white py-3 text-sm font-bold text-dark hover:bg-light flex items-center justify-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.66l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.62.75 3.84 3.27 2 6.94l3.66 2.84C6.5 7.09 9 5.04 12 5.04z" />
          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.28H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.6 2.8c2.1-1.94 3.83-4.8 3.83-8.61z" />
          <path fill="#FBBC05" d="M5.66 14.22a7.03 7.03 0 0 1 0-4.44L2 6.94a11.26 11.26 0 0 0 0 10.12l3.66-2.84z" />
          <path fill="#34A853" d="M12 23.25c3.04 0 5.6-1 7.66-2.72l-3.6-2.8c-1 .68-2.32 1.08-4.06 1.08-3 0-5.5-2.05-6.34-4.74L2 17.06C3.84 20.73 7.62 23.25 12 23.25z" />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
