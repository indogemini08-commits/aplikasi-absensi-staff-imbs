'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, Clock, Building2, User, LogOut, ChevronRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { getWIBTimeString, formatIndonesianDateShort } from '@/lib/date';

interface NavbarProps {
  user?: {
    name?: string;
    role?: string;
    nip?: string;
    unreadNotifications?: number;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [wibTime, setWibTime] = useState('');
  const [wibDate, setWibDate] = useState('');
  const [appLogo, setAppLogo] = useState<string>('');

  // Persistent user state: prioritize prop, fallback to localStorage cache
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (user) return user;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      try {
        localStorage.setItem('imbs_user_session', JSON.stringify(user));
      } catch {}
    } else if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        if (cached) {
          setCurrentUser(JSON.parse(cached));
        }
      } catch {}
    }
  }, [user]);

  useEffect(() => {
    // Live ticking WIB clock
    const updateTime = () => {
      setWibTime(getWIBTimeString());
      setWibDate(formatIndonesianDateShort(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const cachedLogo = typeof window !== 'undefined' ? sessionStorage.getItem('imbs_app_logo') : null;
    if (cachedLogo) {
      setAppLogo(cachedLogo);
    } else {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings?.logo_app) {
            setAppLogo(data.settings.logo_app);
            try {
              sessionStorage.setItem('imbs_app_logo', data.settings.logo_app);
            } catch {}
          }
        })
        .catch(() => {});
    }

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('imbs_user_session');
        sessionStorage.clear();
      }
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3">
          {appLogo ? (
            <div className="h-9 w-auto max-w-[120px] rounded-xl flex items-center justify-center overflow-hidden">
              <img src={appLogo} alt="Logo" className="max-h-9 max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-bold text-base shadow-md shadow-emerald-500/20">
              IM
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                IMBS
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Presensi Staff
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 leading-none">
              Insan Mandiri Boarding School & Institute
            </p>
          </div>
        </div>

        {/* Center: Live WIB Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>{wibDate}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {wibTime || '07:30:00'} WIB
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock on Mobile */}
          <div className="md:hidden flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" />
            {wibTime}
          </div>

          <ThemeToggle />

          {/* Notifications */}
          <button
            onClick={() => router.push('/notifikasi')}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200/60 dark:border-slate-700/60 shadow-xs"
            title="Pusat Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {currentUser?.unreadNotifications && currentUser.unreadNotifications > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {currentUser.unreadNotifications > 9 ? '9+' : currentUser.unreadNotifications}
              </span>
            ) : null}
          </button>

          {/* User profile dropdown / quick card */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div
                onClick={() => router.push(currentUser.role === 'staff' ? '/profil' : '/admin')}
                className="cursor-pointer flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:block text-left text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar / Logout"
                className="hidden sm:flex p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : pathname !== '/login' && pathname !== '/' ? (
            /* Subtle loading placeholder during protected page transitions (never flash 'Masuk') */
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="hidden lg:block space-y-1">
                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-10 h-2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

