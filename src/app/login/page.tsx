'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Clock,
  KeyRound,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Building2,
} from 'lucide-react';
import { useToast } from '@/components/ToastContext';
import ThemeToggle from '@/components/ThemeToggle';
import { invalidateMasterCache } from '@/lib/sync';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appLogo, setAppLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('imbs_app_logo') || sessionStorage.getItem('imbs_app_logo') || '/logo-imbs-left.png';
      } catch {}
    }
    return '/logo-imbs-left.png';
  });
  const [orgName, setOrgName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('imbs_app_org_name') || sessionStorage.getItem('imbs_app_org_name') || 'IMAM MUZANI BOARDING SCHOOL';
      } catch {}
    }
    return 'IMAM MUZANI BOARDING SCHOOL';
  });
  const [foundationName, setFoundationName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('imbs_app_foundation_name') || sessionStorage.getItem('imbs_app_foundation_name') || 'YAYASAN SABILUL HUDA NAMBO';
      } catch {}
    }
    return 'YAYASAN SABILUL HUDA NAMBO';
  });

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          const s = data.settings;
          const logo = s.logo_app || s.logo_institution || '/logo-imbs-left.png';
          const name = s.organization_name || 'IMAM MUZANI BOARDING SCHOOL';
          const foundation = s.foundation_name || 'YAYASAN SABILUL HUDA NAMBO';
          if (logo) {
            setAppLogo(logo);
            try {
              localStorage.setItem('imbs_app_logo', logo);
              sessionStorage.setItem('imbs_app_logo', logo);
            } catch {}
          }
          if (name) {
            setOrgName(name);
            try {
              localStorage.setItem('imbs_app_org_name', name);
              sessionStorage.setItem('imbs_app_org_name', name);
            } catch {}
          }
          if (foundation) {
            setFoundationName(foundation);
            try {
              localStorage.setItem('imbs_app_foundation_name', foundation);
              sessionStorage.setItem('imbs_app_foundation_name', foundation);
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.warning('Silakan isi username dan kata sandi');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal login');
        setLoading(false);
        return;
      }

      if (data.mustChangePassword) {
        toast.info(`Selamat datang, ${data.user.name}! Demi keamanan akun, silakan buat kata sandi mandiri Anda.`);
      } else {
        toast.success(`Selamat datang, ${data.user.name}!`);
      }

      try {
        invalidateMasterCache();
        localStorage.setItem('imbs_user_session', JSON.stringify(data.user));
      } catch {}

      const destination = data.mustChangePassword ? '/buat-kata-sandi' : (data.redirectUrl || '/dashboard');
      router.push(destination);
      router.refresh();
    } catch (err: any) {
      toast.error('Terjadi kesalahan koneksi');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col justify-center items-center p-3 sm:p-6 lg:p-8 relative app-scroll-container bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/40 dark:from-slate-950 dark:via-[#071326] dark:to-slate-950">
      {/* Decorative ambient background glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] rounded-full bg-blue-400/15 dark:bg-blue-600/10 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] rounded-full bg-indigo-400/15 dark:bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* Top right theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-800">
          <ThemeToggle />
        </div>
      </div>

      {/* Main Executive Container */}
      <div className="w-full max-w-5xl my-auto relative z-10">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] shadow-[0_25px_70px_rgba(15,23,42,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.7)] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
          
          {/* Left Column: Institutional Prestige Showcase (Visible on all, expansive on Desktop) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0c2340] via-[#0f2d52] to-[#07172b] p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Ambient pattern overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Foundation Tag */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold tracking-wide text-blue-200 mb-5">
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                <span className="uppercase tracking-wider font-bold truncate max-w-[280px]">
                  {foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
                </span>
              </div>

              {/* Institution Logo & Header */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-white p-2 shadow-lg ring-4 ring-white/10 flex items-center justify-center">
                  <img
                    src={appLogo || '/logo-imbs-left.png'}
                    alt={orgName || 'Logo IMBS'}
                    className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo-imbs-left.png';
                    }}
                  />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                    {orgName || 'IMAM MUZANI BOARDING SCHOOL'}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-blue-200/90 font-medium tracking-wide mt-0.5">
                    Sistem Informasi Manajemen Presensi & Kepegawaian (SIM-Presensi)
                  </p>
                </div>
              </div>

              {/* Tagline / Mission */}
              <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal mb-6 lg:mb-8 hidden sm:block">
                Platform absensi digital resmi bagi seluruh Dewan Guru, Asatidzah, dan Tenaga Kependidikan untuk pencatatan kehadiran yang akurat, amanah, dan akuntabel.
              </p>

              {/* 3 Core Value Pillars */}
              <div className="space-y-3 hidden sm:block">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5 border border-blue-400/20">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">Geofencing Radius GPS Presisi</h4>
                    <p className="text-[11px] text-slate-300/85 leading-snug mt-0.5">
                      Deteksi otomatis radius kehadiran di area kampus IMBS secara akurat dan real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-400/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">Sinkronisasi Shift & Jadwal Departemen</h4>
                    <p className="text-[11px] text-slate-300/85 leading-snug mt-0.5">
                      Integrasi jadwal kerja harian, toleransi keterlambatan, dan rekapitulasi otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-400/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">Keamanan & Audit Log Resmi</h4>
                    <p className="text-[11px] text-slate-300/85 leading-snug mt-0.5">
                      Enkripsi password mandiri, proteksi akun pegawai, dan audit jejak digital terpadu.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Badge */}
            <div className="pt-4 lg:pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">Server Asia/Jakarta (WIB) Aktif</span>
              </div>
              <span className="font-semibold text-blue-300">v2.4 Production</span>
            </div>
          </div>

          {/* Right Column: High-Grade Login Form */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative bg-white dark:bg-slate-900">
            {/* Top Luminous Blue Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

            <div>
              {/* Form Header */}
              <div className="mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Portal Kepegawaian & Presensi</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Masuk ke Akun Anda
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Silakan masukkan kredensial akun NIP, email, atau username Anda.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Username / NIP / Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Contoh: IMBS-001 atau ahmad.fauzi"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium transition-all outline-hidden"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi
                    </label>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun"
                      className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium transition-all outline-hidden"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 sm:py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk ke Portal Presensi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Administrative Assistance Callout */}
              <div className="mt-6 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Lupa kata sandi atau kendala login?</span>{' '}
                  Silakan hubungi staf Tata Usaha (TU) atau Admin IMBS untuk bantuan pemulihan akses akun.
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 text-center sm:flex sm:items-center sm:justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <p>&copy; 2026 {foundationName || 'YAYASAN SABILUL HUDA NAMBO'}.</p>
              <p className="mt-1 sm:mt-0 font-medium">SIM-Presensi IMBS • All Rights Reserved</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
