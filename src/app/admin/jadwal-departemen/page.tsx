'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Building,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Calendar,
  AlertCircle,
  Sparkles,
  Sliders,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { useToast } from '@/components/ToastContext';
import { broadcastDataChange, useDataSync } from '@/lib/sync';

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const DAY_SHORT: Record<string, string> = {
  Senin: 'Sen',
  Selasa: 'Sel',
  Rabu: 'Rab',
  Kamis: 'Kam',
  Jumat: 'Jum',
  Sabtu: 'Sab',
  Minggu: 'Min',
};

interface DayConfig {
  isActive: boolean;
  startTime: string;
  endTime: string;
}

type DailySchedules = Record<string, DayConfig>;

function getDefaultDailySchedule(type: '5days' | '6days' = '5days'): DailySchedules {
  return {
    Senin: { isActive: true, startTime: '07:30', endTime: '16:00' },
    Selasa: { isActive: true, startTime: '07:30', endTime: '16:00' },
    Rabu: { isActive: true, startTime: '07:30', endTime: '16:00' },
    Kamis: { isActive: true, startTime: '07:30', endTime: '16:00' },
    Jumat: { isActive: true, startTime: '07:30', endTime: '11:30' },
    Sabtu: { isActive: type === '6days', startTime: '08:00', endTime: '12:00' },
    Minggu: { isActive: false, startTime: '08:00', endTime: '16:00' },
  };
}

function getScheduleSummary(dailySchedules: DailySchedules) {
  const activeDays = ALL_DAYS.filter((d) => dailySchedules[d]?.isActive);
  const offDays = ALL_DAYS.filter((d) => !dailySchedules[d]?.isActive);

  const mon = dailySchedules['Senin'];
  const fri = dailySchedules['Jumat'];
  const sat = dailySchedules['Sabtu'];

  let primaryHours = 'Belum Dikonfigurasi';
  let specialNote = '';

  if (mon?.isActive) {
    primaryHours = `${mon.startTime} – ${mon.endTime} WIB`;
    const notes: string[] = [];
    if (fri?.isActive && fri.endTime !== mon.endTime) {
      notes.push(`Jum: s.d ${fri.endTime}`);
    }
    if (sat?.isActive) {
      notes.push(`Sab: ${sat.startTime}–${sat.endTime}`);
    }
    if (notes.length > 0) {
      specialNote = `(${notes.join(' • ')})`;
    }
  } else if (activeDays.length > 0) {
    const first = dailySchedules[activeDays[0]];
    primaryHours = `${first.startTime} – ${first.endTime} WIB`;
  }

  return {
    activeDaysCount: activeDays.length,
    offDaysCount: offDays.length,
    primaryHours,
    specialNote,
  };
}

export default function JadwalDepartemenPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [departments, setDepartments] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_jadwal_depts');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [employees, setEmployees] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_jadwal_emps');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_jadwal_depts');
    }
    return true;
  });
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);
  const [showStaffTable, setShowStaffTable] = useState(false);

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Selection state for deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Schedule Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [editGracePeriod, setEditGracePeriod] = useState<number>(10);
  const [editDailySchedules, setEditDailySchedules] = useState<DailySchedules>(getDefaultDailySchedule('5days'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Department Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addManager, setAddManager] = useState('');
  const [addGracePeriod, setAddGracePeriod] = useState<number>(10);
  const [addDailySchedules, setAddDailySchedules] = useState<DailySchedules>(getDefaultDailySchedule('5days'));
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time synchronization
  useDataSync(() => {
    fetchData();
  }, ['departments', 'all']);

  const fetchData = async () => {
    try {
      const [userRes, deptRes, empRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/departments', { cache: 'no-store' }),
        fetch('/api/employees', { cache: 'no-store' }),
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
        try {
          localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
        } catch {}
      }

      const deptData = deptRes.ok ? await deptRes.json() : { departments: [] };
      const depts = deptData.departments || [];
      setDepartments(depts);

      const empData = empRes.ok ? await empRes.json() : { employees: [] };
      const emps = empData.employees || [];
      setEmployees(emps);

      if (typeof window !== 'undefined') {
        try {
          if (depts.length > 0) {
            sessionStorage.setItem('imbs_jadwal_depts', JSON.stringify(depts));
          } else {
            sessionStorage.removeItem('imbs_jadwal_depts');
          }
          if (emps.length > 0) {
            sessionStorage.setItem('imbs_jadwal_emps', JSON.stringify(emps));
          } else {
            sessionStorage.removeItem('imbs_jadwal_emps');
          }
        } catch {}
      }

      setSelectedIds([]);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // --- SELECTION HANDLING ---
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === departments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(departments.map((d) => d.id));
    }
  };

  const confirmDeleteSingle = (dept: any) => {
    setDeptToDelete([dept]);
    setShowDeleteModal(true);
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const targets = departments.filter((d) => selectedIds.includes(d.id));
    setDeptToDelete(targets);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (deptToDelete.length === 0) return;

    // Safety check: any target department has active employees?
    const busyDepts = deptToDelete.filter((d) => (d.employee_count ?? 0) > 0);
    if (busyDepts.length > 0) {
      toast.error(
        `Departemen "${busyDepts[0].name}" masih memiliki ${busyDepts[0].employee_count} pegawai aktif. Pindahkan staf terlebih dahulu sebelum menghapus divisi.`
      );
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deptToDelete.map((d) => d.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus departemen');
        setIsDeleting(false);
        return;
      }

      toast.success(data.message || 'Departemen berhasil dihapus.');
      setShowDeleteModal(false);
      setIsDeleting(false);
      broadcastDataChange('departments');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Terjadi kesalahan saat menghapus');
      setIsDeleting(false);
    }
  };

  // --- EDIT SCHEDULE MODAL ---
  const openEditSchedule = (dept: any) => {
    setEditingDept(dept);
    setEditGracePeriod(dept.grace_period_minutes ?? 10);

    const initialSchedule = dept.daily_schedules && typeof dept.daily_schedules === 'object'
      ? dept.daily_schedules
      : getDefaultDailySchedule('5days');

    // Ensure all 7 days exist
    const fullSchedule: DailySchedules = {};
    for (const day of ALL_DAYS) {
      fullSchedule[day] = initialSchedule[day] ? {
        isActive: !!initialSchedule[day].isActive,
        startTime: initialSchedule[day].startTime || '07:30',
        endTime: initialSchedule[day].endTime || '16:00',
      } : {
        isActive: day !== 'Minggu',
        startTime: dept.start_time || '07:30',
        endTime: day === 'Jumat' ? '11:30' : (dept.end_time || '16:00'),
      };
    }

    setEditDailySchedules(fullSchedule);
    setShowEditModal(true);
  };

  const updateEditDay = (day: string, field: keyof DayConfig, value: any) => {
    setEditDailySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const copyMondayToAllEdit = () => {
    const monday = editDailySchedules['Senin'];
    if (!monday) return;
    setEditDailySchedules((prev) => {
      const next: DailySchedules = { ...prev };
      for (const day of ALL_DAYS) {
        if (day !== 'Minggu') {
          next[day] = {
            ...next[day],
            isActive: true,
            startTime: monday.startTime,
            endTime: day === 'Jumat' ? '11:30' : monday.endTime,
          };
        }
      }
      return next;
    });
    toast.success('Jam kerja Senin disalin ke hari kerja lainnya (Jumat disesuaikan 11:30)');
  };

  const handleSaveEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;

    // Check at least one active day
    const hasActiveDay = Object.values(editDailySchedules).some((d) => d.isActive);
    if (!hasActiveDay) {
      toast.warning('Departemen harus memiliki sekurang-kurangnya 1 hari kerja aktif.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDept.id,
          gracePeriodMinutes: Number(editGracePeriod),
          dailySchedules: editDailySchedules,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan konfigurasi');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message || 'Jadwal harian departemen berhasil diperbarui!');
      setShowEditModal(false);
      setIsSubmitting(false);
      broadcastDataChange('departments');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan');
      setIsSubmitting(false);
    }
  };

  // --- ADD DEPARTMENT MODAL ---
  const openAddModal = () => {
    setAddName('');
    setAddCode('');
    setAddDesc('');
    setAddManager('');
    setAddGracePeriod(10);
    setAddDailySchedules(getDefaultDailySchedule('5days'));
    setShowAddModal(true);
  };

  const updateAddDay = (day: string, field: keyof DayConfig, value: any) => {
    setAddDailySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addCode.trim()) {
      toast.warning('Nama dan kode departemen wajib diisi');
      return;
    }

    const hasActiveDay = Object.values(addDailySchedules).some((d) => d.isActive);
    if (!hasActiveDay) {
      toast.warning('Pilih minimal satu hari kerja aktif.');
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          code: addCode.trim().toUpperCase(),
          description: addDesc.trim(),
          managerName: addManager.trim(),
          gracePeriodMinutes: Number(addGracePeriod),
          dailySchedules: addDailySchedules,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menambahkan departemen');
        setIsAdding(false);
        return;
      }

      toast.success(data.message || 'Departemen baru berhasil ditambahkan!');
      setShowAddModal(false);
      setIsAdding(false);
      broadcastDataChange('departments');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menambahkan');
      setIsAdding(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (selectedDeptFilter === 'ALL') return true;
    return emp.department_id === selectedDeptFilter;
  });

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar userRole={user?.role} />
        <main className="flex-1 w-full min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    Pengaturan Jadwal Kerja Departemen/Divisi
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    Konfigurasi jam masuk & pulang terpisah per hari (Senin s.d. Minggu), toleransi keterlambatan, dan manajemen divisi
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Batch Delete Button when items are selected */}
              {selectedIds.length > 0 && (
                <button
                  onClick={confirmDeleteSelected}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm animate-in fade-in"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Terpilih ({selectedIds.length})
                </button>
              )}

              {/* Add Department Button */}
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                Tambah Departemen Baru
              </button>

              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Selection Control Bar */}
          {departments.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition"
                >
                  {selectedIds.length === departments.length && departments.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Pilih Semua ({departments.length} Departemen)</span>
                </button>
                {selectedIds.length > 0 && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                    {selectedIds.length} dipilih
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 hidden sm:block">
                Centang untuk menghapus divisi yang tidak diperlukan
              </div>
            </div>
          )}

          {/* Department Cards Grid (Simplified & Clean) */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 animate-pulse p-5"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => {
                const dailySchedules: DailySchedules = dept.daily_schedules || getDefaultDailySchedule('5days');
                const isSelected = selectedIds.includes(dept.id);
                const isExpanded = expandedCardIds.includes(dept.id);
                const summary = getScheduleSummary(dailySchedules);

                return (
                  <div
                    key={dept.id}
                    className={`glass-card rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md relative group ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                        : 'border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/50'
                    }`}
                  >
                    <div>
                      {/* Top Header & Selection Checkbox */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(dept.id)}
                            className="mt-1 text-slate-400 hover:text-blue-600 transition shrink-0"
                            title={isSelected ? 'Batalkan pilihan' : 'Pilih departemen ini'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {dept.code}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                                <Users className="w-3 h-3" />
                                {dept.employee_count ?? 0} Staf
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mt-1 leading-snug truncate" title={dept.name}>
                              {dept.name}
                            </h3>
                          </div>
                        </div>

                        {/* Individual Delete Button */}
                        <button
                          type="button"
                          onClick={() => confirmDeleteSingle(dept)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-70 hover:opacity-100 shrink-0"
                          title="Hapus Departemen Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Primary Work Hours & Tolerance (Simple Clean Summary) */}
                      <div className="my-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Jam Kerja Utama
                          </div>
                          <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                            {summary.primaryHours}
                          </div>
                          {summary.specialNote && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {summary.specialNote}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Toleransi
                          </div>
                          <div className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                            +{dept.grace_period_minutes ?? 10} mnt
                          </div>
                        </div>
                      </div>

                      {/* 7-Day Status Chips (Horizontal Bar) */}
                      <div className="space-y-1.5 mb-3.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Hari Kerja ({summary.activeDaysCount} Aktif / {summary.offDaysCount} Libur)
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleExpandCard(dept.id)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-0.5 transition"
                          >
                            <span>{isExpanded ? 'Tutup Detail' : 'Detail Hari'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {ALL_DAYS.map((day) => {
                            const cfg = dailySchedules[day];
                            const isActive = cfg?.isActive;
                            const short = DAY_SHORT[day];
                            return (
                              <div
                                key={day}
                                title={`${day}: ${isActive ? `${cfg.startTime} - ${cfg.endTime} WIB` : 'Libur Rutin'}`}
                                className={`py-1.5 rounded-lg text-[10px] text-center font-bold transition select-none ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-normal line-through opacity-60'
                                }`}
                              >
                                {short}
                              </div>
                            );
                          })}
                        </div>

                        {/* Collapsible 7-day breakdown if toggled */}
                        {isExpanded && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] animate-in fade-in">
                            {ALL_DAYS.map((day) => {
                              const cfg = dailySchedules[day];
                              return (
                                <div key={day} className="flex items-center justify-between py-0.5 px-1 rounded text-slate-600 dark:text-slate-300">
                                  <span className="font-medium">{day}:</span>
                                  {cfg?.isActive ? (
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                      {cfg.startTime} – {cfg.endTime} WIB
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">Libur Rutin</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => openEditSchedule(dept)}
                      className="w-full py-2 px-3 rounded-xl border border-blue-600/30 hover:border-blue-500 bg-blue-500/10 hover:bg-blue-600 text-blue-700 hover:text-white dark:text-blue-300 dark:hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition duration-200 mt-1"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Atur Jam Kerja Harian
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Collapsible Section: Live Staff Schedule Integration View */}
          <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm">
            <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100">
                    Jadwal Staf Otomatis Terhubung ({filteredEmployees.length} Pegawai)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Staf otomatis mengikuti jam kerja departemen masing-masing
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showStaffTable && (
                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <option value="ALL">Semua Divisi ({employees.length})</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setShowStaffTable(!showStaffTable)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <span>{showStaffTable ? 'Sembunyikan Tabel' : 'Buka Tabel Staf'}</span>
                  {showStaffTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {showStaffTable && (
              <div className="overflow-x-auto border-t border-slate-200/80 dark:border-slate-800/80 animate-in fade-in">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      <th className="py-3 px-4">Pegawai & NIP</th>
                      <th className="py-3 px-4">Departemen / Divisi</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">Ringkasan Jam Harian (Sen-Jum/Sab)</th>
                      <th className="py-3 px-4">Toleransi</th>
                      <th className="py-3 px-4">Status Integrasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          Tidak ada data pegawai pada divisi ini.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const dept = departments.find((d) => d.id === emp.department_id);
                        const daily: DailySchedules = dept?.daily_schedules || getDefaultDailySchedule('5days');

                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {emp.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{emp.nip}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {emp.department_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {emp.position}
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 text-[11px]">
                                <div>
                                  <span className="text-slate-400">Sen–Kam: </span>
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                    {daily['Senin']?.isActive ? `${daily['Senin'].startTime}–${daily['Senin'].endTime}` : 'Libur'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Jum: </span>
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                    {daily['Jumat']?.isActive ? `${daily['Jumat'].startTime}–${daily['Jumat'].endTime}` : 'Libur'}
                                  </span>
                                  <span className="text-slate-400 ml-2">Sab: </span>
                                  <span className="font-mono text-slate-600 dark:text-slate-400">
                                    {daily['Sabtu']?.isActive ? `${daily['Sabtu'].startTime}–${daily['Sabtu'].endTime}` : 'Libur'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                +{dept?.grace_period_minutes ?? 10} mnt
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                Otomatis Aktif
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: Edit Daily Schedules for a Department */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Atur Jam Kerja Harian: ${editingDept?.name || 'Departemen'}`}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveEditSchedule} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Departemen: {editingDept?.name} ({editingDept?.code})
              </div>
              <div className="text-slate-500 text-[11px]">
                Mengatur jadwal untuk <strong>{editingDept?.employee_count ?? 0} orang staf aktif</strong>.
              </div>
            </div>

            <button
              type="button"
              onClick={copyMondayToAllEdit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-200 transition"
              title="Salin jam Senin ke hari kerja lainnya"
            >
              <Copy className="w-3 h-3" />
              Salin Jam Senin ke Semua Hari
            </button>
          </div>

          {/* Tolerance Setting */}
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                Toleransi Keterlambatan Departemen:
              </label>
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                Dispensasi menit sebelum pegawai dinyatakan terlambat
              </span>
            </div>
            <div className="relative w-32">
              <input
                type="number"
                min="0"
                max="60"
                value={editGracePeriod}
                onChange={(e) => setEditGracePeriod(Number(e.target.value))}
                className="w-full p-2 pr-12 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-amber-500 font-mono"
                required
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">Menit</span>
            </div>
          </div>

          {/* 7-Day Configuration Table/Cards */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Atur Jam Kerja per Hari (Senin – Minggu):
            </div>

            {ALL_DAYS.map((day) => {
              const dayCfg = editDailySchedules[day] || {
                isActive: day !== 'Minggu',
                startTime: '07:30',
                endTime: day === 'Jumat' ? '11:30' : '16:00',
              };

              return (
                <div
                  key={day}
                  className={`p-3 rounded-xl border transition-all ${
                    dayCfg.isActive
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Day Name & Toggle */}
                    <div className="flex items-center gap-3 min-w-[130px]">
                      <button
                        type="button"
                        onClick={() => updateEditDay(day, 'isActive', !dayCfg.isActive)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          dayCfg.isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {dayCfg.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{day}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{day} (Libur)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Time Inputs */}
                    {dayCfg.isActive ? (
                      <div className="flex-1 grid grid-cols-2 gap-3 items-center text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Jam Masuk:</label>
                          <input
                            type="time"
                            value={dayCfg.startTime}
                            onChange={(e) => updateEditDay(day, 'startTime', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500"
                            required={dayCfg.isActive}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Jam Pulang:</label>
                          <input
                            type="time"
                            value={dayCfg.endTime}
                            onChange={(e) => updateEditDay(day, 'endTime', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500"
                            required={dayCfg.isActive}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-slate-400 text-xs italic py-1">
                        Ditetapkan sebagai hari libur / nonaktif bekerja untuk departemen ini.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi Jadwal Harian'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Add New Department */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Departemen / Divisi Baru"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Departemen / Divisi:
              </label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Contoh: Hubungan Masyarakat & Syiar"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kode Singkatan (Maks 6 Huruf):
              </label>
              <input
                type="text"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                placeholder="Contoh: HUMAS"
                maxLength={8}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kepala / Koordinator (Opsional):
              </label>
              <input
                type="text"
                value={addManager}
                onChange={(e) => setAddManager(e.target.value)}
                placeholder="Nama penanggung jawab..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Toleransi Keterlambatan:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={addGracePeriod}
                  onChange={(e) => setAddGracePeriod(Number(e.target.value))}
                  className="w-full p-2.5 pr-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">Menit</span>
              </div>
            </div>
          </div>

          {/* 7-Day Configuration Builder for New Department */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Konfigurasi Jadwal Harian Awal (Senin – Minggu):
              </span>
              <span className="text-[10px] text-slate-500">
                (Dapat disesuaikan kembali sewaktu-waktu)
              </span>
            </div>

            <div className="max-h-[42vh] overflow-y-auto space-y-2 pr-1">
              {ALL_DAYS.map((day) => {
                const dayCfg = addDailySchedules[day] || {
                  isActive: day !== 'Minggu',
                  startTime: '07:30',
                  endTime: day === 'Jumat' ? '11:30' : '16:00',
                };

                return (
                  <div
                    key={day}
                    className={`p-2.5 rounded-xl border text-xs transition ${
                      dayCfg.isActive
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => updateAddDay(day, 'isActive', !dayCfg.isActive)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                          dayCfg.isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {dayCfg.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{day}</span>
                      </button>

                      {dayCfg.isActive ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Masuk:</span>
                            <input
                              type="time"
                              value={dayCfg.startTime}
                              onChange={(e) => updateAddDay(day, 'startTime', e.target.value)}
                              className="p-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Pulang:</span>
                            <input
                              type="time"
                              value={dayCfg.endTime}
                              onChange={(e) => updateAddDay(day, 'endTime', e.target.value)}
                              className="p-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Libur Rutin</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAdding ? 'Menambahkan...' : 'Tambah Departemen & Terapkan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Delete Confirmation */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Konfirmasi Hapus Departemen"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <div className="font-bold">Apakah Anda yakin ingin menghapus departemen berikut?</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {deptToDelete.map((d) => (
                  <li key={d.id}>
                    <strong>{d.name}</strong> ({d.code}) — {d.employee_count ?? 0} staf terdaftar
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Departemen yang memiliki staf aktif tidak dapat dihapus demi menjaga integritas data kepegawaian dan histori absensi.
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={executeDelete}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus Departemen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
