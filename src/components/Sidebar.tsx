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
      className={`hidden md:flex flex-col shrink-0 border-r border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#070b14]/75 backdrop-blur-2xl transition-all duration-300 select-none z-30 sticky top-16 h-[calc(100vh-4rem)] print:hidden ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Header / Brand Bar */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/10 dark:from-blue-500/25 dark:to-indigo-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_12px_rgba(37, 99, 235,0.25)]">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Panel Admin IMBS
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/80 dark:hover:bg-slate-800/80 transition mx-auto border border-transparent hover:border-blue-500/20 hover:shadow-xs cursor-pointer"
          title={collapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu links list with smooth scrolling */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 py-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 shadow-[0_0_6px_#2563eb]" />
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
                      ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(37, 99, 235,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-blue-400/50 scale-[1.01]'
                      : item.highlight
                      ? 'text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/90 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-500/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80 hover:shadow-xs'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive
                        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : item.highlight
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-400 group-hover:text-blue-500'
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

      {/* Footer / Logout Button */}
      <div className="p-3 border-t border-slate-200/60 dark:border-white/10 shrink-0 bg-white/30 dark:bg-black/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition group border border-transparent hover:border-rose-400/30 hover:shadow-xs cursor-pointer"
          title={collapsed ? 'Keluar' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>Keluar / Logout</span>}
        </button>
      </div>
    </aside>
  );
}
