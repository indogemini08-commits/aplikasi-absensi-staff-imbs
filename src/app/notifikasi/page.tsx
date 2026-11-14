'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Clock, FileText, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import { formatIndonesianDate } from '@/lib/date';
import { useToast } from '@/components/ToastContext';
import { useDataSync, broadcastDataChange } from '@/lib/sync';

export default function NotifikasiPage() {
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
  const [notifications, setNotifications] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_notifications');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_unread_count');
        return cached ? Number(cached) : 0;
      } catch {}
    }
    return 0;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_notifications');
    }
    return true;
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  useDataSync(() => {
    fetchNotifications();
  }, ['notifications']);

  const fetchNotifications = async () => {
    try {
      const [userRes, dataRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/notifications', { cache: 'no-store' })
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
      }

      if (dataRes.ok) {
        const data = await dataRes.json();
        const notifs = data.notifications || [];
        const count = data.unreadCount || 0;
        setNotifications(notifs);
        setUnreadCount(count);
        if (typeof window !== 'undefined') {
          try {
            if (notifs.length === 0) {
              sessionStorage.removeItem('imbs_notifications');
              sessionStorage.removeItem('imbs_unread_count');
            } else {
              sessionStorage.setItem('imbs_notifications', JSON.stringify(notifs));
              sessionStorage.setItem('imbs_unread_count', String(count));
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

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      toast.success('Semua notifikasi ditandai telah dibaca');
      broadcastDataChange('notifications');
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markSingle = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      broadcastDataChange('notifications');
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen pb-28 md:pb-12 bg-transparent">
      <Navbar user={user} />

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Pusat Notifikasi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pemberitahuan absensi, persetujuan, dan sistem
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tandai Dibaca
            </button>
          )}
        </div>

        {/* List of notifications */}
        {loading ? (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-slate-400 animate-pulse">
            Memuat notifikasi...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Tidak Ada Notifikasi"
            description="Semua pemberitahuan penting akan muncul di sini."
          />
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markSingle(n.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                  n.is_read === 0
                    ? 'bg-white dark:bg-slate-900 border-blue-500/40 shadow-sm'
                    : 'glass-card border-slate-200/60 dark:border-slate-800/60 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {n.type === 'leave' && <FileText className="w-4 h-4 text-purple-500" />}
                    {n.type === 'attendance' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {n.type === 'correction' && <Clock className="w-4 h-4 text-sky-500" />}
                    {n.type === 'system' && <Info className="w-4 h-4 text-indigo-500" />}
                  </div>

                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">
                        {n.title}
                      </h4>
                      {n.is_read === 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {n.created_at ? n.created_at.substring(0, 16).replace('T', ' ') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

