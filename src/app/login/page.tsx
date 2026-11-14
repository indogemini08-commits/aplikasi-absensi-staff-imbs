'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
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

      toast.success(`Selamat datang, ${data.user.name}!`);
      try {
        invalidateMasterCache();
        localStorage.setItem('imbs_user_session', JSON.stringify(data.user));
      } catch {}
      router.push(data.redirectUrl || '/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error('Terjadi kesalahan koneksi');
      setLoading(false);
    }
  };

  // Quick Account Selector for testing
  const selectQuickAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Institution Title */}
        <div className="text-center mb-6">
          <div className="inline-flex h-16 min-w-[3.5rem] max-w-[140px] px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200/90 dark:border-slate-700/80 items-center justify-center mb-3 ring-4 ring-blue-500/10">
            <img
              src={appLogo || '/logo-imbs-left.png'}
              alt={orgName || 'Logo IMBS'}
              className="max-h-full w-auto object-contain filter drop-shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo-imbs-left.png';
              }}
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Absensi Staff IMBS
          </h1>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 uppercase tracking-wider">
            {orgName || 'IMAM MUZANI BOARDING SCHOOL'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[10px] sm:text-[11px] font-semibold text-blue-700 dark:text-blue-300 mt-2.5 max-w-[92vw] truncate shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {foundationName ? `${foundationName} • Portal Presensi GPS` : 'Portal Presensi Resmi Berbasis GPS'}
            </span>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative overflow-hidden transition-all">
          {/* Top Luminous Neon Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_12px_#2563eb]" />

          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
            Masuk ke Akun Anda
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-medium">
            Gunakan username NIP atau email yang telah didaftarkan.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Username / Email / NIP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: pegawai atau admin"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl glass-input text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/35 neon-glow-blue active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Akses Cepat Pengujian (1-Klik):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => selectQuickAccount('pegawai', 'password123')}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition"
              >
                <div className="font-bold text-blue-700 dark:text-blue-400">Pegawai (Staff)</div>
                <div className="text-slate-500 dark:text-slate-400">Budi Pratama (Guru)</div>
              </button>

              <button
                type="button"
                onClick={() => selectQuickAccount('admin', 'password123')}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-left transition"
              >
                <div className="font-bold text-indigo-700 dark:text-indigo-400">Admin HRD</div>
                <div className="text-slate-500 dark:text-slate-400">Siti Nurhaliza</div>
              </button>

              <button
                type="button"
                onClick={() => selectQuickAccount('superadmin', 'password123')}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition"
              >
                <div className="font-bold text-purple-700 dark:text-purple-400">Super Admin</div>
                <div className="text-slate-500 dark:text-slate-400">Dr. H. Ahmad Fauzi</div>
              </button>

              <button
                type="button"
                onClick={() => selectQuickAccount('fajar', 'password123')}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-left transition"
              >
                <div className="font-bold text-sky-700 dark:text-sky-400">Staff IT</div>
                <div className="text-slate-500 dark:text-slate-400">Fajar Hidayat</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-6">
          &copy; 2026 {foundationName || 'YAYASAN SABILUL HUDA NAMBO'}. Hak Cipta Dilindungi.
        </p>
      </div>
    </div>
  );
}

