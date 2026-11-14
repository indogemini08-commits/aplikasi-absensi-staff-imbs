'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, Search, Shield, RefreshCw, User, Terminal } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useDataSync } from '@/lib/sync';

export default function AdminAuditLogPage() {
  const router = useRouter();
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
  const [logs, setLogs] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_audit_logs');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_audit_logs');
    }
    return true;
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  useDataSync(() => {
    fetchLogs();
  });

  const fetchLogs = async () => {
    try {
      const [userRes, logRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/audit-logs', { cache: 'no-store' })
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

      if (logRes.ok) {
        const data = await logRes.json();
        const logList = data.logs || [];
        setLogs(logList);
        if (typeof window !== 'undefined') {
          try {
            if (logList.length === 0) {
              sessionStorage.removeItem('imbs_audit_logs');
            } else {
              sessionStorage.setItem('imbs_audit_logs', JSON.stringify(logList));
            }
          } catch {}
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.user_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.details && l.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Histori Audit Log Sistem
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Rekaman transparan seluruh aktivitas autentikasi, persetujuan cuti, koreksi absensi, dan pengaturan
              </p>
            </div>

            <button
              onClick={() => fetchLogs()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="glass-card rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Cari aktor, tindakan (action), atau detail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs p-1 focus:outline-hidden text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Tidak Ada Rekaman Audit"
                description="Belum ada riwayat aktivitas yang tercatat."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Waktu (WIB)</th>
                      <th className="py-3.5 px-4">Pengguna / Aktor</th>
                      <th className="py-3.5 px-4">Tindakan (Action)</th>
                      <th className="py-3.5 px-4">Entitas</th>
                      <th className="py-3.5 px-4">Rincian Perubahan</th>
                      <th className="py-3.5 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                          {log.created_at ? log.created_at.substring(0, 19).replace('T', ' ') : '-'}
                        </td>

                        <td className="py-3.5 px-4">
                          <strong className="text-slate-800 dark:text-slate-100 font-bold">
                            {log.user_name}
                          </strong>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                        </td>

                        <td className="py-3.5 px-4 max-w-sm">
                          <code className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 p-1 rounded block truncate font-mono">
                            {log.details || '—'}
                          </code>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

