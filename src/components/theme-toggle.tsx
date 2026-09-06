'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem('db-theme') === 'dark';
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
    <button onClick={flip} className="rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-white shadow">
      {dark ? '☀ Light' : '🌙 Dark'}
    </button>
  );
}
