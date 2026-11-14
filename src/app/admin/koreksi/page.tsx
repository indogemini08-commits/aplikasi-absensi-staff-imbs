'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Clock,
  User,
  Check,
  X,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';
import { formatIndonesianDate } from '@/lib/date';
import { useDataSync, broadcastDataChange } from '@/lib/sync';

export default function AdminKoreksiPage() {
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
  const [corrections, setCorrections] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_corrections_list');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_corrections_list');
    }
    return true;
  });

  // Decision Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeCorr, setActiveCorr] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCorrections();
  }, []);

  useDataSync(() => {
    fetchCorrections();
  }, ['attendance', 'corrections']);

  const fetchCorrections = async () => {
    try {
      const [userRes, dataRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/corrections', { cache: 'no-store' })
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
        localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
      }

      if (dataRes.ok) {
        const data = await dataRes.json();
        const corrList = data.corrections || [];
        setCorrections(corrList);
        if (typeof window !== 'undefined') {
          try {
            if (corrList.length === 0) {
              sessionStorage.removeItem('imbs_corrections_list');
            } else {
              sessionStorage.setItem('imbs_corrections_list', JSON.stringify(corrList));
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

  const openDecisionModal = (corr: any, type: 'approve' | 'reject') => {
    setActiveCorr(corr);
    setActionType(type);
    setNotes('');
    setShowModal(true);
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/corrections/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeCorr.id,
          action: actionType,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal memproses koreksi');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowModal(false);
      setIsSubmitting(false);
      broadcastDataChange('corrections');
      fetchCorrections();
    } catch (e) {
      toast.error('Gagal memproses keputusan koreksi');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Persetujuan Koreksi Absensi
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tinjau permohonan koreksi jam hadir staff karena lupa tap masuk/pulang
              </p>
            </div>

            <button
              onClick={() => fetchCorrections()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : corrections.length === 0 ? (
              <EmptyState
                title="Tidak Ada Pengajuan Koreksi"
                description="Semua permohonan koreksi absensi sudah selesai diproses."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Pegawai</th>
                      <th className="py-3.5 px-4">Tanggal Koreksi</th>
                      <th className="py-3.5 px-4">Bagian & Usulan Jam</th>
                      <th className="py-3.5 px-4">Alasan Pegawai</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi HRD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {corrections.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {c.employee_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {c.employee_nip} • {c.department_name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium">
                          {c.date}
                        </td>

                        <td className="py-3.5 px-4 tabular-nums">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {c.correction_type === 'clock_in' ? 'Masuk Saja' : c.correction_type === 'clock_out' ? 'Pulang Saja' : 'Masuk & Pulang'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {c.corrected_clock_in && <span>In: {c.corrected_clock_in} </span>}
                            {c.corrected_clock_out && <span>Out: {c.corrected_clock_out}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-700 dark:text-slate-300 italic text-[11px] line-clamp-2">
                            "{c.reason}"
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              c.status === 'approved'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : c.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {c.status === 'approved' ? 'Disetujui' : c.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {c.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openDecisionModal(c, 'approve')}
                                className="py-1 px-2.5 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => openDecisionModal(c, 'reject')}
                                className="py-1 px-2.5 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Oleh: {c.approver_name || 'HRD'}
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
        title={actionType === 'approve' ? 'Setujui Koreksi Absensi' : 'Tolak Koreksi Absensi'}
      >
        <form onSubmit={handleDecision} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div><strong>Pegawai:</strong> {activeCorr?.employee_name} ({activeCorr?.employee_nip})</div>
            <div><strong>Tanggal:</strong> {activeCorr?.date}</div>
            <div><strong>Jam yang Diusulkan:</strong> In: {activeCorr?.corrected_clock_in || '-'} • Out: {activeCorr?.corrected_clock_out || '-'}</div>
            <div><strong>Alasan Pegawai:</strong> "{activeCorr?.reason}"</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Admin:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan untuk pegawai..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
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
                actionType === 'approve' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {actionType === 'approve' ? 'Konfirmasi Koreksi' : 'Konfirmasi Penolakan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

