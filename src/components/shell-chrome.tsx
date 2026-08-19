'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className ?? 'h-5 w-5 shrink-0'} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const MAIN = [
  { href: '/dashboard', label: 'Dashboard', d: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10', g: 'from-emerald-500 to-teal-600' },
  { href: '/services', label: 'Services', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z', g: 'from-violet-500 to-purple-600' },
  { href: '/wallet', label: 'Wallet', d: 'M3 7h18v12H3zM3 7l3-4h12l3 4M15 12h4', g: 'from-amber-500 to-orange-600' },
  { href: '/history', label: 'History', d: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z', g: 'from-blue-500 to-indigo-600' },
  { href: '/transactions', label: 'Transactions', d: 'M4 6h16M4 12h16M4 18h10', g: 'from-pink-500 to-rose-600' },
];

const ADMIN = [
  { href: '/admin', label: 'Admin', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z', g: 'from-rose-500 to-red-600' },
  { href: '/admin/analytics', label: 'Analytics', d: 'M4 20V10M10 20V4M16 20v-8M22 20H2', g: 'from-blue-500 to-indigo-600' },
];

const ACCOUNT = [
  { href: '/privacy', label: 'Privacy', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z', g: 'from-slate-500 to-slate-600' },
  { href: '/terms', label: 'Terms', d: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7', g: 'from-slate-500 to-slate-600' },
  { href: 'mailto:deenbyte.technologies@gmail.com', label: 'Support', d: 'M4 6h16v12H4zM4 7l8 6 8-6', g: 'from-emerald-500 to-teal-600' },
];

function NavItems({ items, active, onNav }: { items: typeof MAIN; active: string; onNav: () => void }) {
  return (
    <div className="space-y-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} onClick={onNav}
          className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ' +
            (active === i.href ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
          <span className={'h-8 w-8 rounded-lg bg-gradient-to-br ' + i.g + ' text-white flex items-center justify-center shadow'}>
            <Icon d={i.d} className="h-4 w-4" />
          </span>
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export function ShellChrome({ balance, isAdmin, title, logoutSlot, children }: {
  balance: number;
  isAdmin: boolean;
  title: string;
  logoutSlot: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      <div>
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Main</p>
        <div className="mt-2"><NavItems items={MAIN} active={path} onNav={() => setOpen(false)} /></div>
      </div>
      {isAdmin && (
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin</p>
          <div className="mt-2"><NavItems items={ADMIN} active={path} onNav={() => setOpen(false)} /></div>
        </div>
      )}
      <div>
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Account</p>
        <div className="mt-2"><NavItems items={ACCOUNT} active={path} onNav={() => setOpen(false)} /></div>
        <div className="px-3 pt-3">{logoutSlot}</div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-light">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-dark border-r border-white/10">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-white">
            <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-xl object-cover shadow-md" />
            DeenByte <span className="text-emerald-400">Verify</span>
          </Link>
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-dark/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-dark shadow-card flex flex-col">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg font-bold text-white">
                <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-xl object-cover shadow-md" />
                DeenByte <span className="text-emerald-400">Verify</span>
              </span>
              <button onClick={() => setOpen(false)} aria-label="Close menu"
                className="p-2 rounded-lg text-slate-300 hover:bg-white/10">✕</button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setOpen(true)} aria-label="Open menu"
                className="lg:hidden p-2 rounded-lg text-dark hover:bg-light">
                <Icon d="M4 6h16M4 12h16M4 18h16" />
              </button>
              <h1 className="text-sm lg:text-base font-semibold text-dark truncate">{title}</h1>
            </div>
            <Link href="/wallet"
              className="shrink-0 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs lg:text-sm font-bold">
              ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </Link>
          </div>
        </header>
        <main className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-5xl mx-auto">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border">
        <div className="grid grid-cols-5">
          {[MAIN[0], MAIN[1], MAIN[2], MAIN[3]].map((i) => (
            <Link key={i.href} href={i.href}
              className={'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ' +
                (path === i.href ? 'text-primary' : 'text-muted')}>
              <Icon d={i.d} className="h-5 w-5" />
              {i.label === 'Dashboard' ? 'Home' : i.label}
            </Link>
          ))}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-muted">
            <Icon d="M4 6h16M4 12h16M4 18h16" className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
