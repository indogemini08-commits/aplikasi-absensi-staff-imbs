'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, History, FileText, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Beranda', href: '/dashboard', icon: Home },
    { label: 'Riwayat', href: '/riwayat', icon: History },
    { label: 'Absen', href: '/absensi', icon: MapPin, isPrimary: true },
    { label: 'Izin & Cuti', href: '/izin', icon: FileText },
    { label: 'Profil', href: '/profil', icon: User },
  ];

  // Floating futuristic cyber glass dock
  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 flex justify-center pointer-events-none">
      <nav className="w-full max-w-md pointer-events-auto rounded-3xl glass-card border border-white/80 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] px-3 py-2 backdrop-blur-2xl">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -top-5 flex flex-col items-center group cursor-pointer"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 active:scale-95 relative ${
                      isActive
                        ? 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 ring-4 ring-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-105'
                        : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] group-hover:scale-105'
                    }`}
                  >
                    <div className="absolute inset-0 rounded-full bg-white/20 blur-sm pointer-events-none animate-pulse" />
                    <Icon className="w-6 h-6 text-white relative z-10" />
                  </div>
                  <span className="text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                    Absen
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 dark:bg-emerald-500/15 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] mt-1 font-semibold">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
