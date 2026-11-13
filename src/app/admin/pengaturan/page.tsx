'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Save,
  RefreshCw,
  Building,
  ShieldCheck,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useToast } from '@/components/ToastContext';

export default function PengaturanPage() {
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
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Institution & Foundation Identity
  const [govName, setGovName] = useState('PEMERINTAH DAERAH KABUPATEN BOGOR');
  const [foundationName, setFoundationName] = useState('YAYASAN SABILUL HUDA NAMBO');
  const [orgName, setOrgName] = useState('IMAM MUZANI BOARDING SCHOOL');
  const [orgAddress, setOrgAddress] = useState('Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610');
  const [orgEmail, setOrgEmail] = useState('imammuzanibs@gmail.com');
  const [orgPhone, setOrgPhone] = useState('0852 8242 4628');
  const [headmasterName, setHeadmasterName] = useState('Fauzan Azhiimaa, Lc');
  const [tuName, setTuName] = useState('ALDRI WAHYUDI CHANDRA');

  // 3 Official Logos
  const [logoApp, setLogoApp] = useState('');
  const [logoInstitution, setLogoInstitution] = useState('');
  const [logoFoundation, setLogoFoundation] = useState('');

  // Attendance & GPS Rules
  const [gracePeriod, setGracePeriod] = useState('10');
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [maxGpsAccuracy, setMaxGpsAccuracy] = useState('50');
  const [defaultRadius, setDefaultRadius] = useState('100');

  // File input refs
  const logoAppInputRef = useRef<HTMLInputElement>(null);
  const logoInstitutionInputRef = useRef<HTMLInputElement>(null);
  const logoFoundationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [userRes, res] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/settings')
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

      const data = await res.json();
      if (data.settings) {
        const s = data.settings;
        if (s.gov_name) setGovName(s.gov_name);
        if (s.foundation_name) setFoundationName(s.foundation_name);
        if (s.organization_name) setOrgName(s.organization_name);
        if (s.organization_address) setOrgAddress(s.organization_address);
        if (s.organization_email) setOrgEmail(s.organization_email);
        if (s.organization_phone) setOrgPhone(s.organization_phone);
        if (s.headmaster_name) setHeadmasterName(s.headmaster_name);
        if (s.tu_name) setTuName(s.tu_name);

        if (s.logo_app) setLogoApp(s.logo_app);
        if (s.logo_institution) setLogoInstitution(s.logo_institution);
        if (s.logo_foundation) setLogoFoundation(s.logo_foundation);

        if (s.grace_period_minutes) setGracePeriod(s.grace_period_minutes);
        setRequireSelfie(s.require_selfie === '1');
        if (s.max_gps_accuracy_meters) setMaxGpsAccuracy(s.max_gps_accuracy_meters);
        if (s.default_radius_meters) setDefaultRadius(s.default_radius_meters);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Helper for image upload -> Base64
  const handleLogoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    name: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File yang diunggah harus berformat gambar (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
      toast.success(`${name} berhasil dipilih.`);
    };
    reader.onerror = () => {
      toast.error('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
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
            gov_name: govName,
            foundation_name: foundationName,
            organization_name: orgName,
            organization_address: orgAddress,
            organization_email: orgEmail,
            organization_phone: orgPhone,
            headmaster_name: headmasterName,
            tu_name: tuName,
            logo_app: logoApp,
            logo_institution: logoInstitution,
            logo_foundation: logoFoundation,
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

      toast.success(data.message || 'Pengaturan sistem & identitas lembaga berhasil disimpan');
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

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Pengaturan Sistem & Identitas Lembaga
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Konfigurasi identitas lembaga, logo resmi kop dokumen, tanda tangan laporan, dan kebijakan geofencing absensi
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. Official Logos Configuration */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-glass space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Konfigurasi 3 Logo Resmi (Aplikasi, Lembaga & Yayasan)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Logo akan terintegrasi secara dinamis pada Navbar aplikasi serta Kop Dokumen Rekap Kehadiran
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Logo 1: Logo Aplikasi */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    1. Logo Aplikasi (Navbar)
                  </span>
                  <div className="w-32 h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center overflow-hidden shadow-2xs">
                    {logoApp ? (
                      <img src={logoApp} alt="Logo Aplikasi" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 text-[10px]">
                        <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                        <span>Default Sistem</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={logoAppInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, setLogoApp, 'Logo Aplikasi')}
                  />
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => logoAppInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>Pilih File</span>
                    </button>
                    {logoApp && (
                      <button
                        type="button"
                        onClick={() => setLogoApp('')}
                        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Hapus Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Tampil pada bilah atas (navbar) sistem</p>
                </div>

                {/* Logo 2: Logo Lembaga / Sekolah (Kop Kiri) */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    2. Logo Lembaga (Kop Kiri)
                  </span>
                  <div className="w-32 h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center overflow-hidden shadow-2xs">
                    {logoInstitution ? (
                      <img src={logoInstitution} alt="Logo Lembaga" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <img src="/logo-imbs-left.png" alt="Logo IMBS" className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={logoInstitutionInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, setLogoInstitution, 'Logo Lembaga')}
                  />
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => logoInstitutionInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>Pilih File</span>
                    </button>
                    {logoInstitution && (
                      <button
                        type="button"
                        onClick={() => setLogoInstitution('')}
                        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Reset ke Default"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Tampil di sisi kiri Kop Surat Rekap Kehadiran</p>
                </div>

                {/* Logo 3: Logo Yayasan (Kop Kanan) */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. Logo Yayasan (Kop Kanan)
                  </span>
                  <div className="w-32 h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center overflow-hidden shadow-2xs">
                    {logoFoundation ? (
                      <img src={logoFoundation} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <img src="/logo-imbs-right.png" alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={logoFoundationInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, setLogoFoundation, 'Logo Yayasan')}
                  />
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => logoFoundationInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>Pilih File</span>
                    </button>
                    {logoFoundation && (
                      <button
                        type="button"
                        onClick={() => setLogoFoundation('')}
                        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Reset ke Default"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Tampil di sisi kanan Kop Surat Rekap Kehadiran</p>
                </div>
              </div>
            </div>

            {/* 2. Institutional Identity & Kop Dokumen */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-glass space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Identitas Lembaga, Yayasan & Kop Dokumen Resmi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Instansi / Pemerintah Daerah:
                  </label>
                  <input
                    type="text"
                    value={govName}
                    onChange={(e) => setGovName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: PEMERINTAH DAERAH KABUPATEN BOGOR"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Baris 1 Kop Dokumen Rekap Kehadiran
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Yayasan Naungan:
                  </label>
                  <input
                    type="text"
                    value={foundationName}
                    onChange={(e) => setFoundationName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: YAYASAN SABILUL HUDA NAMBO"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Baris 2 Kop Dokumen Rekap Kehadiran
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Resmi Lembaga / Sekolah:
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: IMAM MUZANI BOARDING SCHOOL"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Baris 3 Utama Kop Dokumen
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No Telepon / WhatsApp Resmi:
                  </label>
                  <input
                    type="text"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: 0852 8242 4628"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap Lembaga:
                </label>
                <textarea
                  rows={2}
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Resmi Lembaga:
                  </label>
                  <input
                    type="email"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="imammuzanibs@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Kepala Sekolah / Pimpinan:
                  </label>
                  <input
                    type="text"
                    value={headmasterName}
                    onChange={(e) => setHeadmasterName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Fauzan Azhiimaa, Lc"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Penandatangan Dokumen (Kiri)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Tata Usaha / Admin:
                  </label>
                  <input
                    type="text"
                    value={tuName}
                    onChange={(e) => setTuName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="ALDRI WAHYUDI CHANDRA"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Penandatangan Dokumen (Kanan)
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Attendance & Geofencing Rules */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-glass space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Aturan Kebijakan & Parameter Presensi GPS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Toleransi Keterlambatan (Menit):
                  </label>
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Staff dinyatakan telat bila absen masuk melebihi toleransi.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Radius Default Lokasi (Meter):
                  </label>
                  <input
                    type="number"
                    value={defaultRadius}
                    onChange={(e) => setDefaultRadius(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Radius geofencing default saat membuat lokasi baru.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Batas Akurasi GPS (Meter):
                  </label>
                  <input
                    type="number"
                    value={maxGpsAccuracy}
                    onChange={(e) => setMaxGpsAccuracy(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Tolak sinyal GPS jika deviasi lebih dari nilai ini.
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

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="py-3 px-8 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Seluruh Pengaturan</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
