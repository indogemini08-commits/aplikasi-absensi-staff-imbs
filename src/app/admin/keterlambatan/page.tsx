'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Clock,
  User,
  Check,
  X,
  MessageSquare,
  RefreshCw,
  Search,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';

export default function AdminKeterlambatanPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [lateRecords, setLateRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeLate, setActiveLate] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<'reviewed' | 'rejected'>('reviewed');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLateRecords();
  }, []);

  const fetchLateRecords = async () => {
    setLoading(true);
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

      const res = await fetch('/api/attendance/all?status=terlambat');
      const data = await res.json();
      setLateRecords(data.records || []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const openReviewModal = (rec: any, status: 'reviewed' | 'rejected') => {
    setActiveLate(rec);
    setReviewStatus(status);
    setAdminNotes('');
    setShowModal(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/attendance/late-reason', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeLate.id, // attendance or late reason id
          status: reviewStatus,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan peninjauan');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowModal(false);
      setIsSubmitting(false);
      fetchLateRecords();
    } catch (e) {
      toast.error('Gagal memproses peninjauan');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Peninjauan Alasan Keterlambatan
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tinjau dan beri catatan terhadap alasan keterlambatan masuk kerja staff
              </p>
            </div>

            <button
              onClick={() => fetchLateRecords()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : lateRecords.length === 0 ? (
              <EmptyState
                title="Tidak Ada Keterlambatan"
                description="Semua pegawai hadir tepat waktu atau belum ada catatan keterlambatan baru."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Pegawai</th>
                      <th className="py-3.5 px-4">Jam Masuk & Telat</th>
                      <th className="py-3.5 px-4">Alasan Keterlambatan</th>
                      <th className="py-3.5 px-4">Status Tinjauan</th>
                      <th className="py-3.5 px-4 text-right">Aksi HRD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lateRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-4 font-mono font-medium">{r.date}</td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {r.employee_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {r.employee_nip} • {r.department_name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 tabular-nums">
                          <strong className="text-slate-800 dark:text-slate-200 font-bold">
                            {r.clock_in_time} WIB
                          </strong>
                          <span className="text-amber-500 font-bold block text-[10px]">
                            Terlambat +{r.clock_in_minutes_late} Menit
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-sm">
                          {r.late_reason ? (
                            <p className="text-slate-700 dark:text-slate-300 italic text-[11px] leading-relaxed">
                              "{r.late_reason}"
                            </p>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                              ⚠️ Belum mengisi alasan
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              r.late_reason_status === 'reviewed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : r.late_reason_status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {r.late_reason_status === 'reviewed'
                              ? 'Diterima'
                              : r.late_reason_status === 'rejected'
                              ? 'Ditolak'
                              : 'Menunggu Tinjauan'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openReviewModal(r, 'reviewed')}
                              className="py-1 px-2.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
                            >
                              Terima
                            </button>
                            <button
                              onClick={() => openReviewModal(r, 'rejected')}
                              className="py-1 px-2.5 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                            >
                              Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={reviewStatus === 'reviewed' ? 'Terima Alasan Keterlambatan' : 'Tolak Alasan Keterlambatan'}
      >
        <form onSubmit={handleSaveReview} className="space-y-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div><strong>Pegawai:</strong> {activeLate?.employee_name} ({activeLate?.employee_nip})</div>
            <div><strong>Terlambat:</strong> +{activeLate?.clock_in_minutes_late} Menit (Jam Masuk: {activeLate?.clock_in_time} WIB)</div>
            <div><strong>Alasan Pegawai:</strong> "{activeLate?.late_reason || '-'}"</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan HRD untuk Pegawai:
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Contoh: Diterima karena kendala cuaca ekstrem / Ditolak karena bangun terlambat..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
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
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                reviewStatus === 'reviewed' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Simpan Keputusan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

