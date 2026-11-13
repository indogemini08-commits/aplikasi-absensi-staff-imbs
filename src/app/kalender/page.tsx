'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Star, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { formatIndonesianDate } from '@/lib/date';

export default function KalenderPage() {
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
  const [holidays, setHolidays] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_holidays_list');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_holidays_list');
    }
    return true;
  });

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, holRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/holidays')
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

      if (holRes.ok) {
        const holData = await holRes.json();
        const holList = holData.holidays || [];
        setHolidays(holList);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('imbs_holidays_list', JSON.stringify(holList));
          } catch {}
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="min-h-screen pb-28 md:pb-12 bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Kalender Kerja & Libur
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jadwal hari kerja dan hari libur resmi IMBS
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-glass">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-2">
            <span className="text-rose-500">Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span className="text-emerald-600">Sab</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty slots for previous month offset */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 text-slate-300 dark:text-slate-700" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isHoliday = holidays.find((h) => h.date === dateStr);
              const isToday = new Date().toISOString().substring(0, 10) === dateStr;

              return (
                <div
                  key={day}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isToday
                      ? 'bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                      : isHoliday
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-200/60 dark:border-rose-900/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{day}</span>
                  {isHoliday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Holidays List */}
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500" />
            Daftar Hari Libur & Agenda
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {holidays.map((h) => (
              <div key={h.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {h.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatIndonesianDate(h.date)}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    h.type === 'institutional'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {h.type === 'institutional' ? 'Libur Lembaga' : 'Libur Nasional'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

