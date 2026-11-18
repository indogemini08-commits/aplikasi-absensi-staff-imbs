'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Calendar,
  Clock,
  Plus,
  Send,
  AlertCircle,
  CheckCircle2,
  Coins,
  Paperclip,
  X,
  RefreshCw,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/ToastContext';
import { calculateDaysBetween } from '@/lib/date';
import { useDataSync, broadcastDataChange } from '@/lib/sync';

export default function IzinPage() {
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
  const [requests, setRequests] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_staff_leaves');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_staff_balance');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_staff_leaves');
    }
    return true;
  });

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLeaveData();
  }, []);

  useDataSync(() => {
    fetchLeaveData();
  }, ['leave']);

  const fetchLeaveData = async () => {
    try {
      const [userRes, res] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/leave', { cache: 'no-store' })
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
      const data = await res.json();
      const reqList = data.requests || [];
      setRequests(reqList);
      setLeaveTypes(data.leaveTypes || []);
      setBalance(data.balance || null);

      if (typeof window !== 'undefined') {
        try {
          if (reqList.length === 0) {
            sessionStorage.removeItem('imbs_staff_leaves');
            sessionStorage.removeItem('imbs_staff_balance');
          } else {
            sessionStorage.setItem('imbs_staff_leaves', JSON.stringify(reqList));
            sessionStorage.setItem('imbs_staff_balance', JSON.stringify(data.balance || null));
          }
        } catch {}
      }

      if (data.leaveTypes && data.leaveTypes.length > 0) {
        setLeaveTypeId(data.leaveTypes[0].id);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Recalculate days when start or end changes
  useEffect(() => {
    if (startDate && endDate) {
      if (startDate <= endDate) {
        const days = calculateDaysBetween(startDate, endDate);
        setCalculatedDays(days);
      } else {
        setCalculatedDays(0);
      }
    } else {
      setCalculatedDays(0);
    }
  }, [startDate, endDate]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || !reason) {
      toast.warning('Silakan lengkapi semua data formulir');
      return;
    }

    if (startDate > endDate) {
      toast.warning('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveTypeId,
          startDate,
          endDate,
          reason,
          emergencyContact,
          attachmentUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengajukan izin/cuti');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowModal(false);
      setReason('');
      setEmergencyContact('');
      setAttachmentUrl('');
      setIsSubmitting(false);
      broadcastDataChange('leave');
      fetchLeaveData();
    } catch (e) {
      toast.error('Gagal mengirimkan permohonan');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-transparent">
      <Navbar user={user} />

      <main className="flex-1 w-full min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden app-scroll-container">
        <div className="max-w-4xl mx-auto px-4 py-5 md:py-8 pb-28 md:pb-12 space-y-5">
        {/* Header & Submit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Pengajuan Izin & Cuti
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola permohonan ketidakhadiran, sakit, dan cuti tahunan
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="self-start sm:self-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengajuan Baru</span>
          </button>
        </div>

        {/* Leave Balance Overview Card */}
        {balance && (
          <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Saldo Cuti Tahunan ({balance.year})
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <div className="text-[10.5px] text-slate-500 font-semibold whitespace-nowrap">Alokasi Awal</div>
                <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 whitespace-nowrap">
                  {balance.allocated_days} <span className="text-xs font-normal text-slate-400">hari</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <div className="text-[10.5px] text-slate-500 font-semibold whitespace-nowrap">Terpakai</div>
                <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 whitespace-nowrap">
                  {balance.used_days} <span className="text-xs font-normal text-slate-400">hari</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <div className="text-[10.5px] text-amber-600 font-semibold whitespace-nowrap">Menunggu</div>
                <div className="text-lg font-black text-amber-600 mt-0.5 whitespace-nowrap">
                  {balance.pending_days} <span className="text-xs font-normal text-slate-400">hari</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60">
                <div className="text-[10.5px] text-blue-700 dark:text-blue-400 font-semibold whitespace-nowrap">Sisa Saldo</div>
                <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5 whitespace-nowrap">
                  {balance.remaining_days} <span className="text-xs font-normal text-blue-600/70">hari</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Riwayat Permohonan Saya
          </h3>

          {loading ? (
            <div className="glass-card rounded-2xl p-6 text-center text-xs text-slate-400 animate-pulse">
              Memuat data pengajuan...
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="Belum Ada Pengajuan Izin/Cuti"
              description="Anda belum pernah mengajukan izin atau cuti. Klik tombol di atas untuk membuat pengajuan baru."
              action={{
                label: 'Ajukan Izin / Cuti Sekarang',
                onClick: () => setShowModal(true),
              }}
            />
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {r.leave_type_name}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {r.total_days} Hari
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {r.formattedStartDate} s/d {r.formattedEndDate}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 ${
                        r.status === 'approved'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          : r.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}
                    >
                      {r.status === 'approved'
                        ? 'Disetujui'
                        : r.status === 'rejected'
                        ? 'Ditolak'
                        : 'Menunggu HRD'}
                    </span>
                  </div>

                  <div className="text-xs bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Alasan:</span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{r.reason}</p>
                  </div>

                  {r.status === 'rejected' && r.rejection_reason && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
                      <strong>Catatan Penolakan HRD:</strong> {r.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </main>

      {/* New Leave Request Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Buat Pengajuan Izin / Cuti"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenis Permohonan:
            </label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} {lt.deducts_leave_balance === 1 ? '(Mengurangi Saldo Cuti)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Mulai:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Selesai:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {calculatedDays > 0 && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 font-semibold">
              <span>Total Durasi:</span>
              <span className="text-sm font-black">{calculatedDays} Hari</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Alasan / Keterangan:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan izin atau keperluan cuti..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kontak Darurat Selama Izin (Opsional):
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Contoh: No HP keluarga / kerabat 0812..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Kirim Permohonan
            </button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}

