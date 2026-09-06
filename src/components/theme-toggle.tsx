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
    <button onClick={flip} className="fixed bottom-20 right-4 z-40 rounded-full bg-primary px-4 py-3 text-xs font-bold text-white shadow-lg">
      {dark ? '☀ Light' : '🌙 Dark'}
    </button>
  );
}
