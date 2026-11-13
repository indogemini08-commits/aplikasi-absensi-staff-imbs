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

  // Only show on mobile / small devices or when in staff views
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav shadow-lg px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-4 flex flex-col items-center group"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-300 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 ring-4 ring-emerald-500/20 shadow-emerald-500/40 scale-105'
                      : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/30'
                  }`}
                >
                  <Icon className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  Absen
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

