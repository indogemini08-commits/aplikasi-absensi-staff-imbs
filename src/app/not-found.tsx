import React from 'react';
import Link from 'next/link';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full overflow-y-auto flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16] text-center app-scroll-container">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-xl">
        <Compass className="w-10 h-10 animate-spin-slow" />
      </div>

      <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
        404
      </h1>
      <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-2">
        Halaman Tidak Ditemukan
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        Tautan yang Anda tuju mungkin salah ketik, telah dipindahkan, atau Anda tidak memiliki hak akses ke halaman tersebut.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}

