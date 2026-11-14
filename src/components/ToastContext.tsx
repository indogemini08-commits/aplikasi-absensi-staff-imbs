'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto dismiss after 4.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    warning: (msg: string) => addToast('warning', msg),
    info: (msg: string) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Floating Futuristic HUD Toast Container */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-50 flex flex-col gap-3 w-[92vw] max-w-md pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl backdrop-blur-2xl border text-xs sm:text-sm font-semibold transition-all duration-300 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 ${
              t.type === 'success'
                ? 'bg-white/90 dark:bg-[#071714]/90 text-slate-800 dark:text-blue-100 border-blue-500/50 shadow-[0_10px_35px_-5px_rgba(37, 99, 235,0.35)]'
                : t.type === 'error'
                ? 'bg-white/90 dark:bg-[#1f0a10]/90 text-slate-800 dark:text-rose-100 border-rose-500/50 shadow-[0_10px_35px_-5px_rgba(244,63,94,0.35)]'
                : t.type === 'warning'
                ? 'bg-white/90 dark:bg-[#1c1305]/90 text-slate-800 dark:text-amber-100 border-amber-500/50 shadow-[0_10px_35px_-5px_rgba(245,158,11,0.35)]'
                : 'bg-white/90 dark:bg-[#0c1626]/90 text-slate-800 dark:text-cyan-100 border-cyan-500/50 shadow-[0_10px_35px_-5px_rgba(6,182,212,0.35)]'
            }`}
          >
            {/* Top Luminous Neon Laser Bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-[2px] ${
                t.type === 'success'
                  ? 'bg-gradient-to-r from-blue-500 via-teal-400 to-blue-500 shadow-[0_0_10px_#2563eb]'
                  : t.type === 'error'
                  ? 'bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500 shadow-[0_0_10px_#f43f5e]'
                  : t.type === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_10px_#f59e0b]'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500 shadow-[0_0_10px_#06b6d4]'
              }`}
            />

            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-blue-500 drop-shadow-[0_0_8px_rgba(37, 99, 235,0.6)]" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />}
            </div>
            <div className="flex-1 leading-snug break-words">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context.toast;
}
