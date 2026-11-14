'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell,
  Clock,
  User,
  LogOut,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Users,
  MapPin,
  Calendar,
  ClipboardCheck,
  FileCheck2,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  History,
  Settings,
  Layers,
  Shield,
  UserCog,
  Download,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { usePWA } from './PWAProvider';
import { getWIBTimeString, formatIndonesianDateShort } from '@/lib/date';

interface NavbarProps {
  user?: {
    name?: string;
    role?: string;
    nip?: string;
    unreadNotifications?: number;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { canInstall, isInstalled, installApp } = usePWA();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wibTime, setWibTime] = useState('');
  const [wibDate, setWibDate] = useState('');
  const [appLogo, setAppLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('imbs_app_logo') || sessionStorage.getItem('imbs_app_logo') || '/logo-imbs-left.png';
      } catch {}
    }
    return '/logo-imbs-left.png';
  });
  const [orgName, setOrgName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('imbs_app_org_name') || sessionStorage.getItem('imbs_app_org_name') || 'IMAM MUZANI BOARDING SCHOOL';
      } catch {}
    }
    return 'IMAM MUZANI BOARDING SCHOOL';
  });
  const [foundationName, setFoundationName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('imbs_app_foundation_name') || sessionStorage.getItem('imbs_app_foundation_name') || 'YAYASAN SABILUL HUDA NAMBO';
      } catch {}
    }
    return 'YAYASAN SABILUL HUDA NAMBO';
  });

  // Persistent user state: prioritize prop, fallback to localStorage cache
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (user) return user;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      try {
        localStorage.setItem('imbs_user_session', JSON.stringify(user));
      } catch {}
    } else if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        if (cached) {
          setCurrentUser(JSON.parse(cached));
        }
      } catch {}
    }
  }, [user]);

  // Close mobile drawer upon route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Live ticking WIB clock
    const updateTime = () => {
      setWibTime(getWIBTimeString());
      setWibDate(formatIndonesianDateShort(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Fetch official identity and logos from system settings
    const loadSettings = () => {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings) {
            const s = data.settings;
            const logo = s.logo_app || s.logo_institution || '/logo-imbs-left.png';
            const name = s.organization_name || 'IMAM MUZANI BOARDING SCHOOL';
            const foundation = s.foundation_name || 'YAYASAN SABILUL HUDA NAMBO';

            if (logo) setAppLogo(logo);
            if (name) setOrgName(name);
            if (foundation) setFoundationName(foundation);

            try {
              if (logo) {
                localStorage.setItem('imbs_app_logo', logo);
                sessionStorage.setItem('imbs_app_logo', logo);
              }
              localStorage.setItem('imbs_app_org_name', name);
              sessionStorage.setItem('imbs_app_org_name', name);
              localStorage.setItem('imbs_app_foundation_name', foundation);
              sessionStorage.setItem('imbs_app_foundation_name', foundation);
            } catch {}
          }
        })
        .catch(() => {});
    };

    loadSettings();

    // Listen for live settings changes from Pengaturan Sistem
    const handleSettingsUpdate = () => {
      if (typeof window !== 'undefined') {
        try {
          const cachedLogo = sessionStorage.getItem('imbs_app_logo');
          const cachedOrg = sessionStorage.getItem('imbs_app_org_name');
          const cachedFound = sessionStorage.getItem('imbs_app_foundation_name');
          if (cachedLogo) setAppLogo(cachedLogo);
          if (cachedOrg) setOrgName(cachedOrg);
          if (cachedFound) setFoundationName(cachedFound);
        } catch {}
      }
      loadSettings();
    };

    window.addEventListener('imbs_settings_updated', handleSettingsUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('imbs_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('imbs_user_session');
        sessionStorage.clear();
      }
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const adminNavGroups = [
    {
      group: 'Pemantauan',
      items: [
        { label: 'Dashboard Utama', href: '/admin', icon: LayoutDashboard },
        { label: 'Papan Jadwal Kehadiran', href: '/admin/papan-jadwal', icon: CalendarDays },
        { label: 'Data Absensi Master', href: '/admin/absensi', icon: ClipboardCheck },
      ],
    },
    {
      group: 'Persetujuan & Tinjauan',
      items: [
        { label: 'Persetujuan Izin / Cuti', href: '/admin/izin-cuti', icon: FileCheck2 },
        { label: 'Peninjauan Keterlambatan', href: '/admin/keterlambatan', icon: AlertTriangle },
        { label: 'Pengajuan Koreksi', href: '/admin/koreksi', icon: Layers },
      ],
    },
    {
      group: 'Master Data & Penjadwalan',
      items: [
        { label: 'Data Pegawai & Akun', href: '/admin/pegawai', icon: Users },
        { label: 'Lokasi & Radius GPS', href: '/admin/lokasi', icon: MapPin },
        { label: 'Jadwal Kerja Departemen', href: '/admin/jadwal-departemen', icon: Clock },
        { label: 'Kalender & Hari Libur', href: '/admin/kalender', icon: Calendar },
        { label: 'Saldo Cuti Pegawai', href: '/admin/saldo-cuti', icon: Coins },
      ],
    },
    {
      group: 'Laporan & Sistem',
      items: [
        { label: 'Rekap & Ekspor Laporan', href: '/admin/laporan', icon: FileSpreadsheet },
        { label: 'Histori Audit Log', href: '/admin/audit-log', icon: History },
        { label: 'Pengaturan Akun Admin', href: '/admin/akun-admin', icon: UserCog },
        { label: 'Pengaturan Sistem', href: '/admin/pengaturan', icon: Settings },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav relative transition-all">
      {/* Bottom glowing futuristic laser accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 via-cyan-400/50 to-transparent shadow-[0_1px_8px_rgba(37, 99, 235,0.4)] pointer-events-none" />

      <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative gap-2 sm:gap-4">
        {/* Left: Brand & Institution Identity (No crop, no wrap) */}
        <div
          onClick={() => router.push(currentUser?.role === 'staff' ? '/dashboard' : '/admin')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none transition-transform active:scale-[0.99] shrink-0"
          title="Beranda Presensi IMBS"
        >
          {/* Futuristic Frosted Logo Frame with Holographic Reflection */}
          <div className="h-10 sm:h-11 min-w-[2.75rem] max-w-[5.5rem] px-2 py-1 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-md border border-white/60 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-blue-500/20 group-hover:ring-blue-500/50 group-hover:shadow-[0_0_20px_rgba(37, 99, 235,0.3)] transition-all">
            <img
              src={appLogo || '/logo-imbs-left.png'}
              alt={orgName || 'Logo IMBS'}
              className="max-h-full w-auto object-contain filter drop-shadow-xs transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo-imbs-left.png';
              }}
            />
          </div>

          {/* Title & Organization Subtitle */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-xs sm:text-sm md:text-base tracking-tight text-slate-900 dark:text-white leading-tight font-sans whitespace-nowrap group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {orgName || 'IMAM MUZANI BOARDING SCHOOL'}
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/50 shadow-[0_0_12px_rgba(37, 99, 235,0.2)] backdrop-blur-md leading-none shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-neon-dot"></span>
                Presensi Staff
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              <span className="font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
              </span>
              <span className="hidden xl:inline text-slate-300 dark:text-slate-600">•</span>
              <span className="hidden xl:inline text-slate-400 dark:text-slate-500 text-[10px] tracking-wide whitespace-nowrap">
                Portal Presensi Resmi Berbasis GPS
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live WIB Clock HUD Capsule (Desktop/XL - strictly no wrapping) */}
        <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-blue-500/25 dark:border-blue-500/30 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-[0_0_15px_rgba(37, 99, 235,0.12)] hover:border-blue-500/50 transition-all whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">{wibDate}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums tracking-wide whitespace-nowrap">
            {wibTime || '07:30:00'} WIB
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isInstalled && (
            <>
              {/* Full button on XL */}
              <button
                onClick={installApp}
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                title="Pasang Aplikasi Absensi IMBS di Perangkat Ini"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Install App</span>
              </button>
              {/* Compact icon on tablet/laptop */}
              <button
                onClick={installApp}
                className="hidden sm:inline-flex xl:hidden p-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition-all active:scale-95 cursor-pointer shrink-0"
                title="Pasang Aplikasi Absensi IMBS (Install PWA)"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}

          <ThemeToggle />

          {/* Notifications Button */}
          <button
            onClick={() => router.push('/notifikasi')}
            className="relative p-2 sm:p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(37, 99, 235,0.25)]"
            title="Pusat Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {currentUser?.unreadNotifications && currentUser.unreadNotifications > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.7)]">
                {currentUser.unreadNotifications > 9 ? '9+' : currentUser.unreadNotifications}
              </span>
            ) : null}
          </button>

          {/* Mobile Admin Navigation Menu Button */}
          {currentUser && currentUser.role !== 'staff' && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer"
              title="Menu Navigasi Admin"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-blue-500" /> : <Menu className="w-4 h-4" />}
            </button>
          )}

          {/* User profile dropdown / quick card */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80 dark:border-slate-800/80">
              <div
                onClick={() => router.push(currentUser.role === 'staff' ? '/profil' : '/admin')}
                className="cursor-pointer flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(37, 99, 235,0.2)] transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs neon-glow-blue">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden lg:block text-left text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar / Logout"
                className="hidden sm:flex p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-transparent hover:border-rose-400/30"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : pathname !== '/login' && pathname !== '/' ? (
            /* Subtle loading placeholder during protected page transitions */
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
              <div className="hidden lg:block space-y-1">
                <div className="w-16 h-3 bg-slate-200/80 dark:bg-slate-800/80 rounded animate-pulse" />
                <div className="w-10 h-2 bg-slate-200/80 dark:bg-slate-800/80 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-xs px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 neon-glow-blue transition cursor-pointer"
            >
              Masuk
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Overlay for Admin Navigation */}
      {mobileMenuOpen && currentUser && currentUser.role !== 'staff' && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 flex flex-col">
          <div className="bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 max-h-[85vh] overflow-y-auto p-4 space-y-4 shadow-2xl flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Panel Admin IMBS
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {currentUser.name} • {currentUser.role}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Menu Groups */}
            {adminNavGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <h5 className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 py-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#2563eb]" />
                  <span>{group.group}</span>
                </h5>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 space-y-2">
              {!isInstalled && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    installApp();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white text-xs font-extrabold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang Aplikasi (Install PWA)</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 text-xs font-extrabold"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Aplikasi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
