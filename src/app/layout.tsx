import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ToastContext';

export const metadata: Metadata = {
  title: 'Aplikasi Absensi Staff IMBS | Islamic Modern Boarding School',
  description: 'Portal Presensi dan Pengelolaan Kehadiran Digital Pegawai IMBS Mobile-First & Geofencing GPS',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo-imbs-left.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/logo-imbs-left.png',
    apple: '/apple-touch-icon.png',
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
        <link rel="icon" href="/logo-imbs-left.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/logo-imbs-left.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#edf2f9] dark:bg-[#060913] text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
        <ToastProvider>
          {/* Futuristic Ambient Lighting Canvas & Floating Blurred Neon Orbs */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            {/* Cyber Matrix Dot Grid Layer */}
            <div className="absolute inset-0 cyber-grid-overlay opacity-70 dark:opacity-40" />

            {/* Glowing Luminous Orbs with Floating Organic Animations */}
            {/* Orb 1: Emerald Radiant Nebula */}
            <div
              className="animate-orb-1 absolute -top-24 -left-24 w-[38rem] h-[38rem] rounded-full bg-gradient-to-br from-emerald-400/40 via-teal-400/35 to-emerald-600/20 dark:from-emerald-500/30 dark:via-emerald-600/22 dark:to-teal-800/10 blur-[85px]"
            />

            {/* Orb 2: Electric Cyan / Turquoise Flare */}
            <div
              className="animate-orb-2 absolute top-1/4 -right-20 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl from-cyan-400/40 via-teal-400/30 to-blue-500/20 dark:from-cyan-400/28 dark:via-teal-500/20 dark:to-blue-600/10 blur-[85px]"
            />

            {/* Orb 3: Cosmic Soft Indigo & Violet Aura */}
            <div
              className="animate-orb-3 absolute -bottom-28 left-1/4 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-indigo-500/35 via-violet-500/30 to-purple-600/20 dark:from-indigo-600/25 dark:via-violet-600/20 dark:to-purple-700/10 blur-[95px]"
            />

            {/* Orb 4: Central Subtle Sunlight / Prism Core */}
            <div
              className="animate-orb-4 absolute top-2/3 -left-16 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-teal-300/30 via-emerald-300/25 to-cyan-400/20 dark:from-emerald-400/18 dark:via-cyan-500/15 dark:to-transparent blur-[80px]"
            />
          </div>

          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
