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
    return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />;
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      className="relative p-1.5 xs:p-2 sm:p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl transition-all duration-300 border border-white/80 dark:border-white/10 shadow-xs hover:shadow-[0_0_18px_rgba(37, 99, 235,0.3)] hover:border-blue-500/50 active:scale-95 cursor-pointer group shrink-0"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:rotate-45 group-hover:drop-shadow-[0_0_8px_#f59e0b] transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 group-hover:-rotate-12 group-hover:drop-shadow-[0_0_8px_#6366f1] transition-transform duration-300" />
      )}
    </button>
  );
}
