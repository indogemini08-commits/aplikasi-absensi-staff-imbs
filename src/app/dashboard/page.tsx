'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { formatIndonesianDate } from '@/lib/date';
import { useDataSync } from '@/lib/sync';

export default function StaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [statusData, setStatusData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_staff_status');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [historySummary, setHistorySummary] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_staff_history_summary');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [recentRecords, setRecentRecords] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_staff_recent_records');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_staff_status');
    }
    return true;
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useDataSync(() => {
    fetchDashboardData();
  });

  const fetchDashboardData = async () => {
    try {
      const [userRes, statusRes, histRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/attendance/status', { cache: 'no-store' }),
        fetch('/api/attendance/history', { cache: 'no-store' })
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
      }

      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setStatusData(statusJson);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('imbs_staff_status', JSON.stringify(statusJson));
          } catch {}
        }
      } else {
        setStatusData(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('imbs_staff_status');
        }
      }

      if (histRes.ok) {
        const histJson = await histRes.json();
        setHistorySummary(histJson.summary);
        const recs = histJson.records?.slice(0, 5) || [];
        setRecentRecords(recs);
        if (typeof window !== 'undefined') {
          try {
            if (recs.length === 0) {
              sessionStorage.removeItem('imbs_staff_recent_records');
              sessionStorage.removeItem('imbs_staff_history_summary');
            } else {
              sessionStorage.setItem('imbs_staff_history_summary', JSON.stringify(histJson.summary));
              sessionStorage.setItem('imbs_staff_recent_records', JSON.stringify(recs));
            }
          } catch {}
        }
      } else {
        setRecentRecords([]);
        setHistorySummary(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('imbs_staff_recent_records');
          sessionStorage.removeItem('imbs_staff_history_summary');
        }
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <Navbar user={user} />
        <main className="max-w-md mx-auto p-4 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </main>
        <BottomNav />
      </div>
    );
  }

  const att = statusData?.attendance;
  const isClockedIn = att?.isClockedIn;
  const isClockedOut = att?.isClockedOut;
  const schedule = statusData?.schedule;

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-transparent">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-5 md:py-8 space-y-5">
        {/* Employee Greeting Header */}
        <div className="glass-card rounded-3xl p-5 md:p-6 border border-white/80 dark:border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Ambient corner light */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200/60 dark:border-blue-800/60 mb-2 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap">{statusData?.formattedDate}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Assalamu’alaikum, {user?.name || 'Staff'}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">
                {user?.position} • Divisi {user?.departmentName}
              </p>
            </div>

            {/* Attendance Status Badge (Always single-line, no wrap) */}
            <div className="flex items-center gap-2.5 p-3 px-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shrink-0 self-start md:self-center shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Status Hari Ini:
              </span>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 ${
                  isClockedOut
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                    : isClockedIn
                    ? att.clockInStatus === 'terlambat'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isClockedOut
                  ? 'Sudah Absen Pulang'
                  : isClockedIn
                  ? att.clockInStatus === 'terlambat'
                    ? 'Hadir (Terlambat)'
                    : 'Sudah Absen Masuk'
                  : 'Belum Melakukan Absen'}
              </span>
            </div>
          </div>
        </div>

        {/* Warning if Late Reason is pending */}
        {statusData?.pendingLateReason && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                Alasan Keterlambatan Wajib Diisi
              </h4>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                Anda tercatat terlambat {att.minutesLate} menit hari ini. Mohon segera lengkapi formulir alasan keterlambatan.
              </p>
              <button
                onClick={() => router.push('/absensi')}
                className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition inline-flex items-center gap-1"
              >
                Isi Formulir Alasan
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Big Main Clock-In/Out Quick Card */}
        <div className="glass-card rounded-3xl p-5 md:p-6 border border-white/80 dark:border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Jadwal Kerja Hari Ini
              </h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
              {schedule?.shiftName || 'Reguler Pagi'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Jam Masuk Terjadwal
              </div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                {schedule?.startTime || '07:30'} WIB
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Toleransi: +{schedule?.graceMinutes || 10} mnt
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Jam Pulang Terjadwal
              </div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                {schedule?.endTime || '16:00'} WIB
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Istirahat: {schedule?.breakStart || '12:00'} - {schedule?.breakEnd || '13:00'}
              </div>
            </div>
          </div>

          {/* Actual Logged Times if any */}
          {(isClockedIn || isClockedOut) && (
            <div className="mb-5 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Masuk: </span>
                <strong className="text-blue-700 dark:text-blue-300 font-bold tabular-nums">
                  {att.clockInTime || '-'} WIB
                </strong>
                {att.clockInLocation && (
                  <span className="text-[11px] text-slate-500 block truncate max-w-[160px]">
                    📍 {att.clockInLocation}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Pulang: </span>
                <strong className="text-blue-700 dark:text-blue-300 font-bold tabular-nums">
                  {att.clockOutTime ? `${att.clockOutTime} WIB` : 'Belum Pulang'}
                </strong>
              </div>
            </div>
          )}

          {/* CTA Action Button to Clock In / Out Page */}
          <button
            onClick={() => router.push('/absensi')}
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm text-white shadow-lg active:scale-98 transition flex items-center justify-center gap-3 cursor-pointer ${
              isClockedOut
                ? 'bg-slate-700 hover:bg-slate-600'
                : isClockedIn
                ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 shadow-blue-600/35 neon-glow-blue'
                : 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 shadow-blue-600/35 neon-glow-blue'
            }`}
          >
            <MapPin className="w-5 h-5 animate-bounce" />
            <span>
              {isClockedOut
                ? 'Lihat Detail Absensi Hari Ini'
                : isClockedIn
                ? 'Lakukan Absen Pulang Sekarang'
                : 'Buka Halaman Absen Masuk (GPS)'}
            </span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Monthly Attendance Recap Counters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Ringkasan Kehadiran Bulan Ini
            </h3>
            <button
              onClick={() => router.push('/riwayat')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              Lihat Riwayat
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            <div className="glass-card glass-card-hover p-3.5 rounded-2xl text-center border border-blue-400/30 dark:border-blue-500/30 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Hadir Tepat
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums drop-shadow-[0_0_8px_rgba(37, 99, 235,0.3)]">
                {historySummary?.totalHadir || 0}
              </div>
            </div>

            <div className="glass-card glass-card-hover p-3.5 rounded-2xl text-center border border-amber-400/30 dark:border-amber-500/30 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Terlambat
              </div>
              <div className="text-xl font-black text-amber-500 mt-1">
                {historySummary?.totalTerlambat || 0}
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl text-center border border-slate-200/80 dark:border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Izin
              </div>
              <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                {historySummary?.totalIzin || 0}
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl text-center border border-slate-200/80 dark:border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Sakit
              </div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {historySummary?.totalSakit || 0}
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl text-center border border-slate-200/80 dark:border-slate-800/80 col-span-3 sm:col-span-1">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Cuti
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {historySummary?.totalCuti || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Attendance Records Card */}
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Catatan Absensi Terakhir
            </h3>
            <button
              onClick={() => router.push('/riwayat')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Semua
            </button>
          </div>

          {recentRecords.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat"
              description="Catatan kehadiran Anda akan otomatis muncul di sini setelah melakukan absensi."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentRecords.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {r.formattedDate}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Masuk: {r.clockInTime || '-'}</span>
                      <span>•</span>
                      <span>Pulang: {r.clockOutTime || '-'}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      r.clockInStatus === 'terlambat'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                    }`}
                  >
                    {r.clockInStatus === 'terlambat' ? `Terlambat (+${r.minutesLate}m)` : 'Hadir Tepat'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

