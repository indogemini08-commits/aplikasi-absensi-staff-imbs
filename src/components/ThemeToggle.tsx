'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('imbs_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('imbs_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('imbs_theme', 'light');
    }
  };

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />;
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 rotate-0 transition-transform duration-300" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-500 rotate-0 transition-transform duration-300" />
      )}
    </button>
  );
}

