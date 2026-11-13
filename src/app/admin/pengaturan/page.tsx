'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, RefreshCw, Building, ShieldCheck, MapPin, Camera } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useToast } from '@/components/ToastContext';

export default function PengaturanPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings values
  const [orgName, setOrgName] = useState('IMBS (Insan Mandiri Boarding School & Institute)');
  const [orgAddress, setOrgAddress] = useState('Jl. Raya Cendekia No. 88, Cibubur, Jakarta Timur');
  const [gracePeriod, setGracePeriod] = useState('10');
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [maxGpsAccuracy, setMaxGpsAccuracy] = useState('50');
  const [defaultRadius, setDefaultRadius] = useState('100');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
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

      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setOrgName(data.settings.organization_name || 'IMBS');
        setOrgAddress(data.settings.organization_address || '');
        setGracePeriod(data.settings.grace_period_minutes || '10');
        setRequireSelfie(data.settings.require_selfie === '1');
        setMaxGpsAccuracy(data.settings.max_gps_accuracy_meters || '50');
        setDefaultRadius(data.settings.default_radius_meters || '100');
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            organization_name: orgName,
            organization_address: orgAddress,
            grace_period_minutes: gracePeriod,
            require_selfie: requireSelfie ? '1' : '0',
            max_gps_accuracy_meters: maxGpsAccuracy,
            default_radius_meters: defaultRadius,
            timezone: 'Asia/Jakarta',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan pengaturan');
        setIsSaving(false);
        return;
      }

      toast.success(data.message);
      setIsSaving(false);
    } catch (e) {
      toast.error('Gagal menyimpan pengaturan');
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Pengaturan Sistem & Kebijakan Presensi
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Konfigurasi profil yayasan, aturan keterlambatan, toleransi, dan parameter geofencing
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Organization Identity */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-glass space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                Identitas Lembaga / Yayasan
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Resmi Lembaga:
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Kampus / Kantor:
                </label>
                <textarea
                  rows={2}
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Attendance & Geofencing Rules */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-glass space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Aturan & Parameter Absensi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Toleransi Keterlambatan Default (Menit):
                  </label>
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Staff dinyatakan terlambat jika absen masuk melewati toleransi ini.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Batas Akurasi Maksimal GPS (Meter):
                  </label>
                  <input
                    type="number"
                    value={maxGpsAccuracy}
                    onChange={(e) => setMaxGpsAccuracy(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Akurasi GPS di atas nilai ini akan ditolak agar mencegah manipulasi.
                  </span>
                </div>
              </div>

              {/* Require Selfie Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-indigo-500" />
                  <div>
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                      Wajibkan Foto Selfie Saat Absensi
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mengaktifkan kamera selfie sebagai verifikasi tambahan kehadiran pegawai
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireSelfie}
                    onChange={(e) => setRequireSelfie(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Timezone Info */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200">
                <strong>Zona Waktu Resmi Aplikasi:</strong> Asia/Jakarta (WIB, UTC+7). Seluruh jam transaksi, toleransi, dan pelaporan selalu dihitung menggunakan zona waktu ini.
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="py-3 px-6 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

