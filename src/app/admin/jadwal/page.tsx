'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyJadwalRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/jadwal-departemen');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Mengalihkan ke Pengaturan Jadwal Kerja Departemen/Divisi...</span>
      </div>
    </div>
  );
}
