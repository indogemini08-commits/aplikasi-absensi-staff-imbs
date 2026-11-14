import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ToastContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'Aplikasi Absensi Staff IMBS | Islamic Modern Boarding School',
  description: 'Portal Presensi dan Pengelolaan Kehadiran Digital Pegawai IMBS Mobile-First & Geofencing GPS',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.png?v=3', type: 'image/png', sizes: '64x64' },
      { url: '/favicon.ico?v=3', sizes: 'any' },
    ],
    shortcut: '/icon.png?v=3',
    apple: '/apple-touch-icon.png?v=3',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className={`${plusJakartaSans.className} min-h-screen bg-[#edf2f9] dark:bg-[#060913] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white relative overflow-x-hidden`}>
        <ToastProvider>
          {/* Futuristic Ambient Lighting Canvas & Floating Blurred Neon Orbs */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            {/* Cyber Matrix Dot Grid Layer */}
            <div className="absolute inset-0 cyber-grid-overlay opacity-70 dark:opacity-40" />

            {/* Glowing Luminous Orbs with Floating Organic Animations */}
            {/* Orb 1: Royal Sapphire Blue Flare */}
            <div
              className="animate-orb-1 absolute -top-24 -left-24 w-[38rem] h-[38rem] rounded-full bg-gradient-to-br from-blue-500/40 via-indigo-500/35 to-blue-600/20 dark:from-blue-600/32 dark:via-blue-700/24 dark:to-indigo-900/12 blur-[85px]"
            />

            {/* Orb 2: Electric Cyan / Turquoise Flare */}
            <div
              className="animate-orb-2 absolute top-1/4 -right-20 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl from-cyan-400/40 via-sky-400/32 to-blue-500/20 dark:from-cyan-400/28 dark:via-sky-500/20 dark:to-blue-600/12 blur-[85px]"
            />

            {/* Orb 3: Cosmic Soft Indigo & Violet Aura */}
            <div
              className="animate-orb-3 absolute -bottom-28 left-1/4 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-indigo-500/35 via-violet-500/30 to-purple-600/20 dark:from-indigo-600/25 dark:via-violet-600/20 dark:to-purple-700/10 blur-[95px]"
            />

            {/* Orb 4: Central Sky Blue & Cyan Highlight */}
            <div
              className="animate-orb-4 absolute top-2/3 -left-16 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-sky-400/32 via-blue-400/25 to-cyan-400/20 dark:from-blue-500/20 dark:via-cyan-500/16 dark:to-transparent blur-[80px]"
            />
          </div>

          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
