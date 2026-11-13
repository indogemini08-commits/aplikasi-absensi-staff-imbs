'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck2,
  Calendar,
  User,
  Check,
  X,
  RefreshCw,
  Clock,
  Coins,
  MessageSquare,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';

export default function AdminIzinCutiPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Decision Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeReq, setActiveReq] = useState<any>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
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

      let url = '/api/leave';
      if (statusFilter) url += `?status=${statusFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      setRequests(data.requests || []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const openDecisionModal = (req: any, action: 'approve' | 'reject') => {
    setActiveReq(req);
    setDecisionAction(action);
    setNotes('');
    setShowModal(true);
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leave/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: activeReq.id,
          action: decisionAction,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal memproses permohonan');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowModal(false);
      setIsSubmitting(false);
      fetchRequests();
    } catch (e) {
      toast.error('Gagal memproses keputusan');
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
                <FileCheck2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Persetujuan Izin & Cuti Staff
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tinjau permohonan izin tidak masuk, cuti tahunan, dan sakit dari pegawai IMBS
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'glass-card text-slate-600 dark:text-slate-300'
                }`}
              >
                Menunggu Tinjauan
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'glass-card text-slate-600 dark:text-slate-300'
                }`}
              >
                Disetujui
              </button>
              <button
                onClick={() => setStatusFilter('')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  statusFilter === ''
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'glass-card text-slate-600 dark:text-slate-300'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {/* List of Requests */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : requests.length === 0 ? (
              <EmptyState
                title="Tidak Ada Permohonan"
                description={`Tidak ada permohonan izin/cuti dengan status ${statusFilter || 'terpilih'}.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Pegawai</th>
                      <th className="py-3.5 px-4">Jenis Permohonan</th>
                      <th className="py-3.5 px-4">Rentang Tanggal</th>
                      <th className="py-3.5 px-4">Durasi</th>
                      <th className="py-3.5 px-4">Alasan & Kontak</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Keputusan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {r.employee_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {r.employee_nip} • {r.department_name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {r.leave_type_name}
                          </div>
                          {r.deducts_leave_balance === 1 && (
                            <span className="text-[10px] text-amber-500 font-medium">
                              (Potong Cuti Tahunan)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {r.start_date} s/d {r.end_date}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                          {r.total_days} Hari
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-2">
                            "{r.reason}"
                          </p>
                          {r.emergency_contact && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Kontak: {r.emergency_contact}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              r.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : r.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {r.status === 'approved' ? 'Disetujui' : r.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {r.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openDecisionModal(r, 'approve')}
                                className="py-1 px-2.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => openDecisionModal(r, 'reject')}
                                className="py-1 px-2.5 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Oleh: {r.approver_name || 'HRD'}
                            </span>
                          )}
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

      {/* Decision Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={decisionAction === 'approve' ? 'Setujui Permohonan Cuti' : 'Tolak Permohonan Cuti'}
      >
        <form onSubmit={handleDecision} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div><strong>Pegawai:</strong> {activeReq?.employee_name} ({activeReq?.employee_nip})</div>
            <div><strong>Jenis:</strong> {activeReq?.leave_type_name} ({activeReq?.total_days} hari)</div>
            <div><strong>Tanggal:</strong> {activeReq?.start_date} s/d {activeReq?.end_date}</div>
            <div><strong>Alasan:</strong> "{activeReq?.reason}"</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan HRD (Opsional untuk persetujuan, Wajib jika ditolak):
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={decisionAction === 'approve' ? 'Disetujui sesuai ketentuan lembaga...' : 'Jelaskan alasan penolakan...'}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
              required={decisionAction === 'reject'}
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
                decisionAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {decisionAction === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

