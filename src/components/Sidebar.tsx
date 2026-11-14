'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MapPin,
  Clock,
  Calendar,
  ClipboardCheck,
  FileCheck2,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const effectiveRole = userRole || (() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        if (cached) return JSON.parse(cached).role;
      } catch {}
    }
    return 'admin';
  })();

  const menuGroups = [
    {
      group: 'Pemantauan',
      items: [
        { label: 'Dashboard Utama', href: '/admin', icon: LayoutDashboard },
        { label: 'Papan Jadwal Kehadiran', href: '/admin/papan-jadwal', icon: CalendarDays, highlight: true },
        { label: 'Data Absensi Master', href: '/admin/absensi', icon: ClipboardCheck },
      ],
    },
    {
      group: 'Persetujuan & Tinjauan',
      items: [
        { label: 'Persetujuan Izin / Cuti', href: '/admin/izin-cuti', icon: FileCheck2 },
        { label: 'Peninjauan Keterlambatan', href: '/admin/keterlambatan', icon: AlertTriangle },
        { label: 'Pengajuan Koreksi', href: '/admin/koreksi', icon: Layers },
      ],
    },
    {
      group: 'Master Data & Penjadwalan',
      items: [
        { label: 'Data Pegawai & Akun', href: '/admin/pegawai', icon: Users },
        { label: 'Lokasi & Radius GPS', href: '/admin/lokasi', icon: MapPin },
        { label: 'Jadwal Kerja Departemen', href: '/admin/jadwal-departemen', icon: Clock },
        { label: 'Kalender & Hari Libur', href: '/admin/kalender', icon: Calendar },
        { label: 'Saldo Cuti Pegawai', href: '/admin/saldo-cuti', icon: Coins },
      ],
    },
    {
      group: 'Laporan & Sistem',
      items: [
        { label: 'Rekap & Ekspor Laporan', href: '/admin/laporan', icon: FileSpreadsheet },
        { label: 'Histori Audit Log', href: '/admin/audit-log', icon: History },
        { label: 'Pengaturan Sistem', href: '/admin/pengaturan', icon: Settings },
      ],
    },
  ];

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
    <aside
      className={`hidden md:flex flex-col border-r border-white/50 dark:border-white/10 glass-card transition-all duration-300 select-none z-30 sticky top-16 h-[calc(100vh-4rem)] ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Header / Collapse Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Panel Admin IMBS
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/80 dark:hover:bg-slate-800/80 transition mx-auto border border-transparent hover:border-emerald-500/20 hover:shadow-xs cursor-pointer"
          title={collapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu links list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 py-1 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
                <span>{group.group}</span>
              </h5>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-emerald-400/50 scale-[1.02]'
                      : item.highlight
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-500/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80 hover:shadow-xs'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive
                        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : item.highlight
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-400 group-hover:text-emerald-500'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {isActive && !collapsed && (
                    <span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition group border border-transparent hover:border-rose-400/30 hover:shadow-xs cursor-pointer"
          title={collapsed ? 'Keluar' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>Keluar / Logout</span>}
        </button>
      </div>
    </aside>
  );
}

