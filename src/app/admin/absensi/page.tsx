'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Search,
  Filter,
  RefreshCw,
  Edit,
  ShieldCheck,
  MapPin,
  Check,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';
import { getWIBDateString, formatIndonesianDate } from '@/lib/date';

export default function AdminAbsensiMasterPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [search, setSearch] = useState('');

  // Correction Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [newClockIn, setNewClockIn] = useState('');
  const [newClockOut, setNewClockOut] = useState('');
  const [newStatus, setNewStatus] = useState('hadir');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [selectedDate]);

  const fetchRecords = async () => {
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

      let url = '/api/attendance/all';
      if (selectedDate) url += `?date=${selectedDate}`;

      const res = await fetch(url);
      const data = await res.json();
      setRecords(data.records || []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const openCorrectionModal = (rec: any) => {
    setActiveRecord(rec);
    setNewClockIn(rec.clock_in_time || '07:30:00');
    setNewClockOut(rec.clock_out_time || '16:00:00');
    setNewStatus(rec.clock_in_status || 'hadir');
    setCorrectionReason('');
    setShowModal(true);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason || correctionReason.trim().length < 5) {
      toast.warning('Alasan koreksi (minimal 5 karakter) wajib diisi untuk catatan audit');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/attendance/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeRecord.id,
          clockInTime: newClockIn,
          clockOutTime: newClockOut,
          clockInStatus: newStatus,
          correctionReason: correctionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan koreksi');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowModal(false);
      setIsSubmitting(false);
      fetchRecords();
    } catch (e) {
      toast.error('Gagal memproses koreksi data');
      setIsSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.employee_name.toLowerCase().includes(q) ||
      r.employee_nip.toLowerCase().includes(q) ||
      r.department_name.toLowerCase().includes(q)
    );
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
                <ClipboardCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Data Absensi Master & Audit GPS
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Data transaksi absensi digital, titik koordinat, akurasi GPS, dan koreksi manual
              </p>
            </div>

            <button
              onClick={() => fetchRecords()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Filter Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  setSelectedDate(todayStr);
                }}
                className={`py-1.5 px-3 rounded-lg font-bold text-xs transition ${
                  selectedDate === new Date().toISOString().split('T')[0]
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Hari Ini
              </button>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="py-1.5 px-3 rounded-lg font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Semua Riwayat
                </button>
              )}
            </div>

            <div className="flex-1 min-w-[200px] relative text-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari pegawai atau divisi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : filteredRecords.length === 0 ? (
              <EmptyState
                title="Tidak Ada Catatan Absensi"
                description="Belum ada data kehadiran yang tercatat untuk filter ini."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Pegawai</th>
                      <th className="py-3.5 px-4">Jam Masuk</th>
                      <th className="py-3.5 px-4">Jam Pulang</th>
                      <th className="py-3.5 px-4">Verifikasi GPS & Radius</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Koreksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRecords.map((r) => (
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
                            {r.clock_in_time || '—'}
                          </strong>
                          {r.clock_in_minutes_late > 0 && (
                            <span className="text-[10px] text-amber-500 block font-semibold">
                              +{r.clock_in_minutes_late}m
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 tabular-nums">
                          <strong className="text-slate-800 dark:text-slate-200 font-bold">
                            {r.clock_out_time || '—'}
                          </strong>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{r.in_location_name || 'Lokasi Terverifikasi'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Jarak: {Math.round(r.clock_in_distance_meters || 0)}m • Akurasi: ±{Math.round(r.clock_in_accuracy || 0)}m
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              r.clock_in_status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {r.clock_in_status === 'hadir' ? 'Hadir' : 'Terlambat'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openCorrectionModal(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Koreksi Data Absensi"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
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

      {/* Manual Correction Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Koreksi Manual Absensi: ${activeRecord?.employee_name}`}
      >
        <form onSubmit={handleSaveCorrection} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
            <strong>Catatan Kebijakan Audit:</strong> Setiap perubahan waktu atau status absensi oleh Admin wajib menyertakan alasan resmi yang akan dicatat di Histori Audit Log.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Masuk:
              </label>
              <input
                type="text"
                value={newClockIn}
                onChange={(e) => setNewClockIn(e.target.value)}
                placeholder="HH:mm:ss"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 tabular-nums"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Pulang:
              </label>
              <input
                type="text"
                value={newClockOut}
                onChange={(e) => setNewClockOut(e.target.value)}
                placeholder="HH:mm:ss"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Masuk:
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="hadir">Hadir (Tepat Waktu)</option>
              <option value="terlambat">Terlambat</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Koreksi (Wajib Diisi):
            </label>
            <textarea
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Jelaskan alasan perbaikan data..."
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
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Simpan & Rekam Audit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

