'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Calendar, Clock, Send, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/ToastContext';
import { formatIndonesianDate } from '@/lib/date';

export default function KoreksiPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState('');
  const [correctionType, setCorrectionType] = useState<'clock_in' | 'clock_out' | 'both'>('clock_in');
  const [correctedIn, setCorrectedIn] = useState('07:30');
  const [correctedOut, setCorrectedOut] = useState('16:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      const res = await fetch('/api/corrections');
      const data = await res.json();
      setCorrections(data.corrections || []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason || reason.trim().length < 5) {
      toast.warning('Silakan isi tanggal dan alasan dengan jelas (minimal 5 karakter)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          correctionType,
          correctedClockIn: correctionType !== 'clock_out' ? correctedIn : null,
          correctedClockOut: correctionType !== 'clock_in' ? correctedOut : null,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengajukan koreksi');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowModal(false);
      setReason('');
      setIsSubmitting(false);
      fetchData();
    } catch (e) {
      toast.error('Gagal mengajukan koreksi');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 md:pb-12 bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Koreksi Absensi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengajuan perbaikan jam hadir bila lupa absen
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="py-2 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan</span>
          </button>
        </div>

        {/* List of corrections */}
        {loading ? (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-slate-400 animate-pulse">
            Memuat pengajuan koreksi...
          </div>
        ) : corrections.length === 0 ? (
          <EmptyState
            title="Belum Ada Pengajuan Koreksi"
            description="Jika Anda lupa melakukan absensi masuk atau pulang, ajukan koreksi melalui tombol di atas."
          />
        ) : (
          <div className="space-y-3">
            {corrections.map((c) => (
              <div
                key={c.id}
                className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {formatIndonesianDate(c.date)}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Koreksi: {c.correction_type === 'clock_in' ? 'Jam Masuk' : c.correction_type === 'clock_out' ? 'Jam Pulang' : 'Masuk & Pulang'}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      c.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : c.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {c.status === 'approved' ? 'Disetujui' : c.status === 'rejected' ? 'Ditolak' : 'Menunggu HRD'}
                  </span>
                </div>

                <div className="text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <div className="font-semibold text-[10px] text-slate-400">Usulan Jam:</div>
                  <div>
                    {c.corrected_clock_in && <span>Masuk: {c.corrected_clock_in} WIB </span>}
                    {c.corrected_clock_out && <span>• Pulang: {c.corrected_clock_out} WIB</span>}
                  </div>
                  <div className="mt-1 text-[11px] italic">"{c.reason}"</div>
                </div>

                {c.admin_notes && (
                  <div className="text-[10px] text-slate-500 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg">
                    Catatan HRD: {c.admin_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Formulir Koreksi Absensi">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Absensi yang Dikoreksi:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Bagian yang Ingin Dikoreksi:
            </label>
            <select
              value={correctionType}
              onChange={(e: any) => setCorrectionType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="clock_in">Jam Masuk Saja</option>
              <option value="clock_out">Jam Pulang Saja</option>
              <option value="both">Keduanya (Masuk & Pulang)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {correctionType !== 'clock_out' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Jam Masuk Sebenarnya:
                </label>
                <input
                  type="time"
                  value={correctedIn}
                  onChange={(e) => setCorrectedIn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {correctionType !== 'clock_in' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Jam Pulang Sebenarnya:
                </label>
                <input
                  type="time"
                  value={correctedOut}
                  onChange={(e) => setCorrectedOut(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Alasan Pengajuan Koreksi:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Lupa melakukan tap absen pulang karena menghadiri rapat koordinasi hingga larut sore..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
              required
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
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Kirim Koreksi
            </button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}

