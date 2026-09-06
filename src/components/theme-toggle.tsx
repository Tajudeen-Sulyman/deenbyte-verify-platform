'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('db-theme');
    const t = saved ? saved === 'dark' : true;
    setDark(t);
    document.documentElement.dataset.theme = t ? 'dark' : 'light';
  }, []);
  function flip() {
    const n = !dark;
    setDark(n);
    localStorage.setItem('db-theme', n ? 'dark' : 'light');
    document.documentElement.dataset.theme = n ? 'dark' : 'light';
  }
  return (
    <button onClick={flip} className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white">
      {dark ? '☀ Light' : '🌙 Dark'}
    </button>
  );
}
