'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard', label: 'Home', d: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
  { href: '/transactions', label: 'Transactions', d: 'M4 6h16M4 12h16M4 18h10' },
  { href: '/wallet', label: 'Wallet', d: 'M3 7h18v12H3zM3 7l3-4h12l3 4M15 12h4' },
  { href: '/history', label: 'History', d: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z' },
  { href: '/profile', label: 'Profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-1a7 7 0 0114 0v1' },
];
const STANDALONE = ['/taxid', '/nin/', '/ipe', '/cac', '/bvn'];

export function GlobalNav() {
  const [ok, setOk] = useState(false);
  const path = usePathname() ?? '';
  useEffect(() => {
    fetch('/api/v1/taxid/me').then((r) => r.json()).then((j) => setOk(!!j.loggedIn)).catch(() => {});
  }, []);
  if (!ok || !STANDALONE.some((p) => path.startsWith(p))) return null;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border">
      <div className="grid grid-cols-5">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ' + (path === i.href ? 'text-primary' : 'text-muted')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d={i.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
