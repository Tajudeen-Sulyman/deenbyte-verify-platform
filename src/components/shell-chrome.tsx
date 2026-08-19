'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const MAIN = [
  { href: '/dashboard', label: 'Dashboard', d: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
  { href: '/services', label: 'Services', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z' },
  { href: '/wallet', label: 'Wallet', d: 'M3 7h18v12H3zM3 7l3-4h12l3 4M15 12h4' },
  { href: '/history', label: 'History', d: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z' },
  { href: '/transactions', label: 'Transactions', d: 'M4 6h16M4 12h16M4 18h10' },
  { href: '/developer', label: 'Developer', d: 'M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14' },
];

const ACCOUNT = [
  { href: '/privacy', label: 'Privacy', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z' },
  { href: '/terms', label: 'Terms', d: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7' },
  { href: 'mailto:deenbyte.technologies@gmail.com', label: 'Support', d: 'M4 6h16v12H4zM4 7l8 6 8-6' },
];

const ADMIN = [
  { href: '/admin', label: 'Admin', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z' },
  { href: '/admin/analytics', label: 'Analytics', d: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
];

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
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted">Main</p>
        <div className="mt-2 space-y-1">
          {MAIN.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
              className={'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ' +
                (path === i.href ? 'bg-primary text-white' : 'text-dark hover:bg-white')}>
              <Icon d={i.d} />{i.label}
            </Link>
          ))}
        </div>
      </div>
      {isAdmin && (
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted">Admin</p>
          <div className="mt-2 space-y-1">
            {ADMIN.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
                className={'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ' +
                  (path === i.href ? 'bg-primary text-white' : 'text-dark hover:bg-white')}>
                <Icon d={i.d} />{i.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted">Account</p>
        <div className="mt-2 space-y-1">
          {ACCOUNT.map((i) => (
            <Link key={i.label} href={i.href} onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-dark hover:bg-white">
              <Icon d={i.d} />{i.label}
            </Link>
          ))}
          <div className="px-3 pt-2">{logoutSlot}</div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-light">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-light border-r border-border">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/dashboard" className="text-lg font-bold text-dark">
            DeenByte <span className="text-primary">Verify</span>
          </Link>
        </div>
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-dark/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-light shadow-card flex flex-col">
            <div className="px-5 py-5 border-b border-border flex items-center justify-between">
              <span className="text-lg font-bold text-dark">DeenByte <span className="text-primary">Verify</span></span>
              <button onClick={() => setOpen(false)} aria-label="Close menu"
                className="p-2 rounded-lg text-muted hover:bg-white">✕</button>
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
        <main className="p-4 lg:p-6 max-w-5xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
