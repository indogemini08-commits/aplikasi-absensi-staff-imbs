'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Search,
  Filter,
  RefreshCw,
  Building,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { getWIBDateString, formatIndonesianDate } from '@/lib/date';
import { useDataSync } from '@/lib/sync';

function PapanJadwalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [boardData, setBoardData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_papan_jadwal');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_papan_jadwal');
    }
    return true;
  });

  // Filters
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || getWIBDateString());
  const [selectedDept, setSelectedDept] = useState(searchParams.get('departmentId') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_departments');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    fetchBoardData();
  }, [selectedDate, selectedDept, selectedStatus]);

  // Real-time synchronization
  useDataSync(() => {
    fetchBoardData();
  });

  const fetchBoardData = async () => {
    try {
      let url = `/api/schedules/board?date=${selectedDate}`;
      if (selectedDept) url += `&departmentId=${selectedDept}`;
      if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;

      const [userRes, empRes, boardRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/employees', { cache: 'no-store' }),
        fetch(url, { cache: 'no-store' })
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

      if (empRes.ok) {
        const empData = await empRes.json();
        const depts = empData.departments || [];
        setDepartments(depts);
        if (typeof window !== 'undefined') {
          try {
            if (depts.length > 0) {
              sessionStorage.setItem('imbs_departments', JSON.stringify(depts));
            } else {
              sessionStorage.removeItem('imbs_departments');
            }
          } catch {}
        }
      }

      if (boardRes.ok) {
        const boardJson = await boardRes.json();
        setBoardData(boardJson);
        if (typeof window !== 'undefined') {
          try {
            if (boardJson && (boardJson.stats?.total_employees > 0 || (boardJson.items && boardJson.items.length > 0))) {
              sessionStorage.setItem('imbs_papan_jadwal', JSON.stringify(boardJson));
            } else {
              sessionStorage.removeItem('imbs_papan_jadwal');
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

  const filteredItems = boardData?.board?.filter((item: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.nip.toLowerCase().includes(query) ||
      item.position.toLowerCase().includes(query)
    );
  }) || [];

  const stats = boardData?.stats || {
    totalEmployees: 0,
    hadir: 0,
    terlambat: 0,
    belumAbsen: 0,
    izin: 0,
    cuti: 0,
    sakit: 0,
    pulang: 0,
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Papan Jadwal Kehadiran
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitoring real-time rencana jam masuk vs aktual kehadiran seluruh pegawai IMBS
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchBoardData()}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-xs"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => router.push(`/admin/laporan?startDate=${selectedDate}&endDate=${selectedDate}&format=csv`)}
                className="py-2.5 px-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Hari Ini</span>
              </button>
            </div>
          </div>

          {/* Quick Status Counters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
            <button
              onClick={() => setSelectedStatus('')}
              className={`glass-card p-3 rounded-2xl border transition ${
                !selectedStatus ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="text-[10px] text-slate-500 font-semibold">Total Staff</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {stats.totalEmployees}
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus('Hadir')}
              className={`glass-card p-3 rounded-2xl border transition ${
                selectedStatus === 'Hadir' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="text-[10px] text-blue-600 font-semibold">Hadir</div>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {stats.hadir}
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus('Terlambat')}
              className={`glass-card p-3 rounded-2xl border transition ${
                selectedStatus === 'Terlambat' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="text-[10px] text-amber-500 font-semibold">Terlambat</div>
              <div className="text-lg font-black text-amber-500 mt-0.5">
                {stats.terlambat}
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus('Belum Absen')}
              className={`glass-card p-3 rounded-2xl border transition ${
                selectedStatus === 'Belum Absen' ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="text-[10px] text-slate-500 font-semibold">Belum Absen</div>
              <div className="text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5">
                {stats.belumAbsen}
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus('Pulang')}
              className={`glass-card p-3 rounded-2xl border transition ${
                selectedStatus === 'Pulang' ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="text-[10px] text-sky-600 font-semibold">Sudah Pulang</div>
              <div className="text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">
                {stats.pulang}
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus('Cuti')}
              className={`glass-card p-3 rounded-2xl border transition ${
                selectedStatus === 'Cuti' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="text-[10px] text-purple-600 font-semibold">Cuti</div>
              <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {stats.cuti}
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus('Izin')}
              className={`glass-card p-3 rounded-2xl border transition ${
                selectedStatus === 'Izin' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="text-[10px] text-cyan-600 font-semibold">Izin / Sakit</div>
              <div className="text-lg font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
                {stats.izin + stats.sakit}
              </div>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Divisi:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Divisi</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Belum Absen">Belum Absen</option>
                <option value="Pulang">Pulang</option>
                <option value="Cuti">Cuti</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Libur">Libur</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama atau NIP pegawai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Monitoring Board Table */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title="Tidak Ada Data Kehadiran"
                description="Tidak ada data pegawai yang sesuai dengan filter yang dipilih."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      <th className="py-3.5 px-4">Pegawai & NIP</th>
                      <th className="py-3.5 px-4">Divisi & Jabatan</th>
                      <th className="py-3.5 px-4">Shift & Rencana</th>
                      <th className="py-3.5 px-4">Aktual Masuk</th>
                      <th className="py-3.5 px-4">Aktual Pulang</th>
                      <th className="py-3.5 px-4">Selisih Keterlambatan</th>
                      <th className="py-3.5 px-4 text-right">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item: any) => {
                      const isLate = item.status === 'Terlambat';
                      const isPresent = item.status === 'Hadir' || item.status === 'Pulang';

                      return (
                        <tr
                          key={item.employeeId}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600/10 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {item.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100">
                                  {item.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {item.nip}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-700 dark:text-slate-200">
                              {item.departmentName}
                            </div>
                            <div className="text-[10px] text-slate-500">{item.position}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {item.shiftName}
                            </div>
                            <div className="text-[10px] text-slate-500 tabular-nums">
                              {item.plannedIn} - {item.plannedOut} WIB
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                              {item.actualIn ? `${item.actualIn} WIB` : '—'}
                            </div>
                            {item.locationName && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                📍 {item.locationName}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 tabular-nums">
                            {item.actualOut ? (
                              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                                {item.actualOut} WIB
                              </strong>
                            ) : (
                              <span className="text-slate-400">Belum Pulang</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {item.minutesLate > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                                +{item.minutesLate} Menit
                              </span>
                            ) : isPresent ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                Tepat Waktu
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold inline-block ${
                                item.status === 'Hadir'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : item.status === 'Pulang'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : item.status === 'Terlambat'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : item.status === 'Cuti'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : item.status === 'Izin' || item.status === 'Sakit'
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                                  : item.status === 'Libur'
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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

export default function PapanJadwalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat Papan Jadwal...</div>}>
      <PapanJadwalContent />
    </Suspense>
  );
}
