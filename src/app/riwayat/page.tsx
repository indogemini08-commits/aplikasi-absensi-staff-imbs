'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  Send,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';
import { useDataSync, broadcastDataChange } from '@/lib/sync';

export default function RiwayatPage() {
  const router = useRouter();
  const toast = useToast();

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
  const [records, setRecords] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_history_records');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [summary, setSummary] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_history_summary');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_history_records');
    }
    return true;
  });

  // Month filter (default to current month YYYY-MM)
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Late reason modal state
  const [showLateModal, setShowLateModal] = useState(false);
  const [activeAttendanceId, setActiveAttendanceId] = useState<string | null>(null);
  const [lateReasonText, setLateReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [selectedMonth]);

  useDataSync(() => {
    fetchHistory();
  }, ['attendance']);

  const fetchHistory = async () => {
    try {
      const [userRes, dataRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch(`/api/attendance/history?month=${selectedMonth}`, { cache: 'no-store' })
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

      if (dataRes.ok) {
        const data = await dataRes.json();
        const recList = data.records || [];
        setRecords(recList);
        setSummary(data.summary || null);
        if (typeof window !== 'undefined' && selectedMonth === currentMonthStr) {
          try {
            if (recList.length === 0) {
              sessionStorage.removeItem('imbs_history_records');
              sessionStorage.removeItem('imbs_history_summary');
            } else {
              sessionStorage.setItem('imbs_history_records', JSON.stringify(recList));
              sessionStorage.setItem('imbs_history_summary', JSON.stringify(data.summary || null));
            }
          } catch {}
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleOpenLateModal = (record: any) => {
    setActiveAttendanceId(record.id);
    setLateReasonText(record.lateReason || '');
    setShowLateModal(true);
  };

  const handleSubmitLateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateReasonText || lateReasonText.trim().length < 5) {
      toast.warning('Silakan isi alasan minimal 5 karakter');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/attendance/late-reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: activeAttendanceId,
          reason: lateReasonText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengirim alasan');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowLateModal(false);
      setIsSubmitting(false);
      broadcastDataChange('attendance');
      fetchHistory();
    } catch (e) {
      toast.error('Gagal mengirim alasan keterlambatan');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 md:pb-12 bg-transparent">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-5 md:py-8 space-y-5">
        {/* Header and Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Riwayat Absensi Saya
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catatan jam kerja masuk dan pulang digital resmi IMBS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Monthly Summary Badges */}
        {summary && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="glass-card p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-semibold">Hadir Tepat</span>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                {summary.totalHadir}
              </div>
            </div>
            <div className="glass-card p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-semibold">Terlambat</span>
              <div className="text-lg font-black text-amber-500">
                {summary.totalTerlambat}
              </div>
            </div>
            <div className="glass-card p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-semibold">Izin</span>
              <div className="text-lg font-black text-cyan-600">
                {summary.totalIzin}
              </div>
            </div>
            <div className="glass-card p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-semibold">Sakit</span>
              <div className="text-lg font-black text-indigo-600">
                {summary.totalSakit}
              </div>
            </div>
            <div className="glass-card p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 col-span-3 sm:col-span-1">
              <span className="text-[10px] text-slate-500 font-semibold">Cuti</span>
              <div className="text-lg font-black text-purple-600">
                {summary.totalCuti}
              </div>
            </div>
          </div>
        )}

        {/* Records List / Cards */}
        {loading ? (
          <SkeletonTable />
        ) : records.length === 0 ? (
          <EmptyState
            title="Tidak Ada Catatan Absensi"
            description={`Belum ada data absensi yang tercatat untuk bulan ${selectedMonth}.`}
          />
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const isLate = r.clockInStatus === 'terlambat';

              return (
                <div
                  key={r.id}
                  className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 transition-all hover:border-blue-500/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {r.formattedDate}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {r.date}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isLate
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                      }`}
                    >
                      {isLate ? `Terlambat (+${r.minutesLate}m)` : 'Hadir Tepat'}
                    </span>
                  </div>

                  {/* Attendance detail columns */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Absen Masuk</div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                        {r.clockInTime ? `${r.clockInTime} WIB` : '—'}
                      </div>
                      {r.clockInLocation && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          📍 {r.clockInLocation} ({Math.round(r.clockInDistance || 0)}m)
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Absen Pulang</div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                        {r.clockOutTime ? `${r.clockOutTime} WIB` : 'Belum Absen Pulang'}
                      </div>
                      {r.clockOutLocation && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          📍 {r.clockOutLocation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Late Reason Banner if applicable */}
                  {isLate && (
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Alasan Keterlambatan:
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border">
                          {r.lateReasonStatus === 'reviewed'
                            ? '✓ Diterima HRD'
                            : r.lateReasonStatus === 'rejected'
                            ? '✕ Ditolak'
                            : r.lateReason
                            ? '⏳ Menunggu Tinjauan'
                            : '⚠️ Belum Mengisi'}
                        </span>
                      </div>

                      {r.lateReason ? (
                        <p className="text-slate-700 dark:text-slate-300 italic text-[11px] mt-1">
                          "{r.lateReason}"
                        </p>
                      ) : (
                        <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                          Anda belum mengisi alasan keterlambatan untuk tanggal ini.
                        </p>
                      )}

                      {r.lateAdminNotes && (
                        <div className="mt-1.5 text-[10px] text-slate-500 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded">
                          Catatan HRD: {r.lateAdminNotes}
                        </div>
                      )}

                      {/* Edit or Submit Reason button */}
                      {(!r.lateReason || r.lateReasonStatus === 'pending') && (
                        <button
                          onClick={() => handleOpenLateModal(r)}
                          className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          {r.lateReason ? 'Ubah Alasan' : 'Isi Alasan Sekarang'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Late Reason Submission Modal */}
      <Modal
        isOpen={showLateModal}
        onClose={() => setShowLateModal(false)}
        title="Formulir Alasan Keterlambatan"
      >
        <form onSubmit={handleSubmitLateReason} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Sampaikan penyebab kendala yang membuat Anda datang melewati batas toleransi jam masuk kerja.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Alasan Terlambat:
            </label>
            <textarea
              rows={4}
              value={lateReasonText}
              onChange={(e) => setLateReasonText(e.target.value)}
              placeholder="Tuliskan kendala Anda secara rinci..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLateModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Kirim Alasan
            </button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}

