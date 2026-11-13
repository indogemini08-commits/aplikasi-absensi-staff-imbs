'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ToastContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white items-center justify-center font-extrabold text-2xl shadow-xl shadow-emerald-500/25 mb-3 ring-4 ring-emerald-500/10">
            IM
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Absensi Staff IMBS
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Insan Mandiri Boarding School & Institute
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-2.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Portal Presensi Resmi Berbasis GPS (WIB)
          </div>
        </div>

        {/* Login Form Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-glass dark:shadow-glass-dark border border-slate-200/80 dark:border-slate-800/80 transition-all">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            Masuk ke Akun Anda
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Gunakan username NIP atau email yang telah didaftarkan.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username / Email / NIP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: pegawai atau admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/30 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-60"
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
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-left transition"
              >
                <div className="font-bold text-emerald-700 dark:text-emerald-400">Pegawai (Staff)</div>
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
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 text-left transition"
              >
                <div className="font-bold text-teal-700 dark:text-teal-400">Staff IT</div>
                <div className="text-slate-500 dark:text-slate-400">Fajar Hidayat</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-6">
          &copy; 2026 Yayasan Insan Mandiri Boarding School. Hak Cipta Dilindungi.
        </p>
      </div>
    </div>
  );
}

