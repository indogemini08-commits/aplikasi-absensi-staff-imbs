'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  User,
  Plus,
  Search,
  Upload,
  Edit,
  KeyRound,
  Check,
  X,
  FileSpreadsheet,
  Building,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  Trash2,
  Square,
  CheckSquare,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';
import { broadcastDataChange, useDataSync } from '@/lib/sync';

export default function PegawaiPage() {
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
  const [employees, setEmployees] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_pegawai_list');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
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
  const [shifts, setShifts] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_shifts_list');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_pegawai_list');
    }
    return true;
  });
  const [search, setSearch] = useState('');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [nip, setNip] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [gender, setGender] = useState('L');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('staff');
  const [shiftId, setShiftId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSV Import Modal state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Manage Account & Password Modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountEmployee, setAccountEmployee] = useState<any>(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountRole, setAccountRole] = useState('staff');
  const [accountIsActive, setAccountIsActive] = useState<boolean>(true);
  const [accountResetType, setAccountResetType] = useState<'none' | 'default' | 'custom'>('none');
  const [accountCustomPass, setAccountCustomPass] = useState('');
  const [accountRequireSetup, setAccountRequireSetup] = useState(true);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showCustomPass, setShowCustomPass] = useState(false);

  // Selection & Delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Real-time synchronization across tabs and pages
  useDataSync(() => {
    fetchEmployees();
  }, ['employees', 'all']);

  const fetchEmployees = async () => {
    try {
      const [userRes, empRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
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

      const data = empRes.ok ? await empRes.json() : { employees: [], departments: [], shifts: [] };
      const emps = data.employees || [];
      const depts = data.departments || [];
      const shfs = data.shifts || [];

      // Sort employees numerically by NIP (e.g. IMBS-001, IMBS-002, ..., IMBS-022)
      const sortedEmps = [...emps].sort((a, b) =>
        (a.nip || '').localeCompare(b.nip || '', undefined, { numeric: true, sensitivity: 'base' })
      );

      setEmployees(sortedEmps);
      setDepartments(depts);
      setShifts(shfs);

      if (typeof window !== 'undefined') {
        try {
          if (sortedEmps.length > 0) {
            sessionStorage.setItem('imbs_pegawai_list', JSON.stringify(sortedEmps));
          } else {
            sessionStorage.removeItem('imbs_pegawai_list');
          }
          if (depts.length > 0) {
            sessionStorage.setItem('imbs_departments_list', JSON.stringify(depts));
          } else {
            sessionStorage.removeItem('imbs_departments_list');
          }
          if (shfs.length > 0) {
            sessionStorage.setItem('imbs_shifts_list', JSON.stringify(shfs));
          } else {
            sessionStorage.removeItem('imbs_shifts_list');
          }
        } catch {}
      }

      if (depts.length > 0 && !departmentId) {
        setDepartmentId(depts[0].id);
      }
      if (shfs.length > 0 && !shiftId) {
        setShiftId(shfs[0].id);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditEmployee(null);
    setNip(`IMBS-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setUsername('');
    setEmail('');
    setPassword('password123');
    setGender('L');
    setPhone('');
    setPosition('');
    setRole('staff');
    setShowModal(true);
  };

  const openEditModal = (emp: any) => {
    setEditEmployee(emp);
    setNip(emp.nip);
    setName(emp.name);
    setUsername(emp.username);
    setEmail(emp.email || '');
    setGender(emp.gender || 'L');
    setPhone(emp.phone || '');
    setDepartmentId(emp.department_id);
    setPosition(emp.position);
    setRole(emp.role);
    setShowModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip || !name || (!editEmployee && !username) || !departmentId || !position) {
      toast.warning('Silakan lengkapi kolom yang wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editEmployee) {
        // Update
        const res = await fetch('/api/employees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editEmployee.id,
            name,
            nip,
            username: username ? username.trim() : undefined,
            email: email ? email.trim() : undefined,
            role,
            gender,
            phone,
            departmentId,
            position,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Gagal memperbarui data');
          setIsSubmitting(false);
          return;
        }
        toast.success(data.message);
      } else {
        // Create
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nip,
            name,
            username,
            email,
            password,
            gender,
            phone,
            departmentId,
            position,
            role,
            shiftId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Gagal menambahkan pegawai');
          setIsSubmitting(false);
          return;
        }
        toast.success(data.message);
      }

      setShowModal(false);
      setIsSubmitting(false);
      broadcastDataChange('employees');
      fetchEmployees();
    } catch (e) {
      toast.error('Terjadi kesalahan sistem');
      setIsSubmitting(false);
    }
  };

  // Manage Account Login & Reset Password Modal Handlers
  const openManageAccountModal = (emp: any) => {
    setAccountEmployee(emp);
    setAccountUsername(emp.username || '');
    setAccountEmail(emp.email || '');
    setAccountRole(emp.role || 'staff');
    setAccountIsActive(emp.is_active === 1);
    setAccountResetType('none');
    setAccountCustomPass('');
    setAccountRequireSetup(true);
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountEmployee) return;

    if (!accountUsername.trim()) {
      toast.warning('Username akun login tidak boleh kosong.');
      return;
    }

    let finalResetPass: string | undefined = undefined;
    if (accountResetType === 'default') {
      finalResetPass = 'password123';
    } else if (accountResetType === 'custom') {
      if (!accountCustomPass || accountCustomPass.length < 6) {
        toast.warning('Kata sandi baru minimal 6 karakter.');
        return;
      }
      finalResetPass = accountCustomPass;
    }

    setIsSavingAccount(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: accountEmployee.id,
          username: accountUsername.trim(),
          email: accountEmail.trim(),
          role: accountRole,
          isActive: accountIsActive ? 1 : 0,
          resetPassword: finalResetPass,
          needsPasswordChange: finalResetPass ? accountRequireSetup : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal memperbarui akun login');
        setIsSavingAccount(false);
        return;
      }

      toast.success(data.message || 'Akun pegawai berhasil diperbarui!');
      setShowAccountModal(false);
      setIsSavingAccount(false);
      broadcastDataChange('employees');
      fetchEmployees();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan');
      setIsSavingAccount(false);
    }
  };

  const handleToggleActive = async (emp: any) => {
    const nextState = emp.is_active === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: emp.id,
          isActive: nextState,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengubah status');
        return;
      }
      toast.success(`Akun ${emp.name} berhasil ${nextState ? 'diaktifkan kembali' : 'dinonaktifkan'}. Data riwayat tetap tersimpan.`);
      broadcastDataChange('employees');
      fetchEmployees();
    } catch (e) {
      toast.error('Gagal memperbarui status');
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      toast.warning('Teks CSV masih kosong');
      return;
    }

    setIsImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      const rows = [];

      for (const line of lines) {
        if (!line.trim() || line.startsWith('#') || line.toLowerCase().startsWith('nama,')) continue;
        const [n, nipVal, uname, mail, pos, g, ph] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        if (n && nipVal) {
          rows.push({
            name: n,
            nip: nipVal,
            username: uname || nipVal.toLowerCase(),
            email: mail || `${nipVal.toLowerCase()}@imbs.sch.id`,
            position: pos || 'Staff Pengajar',
            gender: g || 'L',
            phone: ph || '',
            departmentId,
          });
        }
      }

      if (rows.length === 0) {
        toast.error('Format data CSV tidak valid');
        setIsImporting(false);
        return;
      }

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_csv',
          rows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengimpor');
        setIsImporting(false);
        return;
      }

      toast.success(data.message);
      setShowCsvModal(false);
      setCsvText('');
      setIsImporting(false);
      broadcastDataChange('employees');
      fetchEmployees();
    } catch (e) {
      toast.error('Gagal memproses impor CSV');
      setIsImporting(false);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.nip && e.nip.toLowerCase().includes(q)) ||
      (e.username && e.username.toLowerCase().includes(q)) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.department_name && e.department_name.toLowerCase().includes(q)) ||
      (e.position && e.position.toLowerCase().includes(q))
    );
  });

  const isAllSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((emp) => selectedIds.includes(emp.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map((emp) => emp.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmDeleteSingle = (emp: any) => {
    setEmpToDelete(emp);
    setShowDeleteModal(true);
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setEmpToDelete(null);
    setShowDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    const ids = empToDelete ? [empToDelete.id] : selectedIds;
    if (ids.length === 0) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus akun pegawai');
        setIsDeleting(false);
        return;
      }

      toast.success(data.message || 'Akun pegawai berhasil dihapus.');
      setShowDeleteModal(false);
      setEmpToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setIsDeleting(false);
      broadcastDataChange('employees');
      fetchEmployees();
    } catch (e) {
      console.error(e);
      toast.error('Terjadi kesalahan saat menghapus data pegawai');
      setIsDeleting(false);
    }
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
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Data Pegawai & Akun
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kelola profil staff, NIP, divisi, jadwal shift, dan akun akses sistem
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCsvModal(true)}
                className="py-2.5 px-3.5 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Impor CSV</span>
              </button>

              <button
                onClick={openAddModal}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pegawai Baru</span>
              </button>
            </div>
          </div>

          {/* Selected Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                  {selectedIds.length}
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    {selectedIds.length} Akun Pegawai Dipilih
                  </div>
                  <div className="text-[10.5px] text-rose-600/80 dark:text-rose-400">
                    Pilih aksi massal untuk menghapus akun pegawai yang dicentang
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="py-1.5 px-3 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition cursor-pointer"
                >
                  Batal Pilih
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSelected}
                  className="py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus ({selectedIds.length}) Akun Terpilih</span>
                </button>
              </div>
            </div>
          )}

          {/* Search bar & Statistics */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 glass-card rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama lengkap, NIP, username, email, jabatan, atau divisi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs p-1 focus:outline-hidden text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="glass-card rounded-2xl py-2 px-3.5 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Total Pegawai: <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{filteredEmployees.length}</strong>
                  {search && <span className="text-slate-400 text-[10.5px]"> (dari {employees.length})</span>}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  fetchEmployees();
                  toast.success('Daftar pegawai diperbarui');
                }}
                className="p-2.5 glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Refresh Daftar Pegawai"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Employees Table */}
          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : filteredEmployees.length === 0 ? (
              <EmptyState
                title="Tidak Ada Pegawai Ditemukan"
                description="Belum ada data pegawai atau pencarian tidak menghasilkan data."
              />
            ) : (
              <>
                {/* Desktop View: Full Responsive Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="p-1 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                            title={isAllSelected ? 'Batalkan Semua Pilihan' : 'Pilih Semua Pegawai'}
                          >
                            {isAllSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </th>
                        <th className="py-3.5 px-4">Pegawai & NIP</th>
                        <th className="py-3.5 px-4">Divisi & Jabatan</th>
                        <th className="py-3.5 px-4">Akun & Role</th>
                        <th className="py-3.5 px-4">Jadwal Kerja Departemen</th>
                        <th className="py-3.5 px-4">Sisa Cuti</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredEmployees.map((emp) => {
                        const isSelected = selectedIds.includes(emp.id);
                        return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20 ' : ''
                          }${emp.is_active === 0 ? 'opacity-60 bg-slate-100/40 dark:bg-slate-900/40' : ''}`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelect(emp.id)}
                              className="p-1 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-600/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100">
                                  {emp.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {emp.nip}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-700 dark:text-slate-200">
                              {emp.department_name}
                            </div>
                            <div className="text-[10px] text-slate-500">{emp.position}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
                                  @{emp.username}
                                </span>
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                  {emp.role}
                                </span>
                                {Number(emp.needs_password_change) === 1 && (
                                  <span
                                    className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200/50"
                                    title="Pegawai belum membuat kata sandi mandiri (masih menggunakan sandi sementara)"
                                  >
                                    Sandi Awal
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]" title={emp.email || 'Belum ada email'}>
                                {emp.email || '-'}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
                              {emp.dept_start_time || '07:30'} - {emp.dept_end_time || '16:00'} WIB
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[9px]">
                                {Array.isArray(emp.dept_work_days) ? emp.dept_work_days.length : 5} Hari Kerja
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                +{emp.dept_grace_period ?? 10}m
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {emp.leave_remaining ?? 12} Hari
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${emp.is_active === 1
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                            >
                              {emp.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openManageAccountModal(emp)}
                                className="p-1.5 rounded-lg text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white transition shadow-2xs"
                                title="Kelola Akun Login & Reset Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(emp)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                                title="Edit Profil Pegawai"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(emp)}
                                className={`p-1.5 rounded-lg transition ${emp.is_active === 1
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  }`}
                                title={emp.is_active === 1 ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                              >
                                {emp.is_active === 1 ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDeleteSingle(emp)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Hapus Akun Pegawai"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: High Performance Card Stream */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2.5 space-y-3">
                  {filteredEmployees.map((emp) => {
                    const isSelected = selectedIds.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500/50 shadow-xs ring-1 ring-blue-500/30'
                            : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 shadow-xs'
                        } ${emp.is_active === 0 ? 'opacity-60' : ''}`}
                      >
                        {/* Header: Checkbox + Avatar + Name + Status */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleSelect(emp.id)}
                              className="p-1 -ml-1 text-slate-400 hover:text-blue-600 transition shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/20">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {emp.name}
                              </h4>
                              <div className="text-[10px] text-slate-400 font-mono">
                                NIP: {emp.nip}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold shrink-0 ${
                              emp.is_active === 1
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {emp.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 block">Divisi & Jabatan</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {emp.department_name}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">{emp.position}</span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 block">Akun & Role</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                              @{emp.username}
                            </span>
                            <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{emp.email || '-'}</div>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 block">Jadwal Departemen</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {emp.dept_start_time || '07:30'} - {emp.dept_end_time || '16:00'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 block">Sisa Cuti</span>
                            <span className="font-black text-blue-600 dark:text-blue-400">
                              {emp.leave_remaining ?? 12} Hari
                            </span>
                          </div>
                        </div>

                        {/* Mobile Actions Toolbar */}
                        <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => openManageAccountModal(emp)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition border border-blue-200/50 dark:border-blue-900/50 cursor-pointer"
                            title="Kelola Akun Login & Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                            <span>Akun & Sandi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(emp)}
                            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              emp.is_active === 1
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {emp.is_active === 1 ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            <span>{emp.is_active === 1 ? 'Nonaktif' : 'Aktif'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmDeleteSingle(emp)}
                            className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editEmployee ? `Edit Data Pegawai: ${editEmployee.name}` : 'Tambah Pegawai Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIP Pegawai (Nomor Induk):
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: IMBS-108"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap beserta gelar..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Divisi / Unit Kerja:
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jabatan:
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Contoh: Guru Bahasa Arab / Wali Asrama"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Real-time Department Schedule Preview Card */}
          {(() => {
            const selectedDept = departments.find((d) => d.id === departmentId);
            const workDays: string[] = selectedDept
              ? Array.isArray(selectedDept.work_days)
                ? selectedDept.work_days
                : typeof selectedDept.work_days === 'string'
                  ? JSON.parse(selectedDept.work_days)
                  : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
              : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

            return (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-800 dark:text-blue-200">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Jadwal Kerja Departemen Terintegrasi Otomatis
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    Auto-inherit
                  </span>
                </div>

                {selectedDept ? (
                  <div className="space-y-2 pt-1 border-t border-blue-200/60 dark:border-blue-800/40">
                    <div className="text-xs text-slate-700 dark:text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Hari Kerja Aktif:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {workDays.length} Hari ({workDays.join(', ')})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Toleransi Keterlambatan:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          +{selectedDept.grace_period_minutes ?? 10} Menit
                        </span>
                      </div>
                    </div>

                    {/* Daily Hours Pills */}
                    {selectedDept.daily_schedules && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px]">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                          const dCfg = selectedDept.daily_schedules[day];
                          return (
                            <div
                              key={day}
                              className={`p-1.5 rounded-lg border ${
                                dCfg?.isActive
                                  ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 text-slate-700 dark:text-slate-200'
                                  : 'bg-slate-100/60 dark:bg-slate-900 border-dashed border-slate-200 text-slate-400'
                              }`}
                            >
                              <div className="font-bold">{day}:</div>
                              <div className="font-mono">{dCfg?.isActive ? `${dCfg.startTime}–${dCfg.endTime}` : 'Libur'}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">Pilih divisi untuk melihat jadwal kerja otomatis.</p>
                )}
                <div className="text-[10px] text-blue-700/80 dark:text-blue-400/80 italic">
                  * Jadwal kerja ini diambil langsung secara real-time dari Pengaturan Jadwal Kerja Departemen/Divisi.
                </div>
              </div>
            );
          })()}

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username Akun Login: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: ahmad.fauzi"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {editEmployee ? 'Email Login Terdaftar:' : 'Kata Sandi Awal:'}
                </label>
                {editEmployee ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@imbs.sch.id"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                  />
                ) : (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Default: password123"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>

            {!editEmployee ? (
              <div className="flex items-center gap-2 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-200/50 dark:border-blue-900/50">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Aktivasi Sandi Mandiri:</strong> Pegawai baru akan langsung diwajibkan membuat kata sandi mandiri begitu pertama kali masuk.
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Untuk mereset password atau pemulihan akses akun, gunakan tombol <strong>Kelola Akun (Ikon Kunci)</strong> pada tabel data.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Kelamin:
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="L">Laki-Laki (Ikhwan)</option>
                <option value="P">Perempuan (Akhwat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No HP / WhatsApp:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editEmployee ? 'Simpan Perubahan' : 'Tambahkan Pegawai'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        title="Impor Pegawai dari File / Teks CSV"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
            <div className="font-bold mb-1">Format Kolom CSV:</div>
            <code>nama,nip,username,email,jabatan,gender(L/P),telepon</code>
            <p className="mt-1 text-[11px] text-blue-800 dark:text-blue-300">
              Setiap baris mewakili 1 pegawai. Password otomatis di-set ke: <code>password123</code>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tempel (Paste) Konten CSV:
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Ust. Hasan Al-Banna,IMBS-109,hasan,hasan@imbs.sch.id,Guru Tahfidz,L,081233445566&#10;Ustadzah Aisyah,IMBS-110,aisyah,aisyah@imbs.sch.id,Pembina Asrama,P,081244556677"
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCsvModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={handleImportCsv}
              disabled={isImporting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Proses Impor Data
            </button>
          </div>
        </div>
      </Modal>

      {/* Manage Account & Password Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title={`Pengelolaan Akun: ${accountEmployee?.name || 'Pegawai'}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          {/* Account Profile Header */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/80 dark:border-blue-800/60 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
                {accountEmployee?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">
                  {accountEmployee?.name}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                  NIP: {accountEmployee?.nip} • Divisi: {accountEmployee?.department_name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  Jabatan: {accountEmployee?.position}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  accountIsActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {accountIsActive ? 'Akun Aktif' : 'Akun Nonaktif'}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Role: {accountRole}
              </span>
            </div>
          </div>

          {/* Section 1: Username & Email Login Information */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Informasi Kredensial Login Pegawai</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Pegawai dapat login menggunakan <strong>Username</strong> maupun <strong>Email</strong> terdaftar. Anda dapat memperbaruinya di sini apabila pegawai mengalami lupa username atau perubahan email.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username Login: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountUsername}
                  onChange={(e) => setAccountUsername(e.target.value)}
                  placeholder="Contoh: ujang.nasirudin"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Login:
                </label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="ujang@imbs.sch.id"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Password Reset & Security Management */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Opsi Reset Kata Sandi Pegawai</span>
              </div>
              {Number(accountEmployee?.needs_password_change) === 1 ? (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                  Belum Buat Sandi Mandiri
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  Sandi Mandiri Aktif
                </span>
              )}
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400">
                <input
                  type="radio"
                  name="resetOption"
                  checked={accountResetType === 'none'}
                  onChange={() => setAccountResetType('none')}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Pertahankan Kata Sandi Saat Ini
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Kata sandi pegawai tidak diubah sama sekali.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400">
                <input
                  type="radio"
                  name="resetOption"
                  checked={accountResetType === 'default'}
                  onChange={() => setAccountResetType('default')}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>Reset Cepat ke Sandi Default</span>
                    <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.2 rounded text-[10px] text-blue-600 font-bold">
                      password123
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sandi akan dikembalikan ke default dan pegawai wajib membuat sandi baru saat login berikutnya.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400">
                <input
                  type="radio"
                  name="resetOption"
                  checked={accountResetType === 'custom'}
                  onChange={() => setAccountResetType('custom')}
                  className="text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Tentukan Kata Sandi Baru Secara Manual
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Buatkan kata sandi sementara khusus untuk pegawai ini.
                  </div>
                </div>
              </label>
            </div>

            {/* Custom password field if selected */}
            {accountResetType === 'custom' && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 mt-2 space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Masukkan Kata Sandi Baru: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCustomPass ? 'text' : 'password'}
                    value={accountCustomPass}
                    onChange={(e) => setAccountCustomPass(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-mono"
                    required={accountResetType === 'custom'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomPass(!showCustomPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCustomPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Mandatory personal password setup toggle */}
            {accountResetType !== 'none' && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accountRequireSetup}
                  onChange={(e) => setAccountRequireSetup(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Wajibkan pegawai membuat kata sandi mandiri saat pertama kali login setelah reset</span>
              </label>
            )}
          </div>

          {/* Section 3: Status Akses Akun (Aktif / Nonaktif) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Status Keaktifan Akun Pegawai:
              </div>
              <div className="text-[11px] text-slate-500">
                {accountIsActive
                  ? 'Pegawai dapat login dan mencatat absensi seperti biasa.'
                  : 'Akun dinonaktifkan. Pegawai tidak dapat login ke portal.'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAccountIsActive(!accountIsActive)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                accountIsActive
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {accountIsActive ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Nonaktifkan Akun</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Aktifkan Akun</span>
                </>
              )}
            </button>
          </div>

          {/* Security Disclaimer Notice */}
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-[10.5px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Ketentuan Keamanan:</strong> Demi privasi pegawai, Administrator tidak dapat melihat password asli karena tersimpan dalam bentuk enkripsi satu arah (bcrypt hash). Seluruh tindakan perubahan kredensial dan reset sandi otomatis tercatat pada <strong>Audit Log</strong> sistem.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAccountModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingAccount}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isSavingAccount ? 'Menyimpan Akun...' : 'Simpan Perubahan Akun'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title={empToDelete ? 'Konfirmasi Hapus Akun Pegawai' : `Hapus ${selectedIds.length} Akun Pegawai Terpilih`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-rose-800 dark:text-rose-200">
              <div className="font-bold text-sm mb-1">
                {empToDelete
                  ? `Hapus akun "${empToDelete.name}"?`
                  : `Hapus ${selectedIds.length} akun pegawai terpilih?`}
              </div>
              <p className="leading-relaxed">
                Tindakan ini akan menghapus akun pegawai beserta seluruh riwayat terkait (jadwal, saldo cuti, dan akun login).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteDelete}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {empToDelete ? 'Ya, Hapus Akun' : `Ya, Hapus ${selectedIds.length} Akun`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

