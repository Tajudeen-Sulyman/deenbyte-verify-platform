'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('db-theme') === 'dark';
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('db-theme', next ? 'dark' : 'light');
  }

  return (
    <button onClick={toggle} aria-label="Toggle theme" className="theme-toggle-btn">
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
