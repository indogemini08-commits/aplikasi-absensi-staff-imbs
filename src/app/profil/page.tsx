'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  Building,
  Mail,
  Phone,
  Calendar,
  Layers,
  Bell,
  LogOut,
  Moon,
  Sun,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import { useToast } from '@/components/ToastContext';

export default function ProfilPage() {
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
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('imbs_user_session');
    }
    return true;
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('imbs_user_session', JSON.stringify(data.user));
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('imbs_user_session');
        sessionStorage.clear();
      }
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.info('Anda telah keluar dari aplikasi.');
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-transparent">
        <Navbar user={user} />
        <main className="flex-1 w-full min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden p-4 pb-28 md:pb-12 app-scroll-container">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-transparent">
      <Navbar user={user} />

      <main className="flex-1 w-full min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden app-scroll-container">
        <div className="max-w-md mx-auto px-4 py-5 pb-28 md:pb-12 space-y-4">
        {/* Profile Card */}
        <div className="glass-card rounded-3xl p-6 text-center border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/20">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {user?.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            NIP: {user?.nip || '-'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200/60 dark:border-blue-800/60 mt-2.5">
            {user?.position}
          </div>
        </div>

        {/* Info Detail List */}
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Informasi Kepegawaian
          </h3>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Divisi / Unit
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {user?.departmentName || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Hak Akses Role
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
              {user?.role}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              Username Akun
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {user?.username}
            </span>
          </div>
        </div>

        {/* Quick Menu Shortcuts */}
        <div className="glass-card rounded-3xl p-2 border border-slate-200/80 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800">
          <button
            onClick={() => router.push('/kalender')}
            className="w-full p-3.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold">Kalender Kerja & Hari Libur</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => router.push('/koreksi')}
            className="w-full p-3.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition"
          >
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-sky-500" />
              <span className="font-semibold">Pengajuan Koreksi Absensi</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => router.push('/notifikasi')}
            className="w-full p-3.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="font-semibold">Pusat Notifikasi</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Appearance Settings */}
        <div className="glass-card rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <Moon className="w-4 h-4 text-purple-500" />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Tema Tampilan
              </div>
              <div className="text-[11px] text-slate-400">
                Mode Gelap atau Terang
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100 transition flex items-center justify-center gap-2 active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun</span>
        </button>

        {/* PWA / App Version note */}
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 pt-2">
          Aplikasi Absensi Staff IMBS v1.0.0 • PWA Ready
        </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

