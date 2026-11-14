'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Download, X, Sparkles, Smartphone, CheckCircle2 } from 'lucide-react';

interface PWAContextType {
  canInstall: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
  dismissBanner: () => void;
}

const PWAContext = createContext<PWAContextType>({
  canInstall: false,
  isInstalled: false,
  installApp: async () => {},
  dismissBanner: () => {},
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  useEffect(() => {
    // 1. Check if app is already running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };
    checkStandalone();

    // 2. Register Service Worker safely
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration.scope);

            // Listen for SW updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      console.log('[PWA] New content is available; please refresh.');
                    } else {
                      console.log('[PWA] Content is cached for offline use.');
                    }
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration skipped or failed:', err);
          });
      });
    }

    // 3. Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);

      // Check if user dismissed banner recently
      try {
        const dismissedAt = localStorage.getItem('imbs_pwa_dismissed_at');
        if (dismissedAt) {
          const hoursPassed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
          if (hoursPassed < 48) {
            return; // Don't show floating banner if dismissed within last 48 hours
          }
        }
      } catch {}

      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setShowBanner(false);
      setDeferredPrompt(null);
      setInstalledNotice(true);
      setTimeout(() => setInstalledNotice(false), 5000);
      console.log('[PWA] Aplikasi Absensi IMBS berhasil dipasang di perangkat!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      // If prompt is not available, provide helpful browser guidance
      alert(
        'Untuk memasang aplikasi:\n\n' +
        '• Di Chrome / Edge (PC): Klik ikon instal (+) di ujung kanan address bar.\n' +
        '• Di Android: Ketuk menu browser (titik 3) lalu pilih "Tambahkan ke Layar Utama" atau "Install Aplikasi".\n' +
        '• Di iOS (Safari): Ketuk tombol Share lalu pilih "Add to Home Screen".'
      );
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('imbs_pwa_dismissed_at', Date.now().toString());
    } catch {}
  };

  return (
    <PWAContext.Provider value={{ canInstall, isInstalled, installApp, dismissBanner }}>
      {children}

      {/* Floating PWA Install Banner */}
      {showBanner && !isInstalled && (
        <div className="fixed bottom-20 xs:bottom-24 md:bottom-6 right-3 xs:right-4 left-3 xs:left-auto md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-3.5 xs:p-4 rounded-3xl bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-2xl border border-blue-500/30 dark:border-blue-500/40 shadow-2xl shadow-blue-600/20 text-slate-800 dark:text-white relative overflow-hidden">
            {/* Top accent glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />

            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-600/30 shrink-0 flex items-center justify-center">
                <img
                  src="/icon.png"
                  alt="App Icon"
                  className="w-10 h-10 rounded-[14px] object-contain bg-white/10"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> PWA Standalone
                  </span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight mt-0.5">
                  Pasang Aplikasi Absensi IMBS
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Akses lebih cepat langsung dari layar utama tanpa browser bar, hemat kuota & mendukung offline.
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={installApp}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install Sekarang</span>
                  </button>
                  <button
                    onClick={dismissBanner}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Nanti
                  </button>
                </div>
              </div>

              <button
                onClick={dismissBanner}
                className="absolute top-3 right-3 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification after install */}
      {installedNotice && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Aplikasi Absensi IMBS berhasil dipasang di perangkat!</span>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}

