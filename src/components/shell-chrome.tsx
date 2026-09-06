'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className={className ?? 'h-5 w-5 shrink-0'} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

type Item = { href: string; label: string; d: string; g: string };

const OVERVIEW: Item[] = [
  { href: '/dashboard', label: 'Dashboard', d: 'M3 12l9-9 9M5 10v10h5v-6h4v6h5V10', g: 'from-sky-500 to-blue-600' },
  { href: '/transactions', label: 'Transactions', d: 'M4 6h16M4 12h16M4 18h10', g: 'from-pink-500 to-rose-600' },
  { href: '/wallet', label: 'Fund Wallet', d: 'M3 7h18v12H3zM3 7l3-4h12l3 4M15 12h4', g: 'from-amber-500 to-orange-600' },
  { href: '/profile', label: 'Profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-1a7 7 0 0114 0v1', g: 'from-pink-500 to-rose-600' },
];
const NIN: Item[] = [
  { href: '/services', label: 'All NIN Services', d: 'M4 6h16M4 12h16M4 18h16', g: 'from-violet-500 to-fuchsia-600' },
  { href: '/verify?s=nin_regular', label: 'NIN Verification', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z', g: 'from-violet-500 to-fuchsia-600' },
  { href: '/verify?s=nin_by_phone', label: 'NIN by Phone', d: 'M7 3h10v18H7zM11 18h2', g: 'from-violet-500 to-fuchsia-600' },
  { href: '/verify?s=nin_demographic', label: 'Demographic Search', d: 'M8 10a3 3 0 106 0 3 3 0 00-6 0zM4 20c0-3 3-5 8-5s8 2 8 5', g: 'from-violet-500 to-fuchsia-600' },
  { href: '/nin/validation', label: 'NIN Validation', d: 'M9 3h6v3H9zM9 5H7v16h10V5h-2M9 12l2 2 4-4', g: 'from-violet-500 to-fuchsia-600' },
  { href: '/nin/modification', label: 'NIN Modification', d: 'M4 4h16v16H4zM8 10h8M8 14h5', g: 'from-fuchsia-500 to-cyan-600' },
  { href: '/nin/ipe', label: 'IPE Clearance', d: 'M12 9v4m0 4h.01M10 3h4l1 2h5v14H4V5h5l1-2z', g: 'from-rose-500 to-red-600' },
];
const BVN: Item[] = [
  { href: '/verify?s=bvn_basic', label: 'BVN Verification', d: 'M12 3a9 9 0 019 9v9h-4v-9a5 5 0 00-10 0v9H3v-9a9 9 0 019-9z', g: 'from-violet-500 to-purple-600' },
  { href: '/verify?s=bvn_retrieval', label: 'BVN Retrieval', d: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16', g: 'from-violet-500 to-purple-600' },
];
const ADMIN: Item[] = [
  { href: '/admin', label: 'Admin', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z', g: 'from-rose-500 to-red-600' },
  { href: '/admin/analytics', label: 'Analytics', d: 'M4 20V10M10 20V4M16 20v-8M22 20H2', g: 'from-blue-500 to-indigo-600' },
  { href: '/admin/tin', label: 'TIN Queue', d: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z', g: 'from-pink-500 to-rose-600' },
];
const ACCOUNT: Item[] = [
  { href: '/history', label: 'History', d: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z', g: 'from-blue-500 to-indigo-600' },
  { href: '/notifications', label: 'Notifications', d: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h11z', g: 'from-amber-500 to-yellow-600' },
  { href: '/privacy', label: 'Privacy', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z', g: 'from-slate-500 to-slate-600' },
  { href: '/terms', label: 'Terms', d: 'M6 3h9l4 4v14H6zM9 3v5h5', g: 'from-slate-500 to-slate-600' },
  { href: 'mailto:deenbyte.technologies@gmail.com', label: 'Support', d: 'M4 6h16v12H4zM4 7l8 6 8-6', g: 'from-violet-500 to-fuchsia-600' },
];

function NavGroup({ label, d, g, items, active, onNav, defaultOpen }: {
  label: string; d: string; g: string; items: Item[]; active: string; onNav: () => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5">
        <span className={'h-8 w-8 rounded-lg bg-gradient-to-br ' + g + ' text-white flex items-center justify-center shadow'}>
          <Icon d={d} className="h-4 w-4" />
        </span>
        <span className="flex-1 text-left">{label}</span>
        <Icon d={open ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'} className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="mt-1 mb-2 space-y-1 pl-5">
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={onNav}
              className={'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border-l-2 ' +
                (active === i.href ? 'border-fuchsia-400 bg-white/10 text-fuchsia-300' : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white')}>
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SideNav({ email, balance, isAdmin, active, onNav }: {
  email: string; balance: number; isAdmin: boolean; active: string; onNav: () => void;
}) {
  const initial = (email || 'D').trim().charAt(0).toUpperCase();
  return (
    <>
      <div className="px-4 py-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-400 to-violet-600 text-white flex items-center justify-center font-bold">{initial}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{email || 'DeenByte User'}</p>
            <p className="text-xs font-bold text-violet-400">₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        <NavGroup label="Overview" d="M3 12l9-9 9M5 10v10h5v-6h4v6h5V10" g="from-sky-500 to-blue-600" items={OVERVIEW} active={active} onNav={onNav} defaultOpen />
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Your identity, simplified</p>
        <NavGroup label="NIN Services" d="M4 6h16M4 12h16M4 18h16" g="from-violet-500 to-fuchsia-600" items={NIN} active={active} onNav={onNav} defaultOpen />
        <NavGroup label="BVN Services" d="M12 3a9 9 0 019 9v9h-4v-9a5 5 0 00-10 0v9H3v-9a9 9 0 019-9z" g="from-violet-500 to-purple-600" items={BVN} active={active} onNav={onNav} />
        <NavGroup label="Products" d="M6 3h9l4 4v14H6zM9 3v5h5" g="from-amber-500 to-orange-600" items={[{ href: '/taxid', label: 'TIN Verification Slip', d: 'M6 3h9l4 4v14H6zM9 3v5h5', g: 'from-amber-500 to-orange-600' }, { href: '/tin', label: 'Generate TIN (Agency)', d: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z', g: 'from-pink-500 to-rose-600' }, { href: '/tin/history', label: 'TIN History', d: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z', g: 'from-blue-500 to-indigo-600' }, { href: '/cac', label: 'CAC Services', d: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6', g: 'from-fuchsia-500 to-purple-600' }]} active={active} onNav={onNav} />
        {isAdmin && (
          <NavGroup label="Admin" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" g="from-rose-500 to-red-600" items={ADMIN} active={active} onNav={onNav} />
        )}
        <NavGroup label="Account" d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6" g="from-slate-500 to-slate-600" items={ACCOUNT} active={active} onNav={onNav} />
      </nav>
    </>
  );
}

export function ShellChrome({ isAdmin, title, email, avatarUrl, balance, logoutSlot, children }: {
  isAdmin: boolean; title: string; email?: string; avatarUrl?: string; balance: number; logoutSlot: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const onNav = () => setOpen(false);

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-white">
      <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-xl object-cover shadow-md" />
      DeenByte <span className="text-violet-400">Verify</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-light">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-dark border-r border-white/10">
        <div className="px-5 py-5 border-b border-white/10">{brand}</div>
        <SideNav email={email ?? ''} balance={balance} isAdmin={isAdmin} active={path} onNav={onNav} />
        <div className="px-4 py-3 border-t border-white/10 space-y-2"><ThemeToggle />{logoutSlot}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-dark/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-dark shadow-card flex flex-col">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 rounded-lg text-slate-300 hover:bg-white/10">✕</button>
            </div>
            <SideNav email={email ?? ''} balance={balance} isAdmin={isAdmin} active={path} onNav={onNav} />
            <div className="px-4 py-3 border-t border-white/10 space-y-2"><ThemeToggle />{logoutSlot}</div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setOpen(true)} aria-label="Open menu" className="lg:hidden p-2 rounded-lg text-dark hover:bg-light">
                <Icon d="M4 6h16M4 12h16M4 18h16" />
              </button>
              <h1 className="text-sm lg:text-base font-semibold text-dark truncate">{title}</h1>
            </div>
            <Link href="/profile" aria-label="Profile" className="shrink-0">
              {avatarUrl ? <img src={avatarUrl} alt="profile" className="h-9 w-9 rounded-full object-cover border-2 border-primary" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{(email ?? 'D')[0].toUpperCase()}</span>}
            </Link>
          </div>
        </header>
        <main className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-5xl mx-auto">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border">
        <div className="grid grid-cols-5">
          {[
            { href: '/dashboard', label: 'Home', d: 'M3 12l9-9 9M5 10v10h5v-6h4v6h5V10' },
            { href: '/transactions', label: 'Transactions', d: 'M4 6h16M4 12h16M4 18h10' },
            { href: '/wallet', label: 'Wallet', d: 'M3 7h18v12H3zM3 7l3-4h12l3 4M15 12h4' },
            { href: '/history', label: 'History', d: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z' },
          ].map((i) => (
            <Link key={i.href} href={i.href}
              className={'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ' + (path === i.href ? 'text-primary' : 'text-muted')}>
              <Icon d={i.d} className="h-5 w-5" />
              {i.label}
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
