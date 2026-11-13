'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Edit, Check, RefreshCw, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/components/ToastContext';

export default function AdminSaldoCutiPage() {
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
  const [balances, setBalances] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_saldo_cuti');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_saldo_cuti');
    }
    return true;
  });
  const [search, setSearch] = useState('');

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [activeBalance, setActiveBalance] = useState<any>(null);
  const [newAllocated, setNewAllocated] = useState(12);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const [userRes, res] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/leave/balances'),
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
      try {
        localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
      } catch {}

      const data = res.ok ? await res.json() : { balances: [] };
      const balanceList = data.balances || [];
      setBalances(balanceList);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('imbs_saldo_cuti', JSON.stringify(balanceList));
        } catch {}
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const openEditModal = (bal: any) => {
    setActiveBalance(bal);
    setNewAllocated(bal.allocated_days);
    setShowModal(true);
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leave/balances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeBalance.id,
          allocatedDays: Number(newAllocated),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengubah alokasi saldo');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      setShowModal(false);
      setIsSubmitting(false);
      fetchBalances();
    } catch (e) {
      toast.error('Gagal memperbarui saldo cuti');
      setIsSubmitting(false);
    }
  };

  const filtered = balances.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.employee_name.toLowerCase().includes(q) || b.employee_nip.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Pengelolaan Saldo Cuti Pegawai
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Atur jatah cuti tahunan, pantau hari cuti yang telah terpakai, dan sisa hak cuti staff
              </p>
            </div>

            <button
              onClick={() => fetchBalances()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-glass overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Pegawai</th>
                      <th className="py-3.5 px-4">Divisi</th>
                      <th className="py-3.5 px-4">Tahun</th>
                      <th className="py-3.5 px-4">Jatah Awal</th>
                      <th className="py-3.5 px-4">Terpakai</th>
                      <th className="py-3.5 px-4">Sedang Diajukan</th>
                      <th className="py-3.5 px-4">Sisa Saldo</th>
                      <th className="py-3.5 px-4 text-right">Ubah Jatah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {b.employee_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.employee_nip}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{b.department_name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">{b.year}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                          {b.allocated_days} Hari
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-rose-600">
                          {b.used_days} Hari
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-amber-500">
                          {b.pending_days} Hari
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {b.remaining_days} Hari
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Ubah Jatah Cuti: ${activeBalance?.employee_name}`}>
        <form onSubmit={handleSaveBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alokasi Hari Cuti Tahunan:
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={newAllocated}
              onChange={(e) => setNewAllocated(parseInt(e.target.value, 10))}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
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
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

