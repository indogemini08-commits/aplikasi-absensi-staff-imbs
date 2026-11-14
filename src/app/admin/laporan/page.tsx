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
  const [reportData, setReportData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_laporan_data');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [departments, setDepartments] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_departments_list');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [employees, setEmployees] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_pegawai_list');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_laporan_data');
    }
    return true;
  });

  // Active Tab: 'recap' (Executive Grouped) or 'records' (Daily Detail)
  const [activeTab, setActiveTab] = useState<'recap' | 'records'>('recap');

  // Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    if (searchParams.get('startDate')) return searchParams.get('startDate')!;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    if (searchParams.get('endDate')) return searchParams.get('endDate')!;
    return getWIBDateString();
  });
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') || '');
  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') || '');

  const [liveSettings, setLiveSettings] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('imbs_settings_data') || localStorage.getItem('imbs_settings_data');
        return raw ? JSON.parse(raw) : null;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    fetchReport();

    const handleSettingsUpdated = () => {
      if (typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem('imbs_settings_data') || localStorage.getItem('imbs_settings_data');
          if (raw) setLiveSettings(JSON.parse(raw));
        } catch {}
      }
      fetchReport();
    };

    window.addEventListener('imbs_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('imbs_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SETTINGS_UPDATED') {
          if (event.data?.settings) setLiveSettings(event.data.settings);
          fetchReport();
        }
      };
    } catch {}

    return () => {
      window.removeEventListener('imbs_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
      if (channel) channel.close();
    };
  }, [startDate, endDate, departmentId, employeeId]);

  const fetchReport = async () => {
    try {
      let url = `/api/reports/recap?startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (employeeId) url += `&employeeId=${employeeId}`;

      const [userRes, empRes, reportRes, settingsRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/employees', { cache: 'no-store' }),
        fetch(url, { cache: 'no-store' }),
        fetch(`/api/settings?_t=${Date.now()}`, { cache: 'no-store' }),
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

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData?.settings) {
          setLiveSettings(sData.settings);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('imbs_settings_data', JSON.stringify(sData.settings));
            } catch {}
          }
        }
      }

      if (reportRes.ok) {
        const data = await reportRes.json();
        setReportData(data);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('imbs_laporan_data', JSON.stringify(data));
          } catch {}
        }
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

  const handlePresetThisMonth = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    setStartDate(`${y}-${m}-01`);
    setEndDate(getWIBDateString());
  };

  const handlePresetLastMonth = () => {
    const today = new Date();
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const y = lastMonthDate.getFullYear();
    const m = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, lastMonthDate.getMonth() + 1, 0).getDate();
    setStartDate(`${y}-${m}-01`);
    setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
  };

  const handlePresetLast30Days = () => {
    setStartDate(getWIBDateString(new Date(Date.now() - 30 * 86400000)));
    setEndDate(getWIBDateString());
  };

  const records = reportData?.records || [];
  const recapSummary = reportData?.recapSummary || [];
  const serverInst = reportData?.institution;
  const institution = {
    govName: liveSettings?.gov_name || serverInst?.govName || 'PEMERINTAH DAERAH KABUPATEN BOGOR',
    foundationName: liveSettings?.foundation_name || serverInst?.foundationName || 'YAYASAN SABILUL HUDA NAMBO',
    schoolName: liveSettings?.organization_name || serverInst?.schoolName || 'IMAM MUZANI BOARDING SCHOOL',
    address: liveSettings?.organization_address || serverInst?.address || 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610',
    contact: `E-Mail: ${liveSettings?.organization_email || serverInst?.email || 'imammuzanibs@gmail.com'}   No Telepon : ${liveSettings?.organization_phone || serverInst?.phone || '0852 8242 4628'}`,
    email: liveSettings?.organization_email || serverInst?.email || 'imammuzanibs@gmail.com',
    phone: liveSettings?.organization_phone || serverInst?.phone || '0852 8242 4628',
    headmaster: liveSettings?.headmaster_name || serverInst?.headmaster || 'Fauzan Azhiimaa, Lc',
    headmasterTitle: liveSettings?.headmaster_title || serverInst?.headmasterTitle || 'Kepala Sekolah',
    headmasterNip: liveSettings?.headmaster_nip || serverInst?.headmasterNip || '—',
    tuStaff: liveSettings?.tu_name || serverInst?.tuStaff || 'ALDRI WAHYUDI CHANDRA',
    tuStaffTitle: liveSettings?.tu_title || serverInst?.tuStaffTitle || 'Petugas Tata Usaha',
    tuStaffNip: liveSettings?.tu_nip || serverInst?.tuStaffNip || '—',
    logoInstitution: liveSettings?.logo_institution || serverInst?.logoInstitution || '',
    logoFoundation: liveSettings?.logo_foundation || serverInst?.logoFoundation || '',
    logoApp: liveSettings?.logo_app || serverInst?.logoApp || '',
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
    <div className="min-h-screen flex flex-col bg-transparent print:bg-white print:text-black">
      <div className="print:hidden">
        <Navbar user={user} />
      </div>

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Rekapitulasi & Laporan Kehadiran
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Laporan komprehensif kehadiran Dewan Guru & Pegawai, ekspor resmi PDF & PNG IMBS
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto">
              {/* Primary Action: Simpan PDF & Rekap (Opens Mode Preview) */}
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer w-full xs:w-auto"
                title="Buka Mode Preview untuk menyimpan dalam PDF atau PNG High Quality"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>Simpan PDF & Rekap</span>
                <span className="hidden md:inline-block bg-rose-700/80 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  Mode Preview
                </span>
              </button>

              {/* Unduh Excel CSV */}
              <button
                onClick={() => handleExportCsv('summary')}
                className="py-2.5 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer w-full xs:w-auto"
                title="Unduh Rekap Eksekutif format CSV / Excel"
              >
                <Download className="w-4 h-4 shrink-0" />
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
                  onClick={handlePresetThisMonth}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Bulan Ini
                </button>
                <button
                  onClick={handlePresetLastMonth}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Bulan Lalu
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

          {/* Summary Metric Cards with Glowing Neon Glass Capsules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 print:hidden">
            <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-3xl border border-indigo-400/30 dark:border-indigo-500/30 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Pegawai Terevaluasi</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
                {recapSummary.length} <span className="text-xs font-semibold text-slate-400">Orang</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-3xl border border-emerald-400/30 dark:border-emerald-500/30 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Total Absen Masuk</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                {stats.totalHadir} <span className="text-xs font-semibold text-emerald-500/80">Transaksi</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-3xl border border-amber-400/30 dark:border-amber-500/30 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="text-[11px] font-bold text-amber-500">Insiden Keterlambatan</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-1.5 tabular-nums drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                {stats.totalTerlambat} <span className="text-xs font-semibold text-amber-500/80">Kali</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-3xl border border-cyan-400/30 dark:border-cyan-500/30 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">Ketepatan Waktu</div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1.5 tabular-nums drop-shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                {stats.persentaseKehadiranTepat}%
              </div>
            </div>
          </div>

          {/* View Switcher Tabs: Rekap Eksekutif vs Rincian Harian with Floating Glass Capsule */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex flex-col xs:flex-row p-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-xs gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('recap')}
                className={`py-2 px-3 sm:px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  activeTab === 'recap'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30 neon-glow-emerald scale-[1.01]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Award className="w-4 h-4 shrink-0" />
                <span className="truncate">Rekapitulasi Kehadiran</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 hidden xs:inline-block ${
                  activeTab === 'recap' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  Eksekutif
                </span>
              </button>

              <button
                onClick={() => setActiveTab('records')}
                className={`py-2 px-3 sm:px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  activeTab === 'records'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30 neon-glow-emerald scale-[1.01]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="truncate">Rincian Harian ({records.length})</span>
              </button>
            </div>

            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25 text-emerald-700 dark:text-emerald-300 transition flex items-center justify-center gap-2 border border-emerald-500/30 dark:border-emerald-500/40 shadow-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Buka Pratinjau Dokumen (Preview)</span>
            </button>
          </div>

          {/* Main Table Content in Frosted Glass Container */}
          <div className="glass-card rounded-3xl border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden print:border-none print:shadow-none">
            {loading ? (
              <SkeletonTable />
            ) : activeTab === 'recap' ? (
              /* Tab 1: Executive Recap */
              recapSummary.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Rekap Data"
                  description="Tidak ada catatan pegawai atau absensi yang sesuai pada rentang filter ini."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10.5px]">
                        <th className="py-3 px-4 text-center w-12">No</th>
                        <th className="py-3 px-4">Nama Pegawai</th>
                        <th className="py-3 px-4">Departemen</th>
                        <th className="py-3 px-4 text-center">Absen Masuk</th>
                        <th className="py-3 px-4 text-center">Absen Pulang</th>
                        <th className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">Telat</th>
                        <th className="py-3 px-4 text-center">Pulang Cepat</th>
                        <th className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">Tidak Absen Pulang</th>
                        <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">Tidak Hadir</th>
                        <th className="py-3 px-4 text-center w-28">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/70">
                      {recapSummary.map((item: any, idx: number) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={item.employee_id}
                            className={`hover:bg-emerald-50/40 dark:hover:bg-slate-800/50 transition ${
                              isEven ? 'bg-white/70 dark:bg-slate-900/40' : 'bg-slate-50/50 dark:bg-slate-800/25'
                            }`}
                          >
                            <td className="py-3 px-4 text-center font-bold text-slate-500">
                              {item.no}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900 dark:text-white">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono font-medium">
                                {item.nip}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">
                              {item.department_name}
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums font-bold text-slate-800 dark:text-slate-200">
                              {item.total_masuk} Kali
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums font-bold text-slate-800 dark:text-slate-200">
                              {item.total_pulang} Kali
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums font-bold text-amber-600 dark:text-amber-400">
                              {item.total_telat} Kali
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums font-bold text-slate-600 dark:text-slate-400">
                              {item.total_pulang_cepat} Kali
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums font-bold text-amber-600 dark:text-amber-400">
                              {item.total_lupa_pulang} Kali
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums font-bold text-rose-600 dark:text-rose-400">
                              {item.total_tidak_hadir} Kali
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wide border shadow-xs ${
                                  item.predikat === 'Sangat Baik'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : item.predikat === 'Baik'
                                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                    : item.predikat === 'Kurang Baik'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
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
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10.5px]">
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Pegawai & NIP</th>
                        <th className="py-3 px-4">Divisi</th>
                        <th className="py-3 px-4">Jam Masuk</th>
                        <th className="py-3 px-4">Status Masuk</th>
                        <th className="py-3 px-4">Jam Pulang</th>
                        <th className="py-3 px-4">Status Pulang</th>
                        <th className="py-3 px-4">Alasan / Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/70">
                      {records.map((r: any, rIdx: number) => (
                        <tr key={r.id} className={`hover:bg-emerald-50/40 dark:hover:bg-slate-800/50 transition ${rIdx % 2 === 0 ? 'bg-white/70 dark:bg-slate-900/40' : 'bg-slate-50/50 dark:bg-slate-800/25'}`}>
                          <td className="py-3 px-4 font-mono font-medium">{r.date}</td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {r.employee_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-medium">{r.employee_nip}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">{r.department_name}</td>
                          <td className="py-3 px-4 tabular-nums font-extrabold text-slate-900 dark:text-white">
                            {r.clock_in_time || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs ${
                                r.clock_in_status === 'hadir'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {r.clock_in_status === 'hadir' ? 'Hadir Tepat Waktu' : `Terlambat (+${r.clock_in_minutes_late}m)`}
                            </span>
                          </td>
                          <td className="py-3 px-4 tabular-nums font-extrabold text-slate-900 dark:text-white">
                            {r.clock_out_time || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs ${
                                r.clock_out_status === 'normal'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                  : r.clock_out_status === 'pulang_cepat'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                              }`}
                            >
                              {r.clock_out_status === 'pulang_cepat' ? 'Pulang Cepat' : r.clock_out_time ? 'Sesuai Jadwal' : 'Belum Absen Pulang'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                            {r.notes || r.late_reason || '—'}
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
        stats={stats}
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
