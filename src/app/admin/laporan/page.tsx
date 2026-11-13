'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Calendar,
  Building,
  RefreshCw,
  Search,
  Eye,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';
import { getWIBDateString, formatIndonesianDate } from '@/lib/date';
import ReportPreviewModal from '@/components/ReportPreviewModal';

function LaporanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [reportData, setReportData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'recap' (Executive Grouped) or 'records' (Daily Detail)
  const [activeTab, setActiveTab] = useState<'recap' | 'records'>('recap');

  // Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Filters
  // Default to August 2026 if requested or last 30 days
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || '2026-08-01'
  );
  const [endDate, setEndDate] = useState(
    searchParams.get('endDate') || '2026-08-25'
  );
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') || '');
  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') || '');

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, departmentId, employeeId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/recap?startDate=${startDate}&endDate=${endDate}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (employeeId) url += `&employeeId=${employeeId}`;

      const [userRes, empRes, reportRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/employees'),
        fetch(url)
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
        setDepartments(empData.departments || []);
        setEmployees(empData.employees || []);
      }

      if (reportRes.ok) {
        const data = await reportRes.json();
        setReportData(data);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleExportCsv = (type: 'detail' | 'summary' = 'summary') => {
    let url = `/api/reports/recap?startDate=${startDate}&endDate=${endDate}&format=${type === 'summary' ? 'csv-summary' : 'csv'}`;
    if (departmentId) url += `&departmentId=${departmentId}`;
    if (employeeId) url += `&employeeId=${employeeId}`;
    window.open(url, '_blank');
  };

  const handlePresetAugust2026 = () => {
    setStartDate('2026-08-01');
    setEndDate('2026-08-25');
  };

  const handlePresetThisMonth = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    setStartDate(`${y}-${m}-01`);
    setEndDate(getWIBDateString());
  };

  const handlePresetLast30Days = () => {
    setStartDate(getWIBDateString(new Date(Date.now() - 30 * 86400000)));
    setEndDate(getWIBDateString());
  };

  const records = reportData?.records || [];
  const recapSummary = reportData?.recapSummary || [];
  const institution = reportData?.institution || {
    govName: 'PEMERINTAH DAERAH KABUPATEN BOGOR',
    foundationName: 'YAYASAN SABILUL HUDA NAMBO',
    schoolName: 'IMAM MUZANI BOARDING SCHOOL',
    address: 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610',
    contact: 'E-Mail: imammuzanibs@gmail.com   No Telepon : 0852 8242 4628',
    headmaster: 'Fauzan Azhiimaa, Lc',
    tuStaff: 'ALDRI WAHYUDI CHANDRA',
  };
  const periodFormatted = reportData?.periodFormatted || `${startDate} – ${endDate}`;
  const monthName = reportData?.monthName || 'AGUSTUS';
  const formattedEndDate = reportData?.formattedEndDate || endDate;

  const stats = reportData?.stats || {
    totalRecords: 0,
    totalEmployees: recapSummary.length,
    totalHadir: 0,
    totalTerlambat: 0,
    totalPulangCepat: 0,
    totalMenitTerlambat: 0,
    persentaseKehadiranTepat: 100,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] print:bg-white print:text-black">
      <div className="print:hidden">
        <Navbar user={user} />
      </div>

      <div className="flex flex-1">
        <div className="print:hidden">
          <Sidebar userRole={user?.role} />
        </div>

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Rekapitulasi & Laporan Kehadiran
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Laporan komprehensif kehadiran Dewan Guru & Pegawai, ekspor resmi PDF & PNG IMBS
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Primary Action: Simpan PDF & Rekap (Opens Mode Preview) */}
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition flex items-center gap-2 cursor-pointer"
                title="Buka Mode Preview untuk menyimpan dalam PDF atau PNG High Quality"
              >
                <Eye className="w-4 h-4" />
                <span>Simpan PDF & Rekap</span>
                <span className="hidden md:inline-block bg-rose-700/80 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  Mode Preview
                </span>
              </button>

              {/* Unduh Excel CSV */}
              <button
                onClick={() => handleExportCsv('summary')}
                className="py-2.5 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
                title="Unduh Rekap Eksekutif format CSV / Excel"
              >
                <Download className="w-4 h-4" />
                <span>Excel (CSV)</span>
              </button>
            </div>
          </div>

          {/* Quick Date Presets & Filter Bar */}
          <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3 print:hidden">
            {/* Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Preset Periode:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePresetAugust2026}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    startDate === '2026-08-01' && endDate === '2026-08-25'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Agustus 2026 (Sesuai Template Dokumen)
                </button>
                <button
                  onClick={handlePresetThisMonth}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Bulan Ini
                </button>
                <button
                  onClick={handlePresetLast30Days}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  30 Hari Terakhir
                </button>
              </div>
            </div>

            {/* Form Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Mulai:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Divisi:</span>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-emerald-500 text-xs"
                >
                  <option value="">Semua Divisi ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Pegawai:</span>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 font-semibold focus:ring-2 focus:ring-emerald-500 text-xs max-w-xs"
                >
                  <option value="">Semua Pegawai ({employees.length})</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-500">Total Pegawai Terevaluasi</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {recapSummary.length} <span className="text-xs font-normal text-slate-400">Orang</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="text-[11px] font-semibold text-emerald-600">Total Absen Masuk</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.totalHadir} <span className="text-xs font-normal text-emerald-500">Transaksi</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="text-[11px] font-semibold text-amber-500">Insiden Keterlambatan</div>
              <div className="text-2xl font-black text-amber-500 mt-1">
                {stats.totalTerlambat} <span className="text-xs font-normal text-amber-600/80">Kali</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="text-[11px] font-semibold text-indigo-600">Ketepatan Waktu</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {stats.persentaseKehadiranTepat}%
              </div>
            </div>
          </div>

          {/* View Switcher Tabs: Rekap Eksekutif vs Rincian Harian */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('recap')}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'recap'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Rekap Eksekutif Dewan Guru & Pegawai</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                  Format Resmi IMBS
                </span>
              </button>

              <button
                onClick={() => setActiveTab('records')}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'records'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Rincian Harian Absensi ({records.length})</span>
              </button>
            </div>

            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/60 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Buka Pratinjau Dokumen (Preview)</span>
            </button>
          </div>

          {/* Main Table Content */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden print:border-none print:shadow-none">
            {loading ? (
              <SkeletonTable />
            ) : activeTab === 'recap' ? (
              /* Tab 1: Executive Recap (Matching reference columns) */
              recapSummary.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Rekap Data"
                  description="Tidak ada catatan pegawai atau absensi yang sesuai pada rentang filter ini."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#1b5f8c] text-white text-[11px] font-bold uppercase tracking-wider">
                        <th rowSpan={2} className="py-3 px-3 text-center border-r border-[#246b9c] w-12">
                          No
                        </th>
                        <th rowSpan={2} className="py-3 px-3 border-r border-[#246b9c]">
                          Nama Pegawai
                        </th>
                        <th rowSpan={2} className="py-3 px-3 border-r border-[#246b9c]">
                          Departemen
                        </th>
                        <th colSpan={6} className="py-2 px-3 text-center border-b border-[#246b9c]">
                          Keterangan Kehadiran
                        </th>
                        <th rowSpan={2} className="py-3 px-3 text-center w-28">
                          Predikat
                        </th>
                      </tr>
                      <tr className="bg-[#1b5f8c] text-white/90 text-[10px] font-semibold text-center border-b border-[#246b9c]">
                        <th className="py-2 px-2 border-r border-[#246b9c]/60">Absen Masuk</th>
                        <th className="py-2 px-2 border-r border-[#246b9c]/60">Absen Pulang</th>
                        <th className="py-2 px-2 border-r border-[#246b9c]/60">Telat</th>
                        <th className="py-2 px-2 border-r border-[#246b9c]/60">Pulang Lebih Awal</th>
                        <th className="py-2 px-2 border-r border-[#246b9c]/60">Lupa Absen Pulang</th>
                        <th className="py-2 px-2 border-r border-[#246b9c]/60">Tidak Hadir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recapSummary.map((item: any, idx: number) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={item.employee_id}
                            className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition ${
                              isEven ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/70 dark:bg-slate-800/30'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                              {item.no}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.nip}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                              {item.department_name}
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                              {item.total_masuk} Kali
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                              {item.total_pulang} Kali
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                              {item.total_telat} Kali
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                              {item.total_pulang_cepat} Kali
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                              {item.total_lupa_pulang} Kali
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                              {item.total_tidak_hadir} Kali
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                                  item.predikat === 'Sangat Baik'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                    : item.predikat === 'Baik'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                                    : item.predikat === 'Kurang Baik'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                }`}
                              >
                                {item.predikat}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Tab 2: Daily Detail Logs */
              records.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Catatan Detail"
                  description="Tidak ada catatan transaksi absensi harian pada rentang filter ini."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3">Tanggal</th>
                        <th className="py-3 px-3">Pegawai & NIP</th>
                        <th className="py-3 px-3">Divisi</th>
                        <th className="py-3 px-3">Jam Masuk</th>
                        <th className="py-3 px-3">Status Masuk</th>
                        <th className="py-3 px-3">Jam Pulang</th>
                        <th className="py-3 px-3">Status Pulang</th>
                        <th className="py-3 px-3">Alasan / Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {records.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3 font-mono">{r.date}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {r.employee_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.employee_nip}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-500">{r.department_name}</td>
                          <td className="py-3 px-3 tabular-nums font-bold">
                            {r.clock_in_time || '—'}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.clock_in_status === 'hadir'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {r.clock_in_status === 'hadir' ? 'Hadir Tepat Waktu' : `Terlambat (+${r.clock_in_minutes_late}m)`}
                            </span>
                          </td>
                          <td className="py-3 px-3 tabular-nums">
                            {r.clock_out_time || '—'}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.clock_out_status === 'normal'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : r.clock_out_status === 'pulang_cepat'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.clock_out_status === 'pulang_cepat'
                                ? 'Pulang Cepat'
                                : r.clock_out_time
                                ? 'Normal'
                                : 'Belum Pulang'}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs text-[11px] text-slate-600 dark:text-slate-400 italic">
                            {r.late_reason ? `"${r.late_reason}"` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      {/* Official Document Preview & Export Modal */}
      <ReportPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        periodFormatted={periodFormatted}
        monthName={monthName}
        formattedEndDate={formattedEndDate}
        institution={institution}
        recapSummary={recapSummary}
      />
    </div>
  );
}

export default function LaporanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat Laporan...</div>}>
      <LaporanContent />
    </Suspense>
  );
}
