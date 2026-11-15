'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Clock,
  CalendarCheck,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  MapPin,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  FileSpreadsheet,
  CalendarDays,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import { formatIndonesianDate } from '@/lib/date';
import { useDataSync } from '@/lib/sync';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [boardData, setBoardData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_admin_board');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [pendingLeaves, setPendingLeaves] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_admin_leaves');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [pendingLates, setPendingLates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_admin_logs');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_admin_board');
    }
    return true;
  });

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  // Real-time synchronization whenever database or entities change
  useDataSync(() => {
    fetchAdminDashboard();
  });

  const fetchAdminDashboard = async () => {
    try {
      // Fetch user session and all dashboard metrics simultaneously in parallel without cache
      const [userRes, boardRes, leaveRes, auditRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/schedules/board', { cache: 'no-store' }),
        fetch('/api/leave?status=pending', { cache: 'no-store' }),
        fetch('/api/audit-logs', { cache: 'no-store' }),
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      if (userData?.user?.role === 'staff') {
        router.push('/dashboard');
        return;
      }
      setUser(userData.user);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
        } catch {}
      }

      const [boardJson, leaveJson, auditJson] = await Promise.all([
        boardRes.ok ? boardRes.json() : Promise.resolve({ stats: {}, items: [] }),
        leaveRes.ok ? leaveRes.json() : Promise.resolve({ requests: [] }),
        auditRes.ok ? auditRes.json() : Promise.resolve({ logs: [] }),
      ]);

      setBoardData(boardJson);
      setPendingLeaves(leaveJson.requests || []);
      setAuditLogs(auditJson.logs?.slice(0, 5) || []);

      if (typeof window !== 'undefined') {
        try {
          if (boardJson && (boardJson.stats?.total_employees > 0 || (boardJson.items && boardJson.items.length > 0))) {
            sessionStorage.setItem('imbs_admin_board', JSON.stringify(boardJson));
          } else {
            sessionStorage.removeItem('imbs_admin_board');
          }
          if (leaveJson.requests && leaveJson.requests.length > 0) {
            sessionStorage.setItem('imbs_admin_leaves', JSON.stringify(leaveJson.requests));
          } else {
            sessionStorage.removeItem('imbs_admin_leaves');
          }
          if (auditJson.logs && auditJson.logs.length > 0) {
            sessionStorage.setItem('imbs_admin_logs', JSON.stringify(auditJson.logs.slice(0, 5)));
          } else {
            sessionStorage.removeItem('imbs_admin_logs');
          }
        } catch {}
      }

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-transparent">
        <Navbar user={user} />
        <div className="flex flex-1">
          <Sidebar userRole={user?.role} />
          <main className="flex-1 w-full min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonTable />
          </main>
        </div>
      </div>
    );
  }

  const stats = boardData?.stats || {
    totalEmployees: 0,
    hadir: 0,
    terlambat: 0,
    belumAbsen: 0,
    izin: 0,
    cuti: 0,
    sakit: 0,
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
          {/* Executive Header Banner with Futuristic Glass & Holographic Accent */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-white/80 dark:border-white/10 shadow-[0_20px_50px_-10px_rgba(37, 99, 235,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
            {/* Subtle corner light refraction */}
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-blue-500/20 dark:bg-blue-500/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-cyan-500/20 dark:bg-cyan-500/25 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-300/60 dark:border-blue-700/50 mb-2.5 shadow-[0_0_15px_rgba(37, 99, 235,0.2)] backdrop-blur-md whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-neon-dot" />
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Panel Pemantauan Eksekutif HRD</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Dashboard Kehadiran Staff IMBS
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium flex flex-wrap items-center gap-1.5">
                <span className="whitespace-nowrap">Data real-time hari ini:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{boardData?.formattedDate}</span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">Asia/Jakarta (WIB)</span>
              </p>
            </div>

            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 sm:gap-3 relative z-10 w-full sm:w-auto shrink-0">
              <button
                onClick={() => router.push('/admin/papan-jadwal')}
                className="py-3 px-4 sm:px-5 rounded-2xl font-extrabold text-xs bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 neon-glow-blue transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full xs:w-auto whitespace-nowrap"
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Buka Papan Jadwal</span>
              </button>
              <button
                onClick={() => router.push('/admin/laporan')}
                className="py-3 px-4 sm:px-5 rounded-2xl font-extrabold text-xs border border-blue-500/30 dark:border-blue-500/40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl text-slate-800 dark:text-slate-100 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(37, 99, 235,0.2)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full xs:w-auto whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="whitespace-nowrap">Rekap Laporan</span>
              </button>
            </div>
          </div>

          {/* Real-time Statistics Cards: 6 Futuristic Neon Glass Capsules */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
            {/* 1. Total Pegawai (Electric Blue / Indigo Aura) */}
            <div
              onClick={() => router.push('/admin/pegawai')}
              className="glass-card glass-card-hover p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-400/30 dark:border-indigo-500/30 hover:border-indigo-400/70 hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-indigo-500 dark:text-indigo-400">
                <span className="text-[10px] xs:text-[11px] font-bold tracking-wide whitespace-nowrap">Total Pegawai</span>
                <div className="p-1.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <Users className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 sm:mt-2 tabular-nums">
                {stats.totalEmployees}
              </div>
              <span className="text-[10px] xs:text-[10.5px] font-semibold text-slate-400 dark:text-slate-400 mt-1 block whitespace-nowrap">Aktif Bertugas</span>
            </div>

            {/* 2. Sudah Hadir (Neon Sapphire Blue Aura) */}
            <div
              onClick={() => router.push('/admin/papan-jadwal?status=hadir')}
              className="glass-card glass-card-hover p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-blue-400/30 dark:border-blue-500/35 hover:border-blue-400/80 hover:shadow-[0_0_25px_rgba(37, 99, 235,0.35)] cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                <span className="text-[10px] xs:text-[11px] font-bold tracking-wide whitespace-nowrap">Sudah Hadir</span>
                <div className="p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <CalendarCheck className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1.5 sm:mt-2 tabular-nums drop-shadow-[0_0_12px_rgba(37, 99, 235,0.3)]">
                {stats.hadir}
              </div>
              <span className="text-[10px] xs:text-[10.5px] font-semibold text-blue-600/80 dark:text-blue-400/80 mt-1 block whitespace-nowrap">Tercatat di Lokasi</span>
            </div>

            {/* 3. Terlambat (Golden Amber Aura) */}
            <div
              onClick={() => router.push('/admin/keterlambatan')}
              className="glass-card glass-card-hover p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-400/30 dark:border-amber-500/35 hover:border-amber-400/80 hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-amber-500">
                <span className="text-[10px] xs:text-[11px] font-bold tracking-wide whitespace-nowrap">Terlambat</span>
                <div className="p-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3xl font-black text-amber-500 mt-1.5 sm:mt-2 tabular-nums drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                {stats.terlambat}
              </div>
              <span className="text-[10px] xs:text-[10.5px] font-semibold text-amber-500/80 mt-1 block whitespace-nowrap">Lewat Grace Period</span>
            </div>

            {/* 4. Belum Absen (Neon Cyan Aura) */}
            <div
              onClick={() => router.push('/admin/papan-jadwal?status=belum absen')}
              className="glass-card glass-card-hover p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-cyan-400/30 dark:border-cyan-500/35 hover:border-cyan-400/80 hover:shadow-[0_0_25px_rgba(6,182,212,0.35)] cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
                <span className="text-[10px] xs:text-[11px] font-bold tracking-wide whitespace-nowrap">Belum Absen</span>
                <div className="p-1.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <Clock className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1.5 sm:mt-2 tabular-nums drop-shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                {stats.belumAbsen}
              </div>
              <span className="text-[10px] xs:text-[10.5px] font-semibold text-slate-400 dark:text-slate-400 mt-1 block whitespace-nowrap">Menunggu Clock-In</span>
            </div>

            {/* 5. Cuti / Izin (Cosmic Violet Aura) */}
            <div
              onClick={() => router.push('/admin/izin-cuti')}
              className="glass-card glass-card-hover p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-violet-400/30 dark:border-violet-500/35 hover:border-violet-400/80 hover:shadow-[0_0_25px_rgba(139,92,246,0.35)] cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-violet-600 dark:text-violet-400">
                <span className="text-[10px] xs:text-[11px] font-bold tracking-wide whitespace-nowrap">Cuti / Izin</span>
                <div className="p-1.5 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <FileCheck className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 mt-1.5 sm:mt-2 tabular-nums drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                {stats.cuti + stats.izin}
              </div>
              <span className="text-[10px] xs:text-[10.5px] font-semibold text-violet-500/80 dark:text-violet-400/80 mt-1 block whitespace-nowrap">Disetujui HRD</span>
            </div>

            {/* 6. Sakit (Rose / Coral Aura) */}
            <div
              onClick={() => router.push('/admin/papan-jadwal')}
              className="glass-card glass-card-hover p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-rose-400/30 dark:border-rose-500/35 hover:border-rose-400/80 hover:shadow-[0_0_25px_rgba(244,63,94,0.35)] cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-rose-500 dark:text-rose-400">
                <span className="text-[10px] xs:text-[11px] font-bold tracking-wide whitespace-nowrap">Sakit</span>
                <div className="p-1.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3xl font-black text-rose-500 dark:text-rose-400 mt-1.5 sm:mt-2 tabular-nums drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                {stats.sakit}
              </div>
              <span className="text-[10px] xs:text-[10.5px] font-semibold text-rose-500/80 dark:text-rose-400/80 mt-1 block whitespace-nowrap">Dengan Surat SKD</span>
            </div>
          </div>

          {/* Quick Action Alerts */}
          {pendingLeaves.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                  {pendingLeaves.length}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                    Permohonan Cuti / Izin Menunggu Persetujuan
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Ada {pendingLeaves.length} pengajuan dari staff yang perlu ditinjau segera.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/izin-cuti')}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shrink-0"
              >
                <span>Buka Permohonan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Monitoring Board Preview and Audit Logs Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Board Preview (2 cols) */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-5 sm:p-6 border border-white/80 dark:border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Papan Jadwal Hari Ini
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pemantauan jam rencana vs aktual masuk staff
                  </p>
                </div>
                <button
                  onClick={() => router.push('/admin/papan-jadwal')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Lihat Selengkapnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200/60 dark:border-slate-800/60 text-slate-400 font-bold whitespace-nowrap">
                      <th className="py-2.5 px-3">Pegawai</th>
                      <th className="py-2.5 px-3">Divisi</th>
                      <th className="py-2.5 px-3">Jadwal Masuk</th>
                      <th className="py-2.5 px-3">Aktual Masuk</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                    {boardData?.board?.slice(0, 6).map((item: any) => (
                      <tr key={item.employeeId} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">{item.nip}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">{item.departmentName}</td>
                        <td className="py-3 px-3 tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                          {item.plannedIn} WIB
                        </td>
                        <td className="py-3 px-3 tabular-nums font-extrabold text-slate-900 dark:text-white">
                          {item.actualIn ? `${item.actualIn} WIB` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide border shadow-xs ${
                              item.status === 'Hadir'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                : item.status === 'Terlambat'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : item.status === 'Pulang'
                                ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Log Stream (1 col) */}
            <div className="glass-card rounded-3xl p-5 border border-white/80 dark:border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Histori Audit Terbaru
                </h3>
                <button
                  onClick={() => router.push('/admin/audit-log')}
                  className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Semua
                </button>
              </div>

              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 text-xs hover:border-blue-500/40 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        {log.user_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {log.created_at?.substring(11, 16)} WIB
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {log.action}
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-1">
                      {log.details || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

