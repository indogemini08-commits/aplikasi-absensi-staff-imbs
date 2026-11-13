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
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 glass-card transition-all duration-300 select-none z-30 sticky top-16 h-[calc(100vh-4rem)] ${collapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Sidebar Header / Collapse Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Panel Admin IMBS
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition mx-auto"
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
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                {group.group}
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : item.highlight
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
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
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition group"
          title={collapsed ? 'Keluar' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>Keluar / Logout</span>}
        </button>
      </div>
    </aside>
  );
}

