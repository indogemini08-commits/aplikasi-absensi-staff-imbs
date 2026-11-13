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
  const [boardData, setBoardData] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingLates, setPendingLates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  const fetchAdminDashboard = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      if (userData.user.role === 'staff') {
        router.push('/dashboard');
        return;
      }
      setUser(userData.user);

      // Fetch dashboard metrics in parallel
      const [boardRes, leaveRes, auditRes] = await Promise.all([
        fetch('/api/schedules/board'),
        fetch('/api/leave?status=pending'),
        fetch('/api/audit-logs'),
      ]);

      const [boardJson, leaveJson, auditJson] = await Promise.all([
        boardRes.ok ? boardRes.json() : Promise.resolve({ stats: {}, items: [] }),
        leaveRes.ok ? leaveRes.json() : Promise.resolve({ requests: [] }),
        auditRes.ok ? auditRes.json() : Promise.resolve({ logs: [] }),
      ]);

      setBoardData(boardJson);
      setPendingLeaves(leaveJson.requests || []);
      setAuditLogs(auditJson.logs?.slice(0, 5) || []);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16]">
        <Navbar user={user} />
        <div className="flex flex-1">
          <Sidebar userRole={user?.role} />
          <main className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-4 gap-4">
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Executive Header Banner */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/60 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Panel Pemantauan Eksekutif HRD</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Dashboard Kehadiran Staff IMBS
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Data real-time hari ini: {boardData?.formattedDate} • Zona Waktu: Asia/Jakarta (WIB)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/admin/papan-jadwal')}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Buka Papan Jadwal</span>
              </button>
              <button
                onClick={() => router.push('/admin/laporan')}
                className="py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Rekap Laporan</span>
              </button>
            </div>
          </div>

          {/* Real-time Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div
              onClick={() => router.push('/admin/pegawai')}
              className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-emerald-500/50 transition group"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold">Total Pegawai</span>
                <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
                {stats.totalEmployees}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Aktif Bertugas</span>
            </div>

            <div
              onClick={() => router.push('/admin/papan-jadwal?status=hadir')}
              className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-emerald-500/50 transition group"
            >
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="text-[11px] font-semibold">Sudah Hadir</span>
                <CalendarCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {stats.hadir}
              </div>
              <span className="text-[10px] text-emerald-600/70 mt-1 block">Tercatat di Lokasi</span>
            </div>

            <div
              onClick={() => router.push('/admin/keterlambatan')}
              className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-amber-500/50 transition group"
            >
              <div className="flex items-center justify-between text-amber-500">
                <span className="text-[11px] font-semibold">Terlambat</span>
                <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-amber-500 mt-2">
                {stats.terlambat}
              </div>
              <span className="text-[10px] text-amber-500/70 mt-1 block">Lewat Grace Period</span>
            </div>

            <div
              onClick={() => router.push('/admin/papan-jadwal?status=belum absen')}
              className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-slate-400 transition group"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">Belum Absen</span>
                <Clock className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-2">
                {stats.belumAbsen}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Menunggu Clock-In</span>
            </div>

            <div
              onClick={() => router.push('/admin/izin-cuti')}
              className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-purple-500/50 transition group"
            >
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                <span className="text-[11px] font-semibold">Cuti / Izin</span>
                <FileCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
                {stats.cuti + stats.izin}
              </div>
              <span className="text-[10px] text-purple-500/70 mt-1 block">Disetujui HRD</span>
            </div>

            <div
              onClick={() => router.push('/admin/papan-jadwal')}
              className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-indigo-500/50 transition group"
            >
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                <span className="text-[11px] font-semibold">Sakit</span>
                <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                {stats.sakit}
              </div>
              <span className="text-[10px] text-indigo-500/70 mt-1 block">Dengan Surat SKD</span>
            </div>
          </div>

          {/* Quick Action Alerts */}
          {pendingLeaves.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
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
                className="py-2 px-3.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition flex items-center gap-1.5"
              >
                <span>Buka Permohonan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Monitoring Board Preview and Audit Logs Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Board Preview (2 cols) */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-glass space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-emerald-600" />
                    Papan Jadwal Hari Ini
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pemantauan jam rencana vs aktual masuk staff
                  </p>
                </div>
                <button
                  onClick={() => router.push('/admin/papan-jadwal')}
                  className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  Lihat Selengkapnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/60 dark:border-slate-800/60 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Pegawai</th>
                      <th className="py-2.5 px-3">Divisi</th>
                      <th className="py-2.5 px-3">Jadwal Masuk</th>
                      <th className="py-2.5 px-3">Aktual Masuk</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {boardData?.board?.slice(0, 6).map((item: any) => (
                      <tr key={item.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{item.nip}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{item.departmentName}</td>
                        <td className="py-3 px-3 tabular-nums font-medium text-slate-600 dark:text-slate-300">
                          {item.plannedIn} WIB
                        </td>
                        <td className="py-3 px-3 tabular-nums font-bold text-slate-800 dark:text-slate-100">
                          {item.actualIn ? `${item.actualIn} WIB` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              item.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.status === 'Terlambat'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : item.status === 'Pulang'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
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
            <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-glass space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Histori Audit Terbaru
                </h3>
                <button
                  onClick={() => router.push('/admin/audit-log')}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Semua
                </button>
              </div>

              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.user_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {log.created_at?.substring(11, 16)} WIB
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {log.action}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1">
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

