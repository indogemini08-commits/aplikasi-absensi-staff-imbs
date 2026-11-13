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
  Filter,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';

type TabMode = 'pending' | 'submitted' | 'all_late';

export default function AdminKeterlambatanPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<TabMode>('pending');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Review Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeLate, setActiveLate] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<'reviewed' | 'rejected'>('reviewed');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLateRecords(activeTab);
  }, [activeTab]);

  const fetchLateRecords = async (tab: TabMode) => {
    setLoading(true);
    try {
      let dataUrl = '/api/attendance/late-reason?filter=pending';
      if (tab === 'submitted') {
        dataUrl = '/api/attendance/late-reason';
      } else if (tab === 'all_late') {
        dataUrl = '/api/attendance/all?status=terlambat';
      }

      const [userRes, res] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(dataUrl),
      ]);

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
      try {
        localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
      } catch {}

      const data = res.ok ? await res.json() : {};
      if (tab === 'pending' || tab === 'submitted') {
        setRecords(data.reasons || []);
      } else {
        setRecords(data.records || []);
      }
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
          id: activeLate.id || activeLate.attendance_id,
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
      fetchLateRecords(activeTab);
    } catch (e) {
      toast.error('Gagal memproses peninjauan');
      setIsSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (r.employee_name || '').toLowerCase();
    const nip = (r.employee_nip || '').toLowerCase();
    const dept = (r.department_name || '').toLowerCase();
    const reason = (r.reason || r.late_reason || '').toLowerCase();
    return name.includes(q) || nip.includes(q) || dept.includes(q) || reason.includes(q);
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Peninjauan Alasan Keterlambatan
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tinjau pengajuan alasan keterlambatan masuk kerja yang dikirimkan oleh staff IMBS
              </p>
            </div>

            <button
              onClick={() => fetchLateRecords(activeTab)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tab Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-4 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>Menunggu Tinjauan</span>
              </button>

              <button
                onClick={() => setActiveTab('submitted')}
                className={`py-2 px-4 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'submitted'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>Semua Pengajuan</span>
              </button>

              <button
                onClick={() => setActiveTab('all_late')}
                className={`py-2 px-4 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'all_late'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>Riwayat Semua Terlambat</span>
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama, NIP, atau alasan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : filteredRecords.length === 0 ? (
              <EmptyState
                title={
                  activeTab === 'pending'
                    ? 'Tidak Ada Pengajuan Menunggu Tinjauan'
                    : activeTab === 'submitted'
                    ? 'Belum Ada Pengajuan Alasan'
                    : 'Tidak Ada Catatan Keterlambatan'
                }
                description={
                  activeTab === 'pending'
                    ? 'Seluruh alasan keterlambatan telah selesai ditinjau oleh Admin/HRD.'
                    : 'Belum ada data pengajuan alasan keterlambatan yang tercatat di sistem.'
                }
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
                    {filteredRecords.map((r) => {
                      const reasonText = r.reason || r.late_reason;
                      const statusVal = r.status || r.late_reason_status || 'pending';
                      const dateVal = r.attendance_date || r.date;
                      const clockVal = r.clock_in_time;
                      const minutesLate = r.clock_in_minutes_late;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3.5 px-4 font-mono font-medium">{dateVal}</td>

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
                              {clockVal ? `${clockVal} WIB` : '-'}
                            </strong>
                            {minutesLate > 0 && (
                              <span className="text-amber-500 font-bold block text-[10px]">
                                Terlambat +{minutesLate} Menit
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-sm">
                            {reasonText ? (
                              <div>
                                <p className="text-slate-700 dark:text-slate-300 italic text-[11px] leading-relaxed">
                                  "{reasonText}"
                                </p>
                                {r.admin_notes && (
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    Catatan HRD: {r.admin_notes}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Belum mengajukan alasan
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                statusVal === 'reviewed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : statusVal === 'rejected'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : reasonText
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {statusVal === 'reviewed'
                                ? 'Diterima'
                                : statusVal === 'rejected'
                                ? 'Ditolak'
                                : reasonText
                                ? 'Menunggu Tinjauan'
                                : 'Belum Ada Alasan'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {reasonText ? (
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
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
        <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-100">
              {activeLate?.employee_name} ({activeLate?.employee_nip})
            </div>
            <div className="text-slate-500 text-[11px]">
              Tanggal: {activeLate?.attendance_date || activeLate?.date} • Terlambat +{activeLate?.clock_in_minutes_late} Menit
            </div>
            {(activeLate?.reason || activeLate?.late_reason) && (
              <div className="text-slate-700 dark:text-slate-300 italic pt-1 border-t border-slate-200 dark:border-slate-700 mt-1">
                "{activeLate?.reason || activeLate?.late_reason}"
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Admin / HRD (Opsional):
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Berikan umpan balik atau alasan jika ditolak..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="py-2 px-4 rounded-xl font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`py-2 px-5 rounded-xl font-bold text-white shadow-md transition ${
                reviewStatus === 'reviewed'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {isSubmitting ? 'Menyimpan...' : reviewStatus === 'reviewed' ? 'Konfirmasi Terima' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
