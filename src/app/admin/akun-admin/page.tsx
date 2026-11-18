'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  UserPlus,
  KeyRound,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Lock,
  Mail,
  Phone,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  User,
  Users,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { useToast } from '@/components/ToastContext';
import { broadcastDataChange, useDataSync } from '@/lib/sync';

interface AdminAccount {
  id: string;
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'hrd' | 'tu';
  is_active: number;
  full_name?: string;
  phone?: string;
  last_login_at?: string;
  last_login_ip?: string;
  created_at: string;
  position?: string;
}

export default function PengaturanAkunAdminPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [securitySettings, setSecuritySettings] = useState<Record<string, any>>({
    session_timeout_days: '7',
    admin_require_strong_pass: '1',
    admin_login_lockout_attempts: '5',
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal 1: Add New Admin
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    role: 'admin',
    password: '',
    confirmPassword: '',
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Modal 2: Edit Admin
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'admin',
    isActive: 1,
  });
  const [isEditing, setIsEditing] = useState(false);

  // Modal 3: Change Password
  const [showPassModal, setShowPassModal] = useState(false);
  const [passAccount, setPassAccount] = useState<AdminAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Modal 4: Delete Confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<AdminAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Security Policy Saving
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useDataSync(() => {
    fetchData();
  }, ['admin-accounts', 'users', 'all']);

  const fetchData = async () => {
    try {
      const [authRes, accRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/admin-accounts', { cache: 'no-store' }),
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      if (authData?.user?.role === 'staff') {
        router.push('/dashboard');
        return;
      }

      setUser(authData.user);

      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
        setCurrentUserRole(accData.currentUserRole || authData.user.role);
        setCurrentUserId(accData.currentUserId || authData.user.userId);
        if (accData.securitySettings) {
          setSecuritySettings(accData.securitySettings);
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const isSuperadmin = currentUserRole === 'superadmin';

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchRole = roleFilter === 'ALL' || acc.role === roleFilter;
    const matchQuery =
      searchQuery.trim() === '' ||
      acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.full_name && acc.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (acc.email && acc.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchRole && matchQuery;
  });

  // Role badges & helpers
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Superadmin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Administrator
          </span>
        );
      case 'hrd':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-xs">
            <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            HRD & Personalia
          </span>
        );
      case 'tu':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 shadow-xs">
            <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Petugas TU
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {role}
          </span>
        );
    }
  };

  // --- ACTIONS ---

  // 1. Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.username.trim() || !addForm.password.trim()) {
      toast.warning('Username dan password wajib diisi.');
      return;
    }
    if (addForm.password !== addForm.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok.');
      return;
    }
    if (addForm.password.length < 6) {
      toast.warning('Password minimal 6 karakter.');
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch('/api/admin-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addForm.username.trim(),
          email: addForm.email.trim(),
          fullName: addForm.fullName.trim(),
          phone: addForm.phone.trim(),
          role: addForm.role,
          password: addForm.password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menambahkan akun admin.');
        setIsAdding(false);
        return;
      }

      toast.success(data.message || 'Akun admin berhasil dibuat.');
      setShowAddModal(false);
      setAddForm({
        username: '',
        email: '',
        fullName: '',
        phone: '',
        role: 'admin',
        password: '',
        confirmPassword: '',
      });
      setIsAdding(false);
      broadcastDataChange('admin-accounts');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan.');
      setIsAdding(false);
    }
  };

  // 2. Open Edit
  const openEdit = (acc: AdminAccount) => {
    setEditingAccount(acc);
    setEditForm({
      fullName: acc.full_name || '',
      email: acc.email || '',
      phone: acc.phone || '',
      role: acc.role,
      isActive: acc.is_active,
    });
    setShowEditModal(true);
  };

  // 3. Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    setIsEditing(true);
    try {
      const res = await fetch('/api/admin-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAccount.id,
          fullName: editForm.fullName,
          email: editForm.email,
          phone: editForm.phone,
          role: isSuperadmin ? editForm.role : undefined,
          isActive: isSuperadmin ? editForm.isActive : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal memperbarui akun.');
        setIsEditing(false);
        return;
      }

      toast.success(data.message || 'Data akun berhasil diperbarui.');
      setShowEditModal(false);
      setIsEditing(false);
      broadcastDataChange('admin-accounts');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan.');
      setIsEditing(false);
    }
  };

  // 4. Quick Toggle Active
  const handleToggleActive = async (acc: AdminAccount) => {
    if (!isSuperadmin) {
      toast.warning('Hanya Superadmin yang dapat mengubah status aktif akun.');
      return;
    }
    if (acc.id === currentUserId) {
      toast.warning('Anda tidak dapat menonaktifkan akun Anda sendiri.');
      return;
    }

    const nextState = acc.is_active === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/admin-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: acc.id,
          isActive: nextState,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengubah status aktif.');
        return;
      }
      toast.success(`Akun "${acc.username}" kini ${nextState === 1 ? 'Aktif' : 'Dinonaktifkan'}.`);
      broadcastDataChange('admin-accounts');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan.');
    }
  };

  // 5. Open Password Change
  const openChangePassword = (acc: AdminAccount) => {
    setPassAccount(acc);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPassModal(true);
  };

  // 6. Submit Password Change
  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passAccount) return;
    if (newPassword.trim().length < 6) {
      toast.warning('Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Konfirmasi password tidak cocok.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/admin-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: passAccount.id,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengubah password.');
        setIsChangingPass(false);
        return;
      }

      toast.success(data.message || `Password untuk "${passAccount.username}" berhasil diubah.`);
      setShowPassModal(false);
      setIsChangingPass(false);
      broadcastDataChange('admin-accounts');
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan.');
      setIsChangingPass(false);
    }
  };

  // 7. Delete Admin
  const openDelete = (acc: AdminAccount) => {
    if (!isSuperadmin) {
      toast.warning('Hanya Superadmin yang berhak menghapus akun admin.');
      return;
    }
    if (acc.id === currentUserId) {
      toast.warning('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    setDeletingAccount(acc);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin-accounts?id=${deletingAccount.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus akun.');
        setIsDeleting(false);
        return;
      }

      toast.success(data.message || `Akun "${deletingAccount.username}" berhasil dihapus.`);
      setShowDeleteModal(false);
      setIsDeleting(false);
      broadcastDataChange('admin-accounts');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan.');
      setIsDeleting(false);
    }
  };

  // 8. Save Security Policy
  const handleSaveSecurityPolicy = async () => {
    if (!isSuperadmin) {
      toast.warning('Hanya Superadmin yang dapat mengubah kebijakan keamanan.');
      return;
    }
    setIsSavingPolicy(true);
    try {
      const res = await fetch('/api/admin-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_security_policy',
          sessionTimeoutDays: securitySettings.session_timeout_days,
          requireStrongPass: securitySettings.admin_require_strong_pass,
          lockoutAttempts: securitySettings.admin_login_lockout_attempts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan kebijakan keamanan.');
        setIsSavingPolicy(false);
        return;
      }

      toast.success(data.message || 'Kebijakan keamanan sesi berhasil diperbarui.');
      setIsSavingPolicy(false);
      broadcastDataChange('app_settings');
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan.');
      setIsSavingPolicy(false);
    }
  };

  // Summary counts
  const totalSuperadmin = accounts.filter((a) => a.role === 'superadmin' && a.is_active === 1).length;
  const totalAdminActive = accounts.filter((a) => a.is_active === 1).length;

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-transparent">
      <Navbar user={user} />
      <div className="flex-1 flex overflow-hidden min-h-0 w-full relative">
        <Sidebar userRole={user?.role} />
        <main className="flex-1 w-full min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 space-y-6 app-scroll-container">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shrink-0 shadow-sm border border-blue-200/60 dark:border-blue-800/60">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    Pengaturan Akun Administrator
                  </h1>
                  {isSuperadmin && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Superadmin Mode
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Kelola hak akses administrator, profil, keamanan sesi login, dan pengaturan password
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {isSuperadmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white text-xs font-extrabold transition shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer w-full sm:w-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Administrator Baru</span>
                </button>
              )}

              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer w-full sm:w-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Total Akun Admin</span>
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
                {accounts.length}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {totalAdminActive} Aktif • {accounts.length - totalAdminActive} Nonaktif
              </span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40">
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                <span>Super Administrator</span>
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1.5 tabular-nums">
                {totalSuperadmin}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Hak Akses Penuh Sistem</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Masa Berlaku Sesi</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5 tabular-nums">
                {securitySettings.session_timeout_days} Hari
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Auto Refresh Token</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Perlindungan Akun</span>
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>HMAC-SHA256</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Bcrypt 10 Rounds Salt</span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, username, atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-xs font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              {[
                { key: 'ALL', label: 'Semua Role' },
                { key: 'superadmin', label: 'Superadmin' },
                { key: 'admin', label: 'Admin' },
                { key: 'hrd', label: 'HRD' },
                { key: 'tu', label: 'Tata Usaha' },
              ].map((rf) => (
                <button
                  key={rf.key}
                  onClick={() => setRoleFilter(rf.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    roleFilter === rf.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts List Section: Desktop Table & Mobile Card View */}
          <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm">
            <div className="p-4 md:p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Daftar Administrator Sistem ({filteredAccounts.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isSuperadmin
                    ? 'Anda memiliki wewenang penuh untuk menambah, mengedit profil, mengubah role, dan reset password.'
                    : 'Anda dapat melihat daftar akun dan memperbarui profil atau password akun Anda sendiri.'}
                </p>
              </div>
            </div>

            {/* Desktop Table View (Hidden on mobile/tablet screens < 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Kontak & Email</th>
                    <th className="py-3 px-4">Role & Hak Akses</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Sesi Terakhir</th>
                    <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Tidak ada akun administrator yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isSelf = acc.id === currentUserId;
                      const canManage = isSuperadmin || isSelf;

                      return (
                        <tr
                          key={acc.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelf ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          {/* Admin Name & Username */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {(acc.full_name || acc.username).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{acc.full_name || acc.username}</span>
                                  {isSelf && (
                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                                      Akun Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  @{acc.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email & Phone */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[180px]">{acc.email || '-'}</span>
                            </div>
                            {acc.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{acc.phone}</span>
                              </div>
                            )}
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            {getRoleBadge(acc.role)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => isSuperadmin && !isSelf && handleToggleActive(acc)}
                              disabled={!isSuperadmin || isSelf}
                              title={
                                !isSuperadmin
                                  ? 'Hanya Superadmin yang dapat mengubah status'
                                  : isSelf
                                  ? 'Tidak dapat menonaktifkan akun sendiri'
                                  : 'Klik untuk ubah status aktif/nonaktif'
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold transition ${
                                acc.is_active === 1
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              } ${isSuperadmin && !isSelf ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            >
                              {acc.is_active === 1 ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Aktif</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Nonaktif</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Last Login Info */}
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                            <div className="text-[11px] flex items-center gap-1">
                              <Laptop className="w-3 h-3 text-slate-400" />
                              <span>{acc.last_login_at ? new Date(acc.last_login_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Belum Pernah'}</span>
                            </div>
                            {acc.last_login_ip && (
                              <div className="text-[10px] font-mono text-slate-400">
                                IP: {acc.last_login_ip}
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Profile Button */}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(acc)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                                  title="Edit Profil Akun"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Change Password Button */}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => openChangePassword(acc)}
                                  className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                                  title="Ubah Password"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Button (superadmin only, not self) */}
                              {isSuperadmin && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => openDelete(acc)}
                                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Hapus Akun Admin"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View (Auto-adapts on screens < 768px, eliminates horizontal clipping) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada akun administrator yang ditemukan.
                </div>
              ) : (
                filteredAccounts.map((acc) => {
                  const isSelf = acc.id === currentUserId;
                  const canManage = isSuperadmin || isSelf;

                  return (
                    <div
                      key={acc.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isSelf
                          ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                          : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {(acc.full_name || acc.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {acc.full_name || acc.username}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              @{acc.username}
                            </div>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <div className="shrink-0">
                          {acc.is_active === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <UserX className="w-3 h-3" />
                              Nonaktif
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Role & Email row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs py-2 border-t border-b border-slate-100 dark:border-slate-800/60 my-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Role & Wewenang:</span>
                          <div className="mt-0.5">{getRoleBadge(acc.role)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Email Login:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                            {acc.email || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Actions footer */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[10px] text-slate-400">
                          {acc.last_login_at ? `Login: ${new Date(acc.last_login_at).toLocaleDateString('id-ID')}` : 'Belum login'}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEdit(acc)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 transition flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openChangePassword(acc)}
                              className="px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/40 text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition flex items-center gap-1"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Sandi</span>
                            </button>
                          )}

                          {isSuperadmin && !isSelf && (
                            <button
                              type="button"
                              onClick={() => openDelete(acc)}
                              className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Security & Login Session Policy Panel */}
          <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Kebijakan Keamanan & Sesi Login Administrator
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konfigurasi masa kedaluwarsa sesi token, pembatasan brute force, dan verifikasi perangkat
                  </p>
                </div>
              </div>

              {isSuperadmin && (
                <button
                  onClick={handleSaveSecurityPolicy}
                  disabled={isSavingPolicy}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSavingPolicy ? 'Menyimpan...' : 'Simpan Kebijakan'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Timeout days */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Masa Berlaku Sesi Login (Token Expiration):
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Waktu sebelum administrator diminta login ulang secara otomatis.
                </p>
                <select
                  disabled={!isSuperadmin}
                  value={securitySettings.session_timeout_days}
                  onChange={(e) =>
                    setSecuritySettings((prev) => ({ ...prev, session_timeout_days: e.target.value }))
                  }
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 mt-2"
                >
                  <option value="1">1 Hari (Sangat Ketat)</option>
                  <option value="3">3 Hari (Ketatan Tinggi)</option>
                  <option value="7">7 Hari (Standar Rekomendasi)</option>
                  <option value="14">14 Hari (Fleksibel)</option>
                  <option value="30">30 Hari (Maksimal)</option>
                </select>
              </div>

              {/* Password complexity */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Kebijakan Kompleksitas Password:
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Standar keamanan kata sandi minimal bagi seluruh akun admin.
                </p>
                <div className="mt-2 space-y-1 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Minimal 6 karakter alfanumerik</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Enkripsi Bcrypt Salt 10 Rounds</span>
                  </div>
                </div>
              </div>

              {/* Invalidation control */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 flex flex-col justify-between">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Terminasi Sesi & Cache Akun:
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Paksa penyegaran cache kredensial sesi jika terjadi perubahan hak akses.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    broadcastDataChange('all');
                    toast.success('Cache sesi lokal berhasil disegarkan.');
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition cursor-pointer mt-2"
                >
                  Segarkan Cache Sesi Sekarang
                </button>
              </div>
            </div>

            {/* Mobile save button */}
            {isSuperadmin && (
              <div className="sm:hidden pt-2">
                <button
                  onClick={handleSaveSecurityPolicy}
                  disabled={isSavingPolicy}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isSavingPolicy ? 'Menyimpan...' : 'Simpan Kebijakan Keamanan'}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: Tambah Administrator Baru */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Akun Administrator Baru"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Username Login: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: hrd_imbs"
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Role & Hak Akses: <span className="text-rose-500">*</span>
              </label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value="superadmin">Super Administrator (Akses Penuh)</option>
                <option value="admin">Administrator Sistem</option>
                <option value="hrd">HRD & Personalia</option>
                <option value="tu">Petugas Tata Usaha</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap Administrator:
              </label>
              <input
                type="text"
                placeholder="Contoh: Ustadz Ahmad Fauzi"
                value={addForm.fullName}
                onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Akun:
              </label>
              <input
                type="email"
                placeholder="admin@imbs.sch.id"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Telepon / WhatsApp (Opsional):
            </label>
            <input
              type="text"
              placeholder="08123456789"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password Awal: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showAddPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Konfirmasi Password: <span className="text-rose-500">*</span>
              </label>
              <input
                type={showAddPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                value={addForm.confirmPassword}
                onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/25 disabled:opacity-50 transition"
            >
              {isAdding ? 'Membuat Akun...' : 'Buat Akun Administrator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit Admin Account */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Data Administrator: @${editingAccount?.username || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap:
            </label>
            <input
              type="text"
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Akun:
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon:
              </label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Role and status only editable by superadmin */}
          {isSuperadmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Administrator:
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="superadmin">Super Administrator</option>
                  <option value="admin">Administrator Sistem</option>
                  <option value="hrd">HRD & Personalia</option>
                  <option value="tu">Petugas Tata Usaha</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Akun:
                </label>
                <select
                  value={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value={1}>Aktif (Bisa Login)</option>
                  <option value={0}>Nonaktif (Diblokir)</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isEditing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/25 disabled:opacity-50 transition"
            >
              {isEditing ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Change Password */}
      <Modal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        title={`Ubah Password: @${passAccount?.username || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handlePassSubmit} className="space-y-3.5 text-xs">
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-bold">Keamanan Password:</span> Setelah password diubah, sesi login pada perangkat lain akan otomatis di-invalidasi untuk keamanan.
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Password Baru: <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Konfirmasi Password Baru: <span className="text-rose-500">*</span>
            </label>
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Ketik ulang password baru"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowPassModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isChangingPass}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/25 disabled:opacity-50 transition"
            >
              {isChangingPass ? 'Menyimpan Sandi...' : 'Ubah Password Akun'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Delete Admin Confirmation */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Konfirmasi Hapus Akun Administrator"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-rose-800 dark:text-rose-200 space-y-1">
              <div className="font-bold text-sm">
                Apakah Anda yakin ingin menghapus akun @{deletingAccount?.username}?
              </div>
              <p>
                Akun administrator ini akan dihapus secara permanen dari sistem dan tidak akan bisa melakukan login lagi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={executeDelete}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/25 disabled:opacity-50"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun Admin'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

