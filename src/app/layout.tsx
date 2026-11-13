import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ToastContext';

export const metadata: Metadata = {
  title: 'Aplikasi Absensi Staff IMBS | Islamic Modern Boarding School',
  description: 'Portal Presensi dan Pengelolaan Kehadiran Digital Pegawai IMBS Mobile-First & Geofencing GPS',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        <ToastProvider>
          {/* Subtle decorative background gradient glows */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-3xl" />
            <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-teal-500/10 dark:bg-teal-600/10 blur-3xl" />
            <div className="absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-3xl" />
          </div>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

