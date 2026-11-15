'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  LogOut,
  User,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/ToastContext';
import ThemeToggle from '@/components/ThemeToggle';
import { invalidateMasterCache } from '@/lib/sync';

export default function BuatKataSandiPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [appLogo, setAppLogo] = useState<string>('/logo-imbs-left.png');
  const [orgName, setOrgName] = useState<string>('IMAM MUZANI BOARDING SCHOOL');
  const [foundationName, setFoundationName] = useState<string>('YAYASAN SABILUL HUDA NAMBO');

  useEffect(() => {
    // 1. Fetch branding
    try {
      const storedLogo = localStorage.getItem('imbs_app_logo') || sessionStorage.getItem('imbs_app_logo');
      if (storedLogo) setAppLogo(storedLogo);
      const storedOrg = localStorage.getItem('imbs_app_org_name') || sessionStorage.getItem('imbs_app_org_name');
      if (storedOrg) setOrgName(storedOrg);
      const storedFound = localStorage.getItem('imbs_app_foundation_name') || sessionStorage.getItem('imbs_app_foundation_name');
      if (storedFound) setFoundationName(storedFound);
    } catch {}

    // 2. Fetch current user session
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          // If the user already completed password setup, redirect immediately
          if (data.user.needsPasswordChange === false) {
            router.push(data.user.role === 'staff' ? '/dashboard' : '/admin');
          }
        }
        setLoadingUser(false);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  // Validation criteria
  const isMinLength = newPassword.length >= 6;
  const isNotDefault = newPassword.toLowerCase() !== 'password123';
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = isMinLength && isNotDefault && isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMinLength) {
      toast.warning('Kata sandi minimal 6 karakter.');
      return;
    }

    if (!isNotDefault) {
      toast.warning('Harap gunakan kata sandi baru selain kata sandi default.');
      return;
    }

    if (!isMatching) {
      toast.warning('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan kata sandi');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message || 'Kata sandi berhasil dibuat!');

      // Update cached session
      try {
        invalidateMasterCache();
        if (data.user) {
          localStorage.setItem('imbs_user_session', JSON.stringify(data.user));
        }
      } catch {}

      setTimeout(() => {
        router.push(data.redirectUrl || '/dashboard');
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan');
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    try {
      localStorage.removeItem('imbs_user_session');
      sessionStorage.clear();
    } catch {}
    router.push('/login');
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        {/* Header Branding */}
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
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Aktivasi Sandi Mandiri
          </h1>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 uppercase tracking-wider">
            {orgName}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[10px] sm:text-[11px] font-semibold text-blue-700 dark:text-blue-300 mt-2 max-w-[92vw] truncate shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Keamanan Akun Resmi IMBS</span>
          </div>
        </div>

        {/* Setup Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative overflow-hidden transition-all">
          {/* Top Luminous Neon Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_12px_#2563eb]" />

          {/* Welcoming Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/50 mb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Assalamu&apos;alaikum, {user?.name || user?.username}!</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-blue-800/90 dark:text-blue-300/90">
              Ini adalah pertama kalinya Anda masuk ke Portal Presensi IMBS. Demi menjaga keamanan akun dan privasi data absensi Anda, silakan buat kata sandi mandiri baru yang hanya diketahui oleh Anda.
            </p>
          </div>

          {/* User Account Info Chip */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 mb-5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || user?.username}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  @{user?.username} {user?.nip ? `• NIP: ${user.nip}` : ''}
                </div>
              </div>
            </div>
            {user?.departmentName && (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                {user.departmentName}
              </span>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi Baru Mandiri: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru Anda"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ulangi Kata Sandi Baru: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 text-[11px]">
              <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Kriteria Kata Sandi:
              </div>
              <div className={`flex items-center gap-1.5 ${isMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {isMinLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Panjang minimal 6 karakter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isNotDefault && newPassword.length > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {isNotDefault && newPassword.length > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Berbeda dari kata sandi bawaan (password123)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatching ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {isMatching ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Kedua kata sandi cocok</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <span>Menyimpan Sandi Baru...</span>
              ) : (
                <>
                  <span>Simpan Kata Sandi & Masuk ke Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Logout / Switch Account */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Bukan akun Anda? Keluar dan ganti akun</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

