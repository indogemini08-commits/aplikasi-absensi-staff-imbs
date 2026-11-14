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
  const [appLogo, setAppLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('imbs_app_logo') || '';
      } catch {}
    }
    return '';
  });
  const [orgName, setOrgName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('imbs_app_org_name') || 'IMAM MUZANI BOARDING SCHOOL';
      } catch {}
    }
    return 'IMAM MUZANI BOARDING SCHOOL';
  });
  const [foundationName, setFoundationName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('imbs_app_foundation_name') || 'YAYASAN SABILUL HUDA NAMBO';
      } catch {}
    }
    return 'YAYASAN SABILUL HUDA NAMBO';
  });

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

    // Fetch official identity and logos from system settings
    const loadSettings = () => {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings) {
            const s = data.settings;
            const logo = s.logo_app || s.logo_institution || '';
            const name = s.organization_name || 'IMAM MUZANI BOARDING SCHOOL';
            const foundation = s.foundation_name || 'YAYASAN SABILUL HUDA NAMBO';

            if (logo) setAppLogo(logo);
            if (name) setOrgName(name);
            if (foundation) setFoundationName(foundation);

            try {
              if (logo) sessionStorage.setItem('imbs_app_logo', logo);
              sessionStorage.setItem('imbs_app_org_name', name);
              sessionStorage.setItem('imbs_app_foundation_name', foundation);
            } catch {}
          }
        })
        .catch(() => {});
    };

    loadSettings();

    // Listen for live settings changes from Pengaturan Sistem
    const handleSettingsUpdate = () => {
      if (typeof window !== 'undefined') {
        try {
          const cachedLogo = sessionStorage.getItem('imbs_app_logo');
          const cachedOrg = sessionStorage.getItem('imbs_app_org_name');
          const cachedFound = sessionStorage.getItem('imbs_app_foundation_name');
          if (cachedLogo) setAppLogo(cachedLogo);
          if (cachedOrg) setOrgName(cachedOrg);
          if (cachedFound) setFoundationName(cachedFound);
        } catch {}
      }
      loadSettings();
    };

    window.addEventListener('imbs_settings_updated', handleSettingsUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('imbs_settings_updated', handleSettingsUpdate);
    };
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
    <header className="sticky top-0 z-40 w-full glass-nav relative transition-all">
      {/* Bottom glowing futuristic laser accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 via-cyan-400/50 to-transparent shadow-[0_1px_8px_rgba(16,185,129,0.4)] pointer-events-none" />

      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        {/* Left: Brand & Institution Identity */}
        <div
          onClick={() => router.push(currentUser?.role === 'staff' ? '/dashboard' : '/admin')}
          className="flex items-center gap-3 cursor-pointer group select-none transition-transform active:scale-[0.99]"
          title="Beranda Presensi IMBS"
        >
          {/* Futuristic Frosted Logo Frame with Holographic Reflection */}
          <div className="h-10 sm:h-11 min-w-[2.75rem] max-w-[5.5rem] px-2 py-1 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-md border border-white/60 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-emerald-500/20 group-hover:ring-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
            {appLogo ? (
              <img
                src={appLogo}
                alt={orgName || 'Logo IMBS'}
                className="max-h-full w-auto object-contain filter drop-shadow-xs transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 text-white flex items-center justify-center font-black text-xs shadow-xs neon-glow-emerald">
                IMBS
              </div>
            )}
          </div>

          {/* Title & Organization Subtitle */}
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-tight font-sans truncate max-w-[170px] sm:max-w-xs md:max-w-md group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {orgName || 'IMAM MUZANI BOARDING SCHOOL'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 shadow-[0_0_12px_rgba(16,185,129,0.2)] backdrop-blur-md leading-none shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-neon-dot"></span>
                Presensi Staff
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              <span className="font-medium text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-sm md:max-w-lg">
                {foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
              </span>
              <span className="hidden xl:inline text-slate-300 dark:text-slate-600">•</span>
              <span className="hidden xl:inline text-slate-400 dark:text-slate-500 text-[10px] tracking-wide">
                Portal Presensi Resmi Berbasis GPS
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live WIB Clock HUD Capsule */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-emerald-500/25 dark:border-emerald-500/30 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:border-emerald-500/50 transition-all">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>{wibDate}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-wide">
            {wibTime || '07:30:00'} WIB
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock on Mobile */}
          <div className="md:hidden flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums bg-emerald-50/80 dark:bg-emerald-950/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-emerald-300/40 dark:border-emerald-800/40">
            <Clock className="w-3 h-3" />
            {wibTime}
          </div>

          <ThemeToggle />

          {/* Notifications Button */}
          <button
            onClick={() => router.push('/notifikasi')}
            className="relative p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            title="Pusat Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {currentUser?.unreadNotifications && currentUser.unreadNotifications > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.7)]">
                {currentUser.unreadNotifications > 9 ? '9+' : currentUser.unreadNotifications}
              </span>
            ) : null}
          </button>

          {/* User profile dropdown / quick card */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80 dark:border-slate-800/80">
              <div
                onClick={() => router.push(currentUser.role === 'staff' ? '/profil' : '/admin')}
                className="cursor-pointer flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs neon-glow-emerald">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden lg:block text-left text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar / Logout"
                className="hidden sm:flex p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-transparent hover:border-rose-400/30"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : pathname !== '/login' && pathname !== '/' ? (
            /* Subtle loading placeholder during protected page transitions */
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
              <div className="hidden lg:block space-y-1">
                <div className="w-16 h-3 bg-slate-200/80 dark:bg-slate-800/80 rounded animate-pulse" />
                <div className="w-10 h-2 bg-slate-200/80 dark:bg-slate-800/80 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-xs px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-600/30 neon-glow-emerald transition cursor-pointer"
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

