'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full overflow-y-auto flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16] text-center app-scroll-container">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-xl">
        <AlertTriangle className="w-10 h-10" />
      </div>

      <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
        500
      </h1>
      <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-2">
        Terjadi Kendala Sistem
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        Sistem mengalami kendala tak terduga saat memuat data. Silakan coba muat ulang atau kembali ke halaman beranda.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Muat Ulang Halaman</span>
        </button>
        <Link
          href="/dashboard"
          className="py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          <span>Ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}

