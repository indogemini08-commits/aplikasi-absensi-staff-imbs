'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Camera,
  Navigation,
  Send,
  Building,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import LocationRadar from '@/components/LocationRadar';
import SelfieCapture from '@/components/SelfieCapture';
import Modal from '@/components/Modal';
import { useToast } from '@/components/ToastContext';
import { calculateHaversineDistance, checkGeofence } from '@/lib/geo';
import { useDataSync, broadcastDataChange } from '@/lib/sync';

export default function AbsensiPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('imbs_user_session');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [statusData, setStatusData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_staff_status');
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_staff_status');
    }
    return true;
  });

  // GPS state
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Selected work location
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Late Reason Form state
  const [showLateModal, setShowLateModal] = useState(false);
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);
  const [lateReasonText, setLateReasonText] = useState('');
  const [submittingLateReason, setSubmittingLateReason] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useDataSync(() => {
    fetchInitialData();
  }, ['attendance', 'locations', 'schedules']);

  const fetchInitialData = async () => {
    try {
      const [userRes, statusRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/attendance/status', { cache: 'no-store' })
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
      }

      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setStatusData(statusJson);

        if (statusJson.allowedLocations && statusJson.allowedLocations.length > 0) {
          setSelectedLocation(statusJson.allowedLocations[0]);
        }

        // Check if late reason is pending
        if (statusJson.pendingLateReason && statusJson.attendance?.id) {
          setCurrentAttendanceId(statusJson.attendance.id);
          setShowLateModal(true);
        }

        setLoading(false);
        // Trigger GPS detection
        requestGpsLocation(statusJson.allowedLocations?.[0]);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const requestGpsLocation = (targetLoc?: any) => {
    setIsLocating(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Peramban (browser) Anda tidak mendukung fitur geolokasi GPS.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserCoord(coords);
        setAccuracy(position.coords.accuracy);

        const loc = targetLoc || selectedLocation;
        if (loc) {
          evaluateGeofence(coords, loc);
        }
        setIsLocating(false);
      },
      (error) => {
        console.warn('GPS Error:', error);
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin lokasi ditolak. Silakan izinkan akses lokasi pada browser smartphone Anda dan coba kembali.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Sinyal GPS tidak tersedia atau perangkat sedang offline.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu permintaan lokasi GPS habis. Silakan coba kembali.';
        }
        setGpsError(msg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const evaluateGeofence = (coords: { latitude: number; longitude: number }, location: any) => {
    const gf = checkGeofence(coords, { latitude: location.latitude, longitude: location.longitude }, location.radius_meters);
    setDistanceMeters(gf.distanceMeters);
    setIsWithinRadius(gf.isWithinRadius);
  };

  const handleLocationChange = (locId: string) => {
    const loc = statusData?.allowedLocations?.find((l: any) => l.id === locId);
    if (loc) {
      setSelectedLocation(loc);
      if (userCoord) {
        evaluateGeofence(userCoord, loc);
      }
    }
  };

  const handleClockInAction = async () => {
    // If selfie is required and not yet captured
    if (statusData?.settings?.requireSelfie && !capturedPhoto) {
      setShowSelfieModal(true);
      return;
    }

    if (!userCoord) {
      toast.error('Lokasi GPS belum terdeteksi. Silakan aktifkan GPS dan refresh lokasi.');
      return;
    }

    if (!isWithinRadius) {
      toast.error(
        `Anda berada di luar area absensi ${selectedLocation?.name}. Jarak: ${Math.round(distanceMeters || 0)}m (Batas: ${selectedLocation?.radius_meters}m).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userCoord.latitude,
          longitude: userCoord.longitude,
          accuracy,
          locationId: selectedLocation?.id,
          photo: capturedPhoto,
          deviceInfo: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal melakukan absen masuk');
        setIsSubmitting(false);
        return;
      }

      // Success
      toast.success(data.message);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });

      // If late, trigger late reason modal
      if (data.data?.requiresLateReason) {
        setCurrentAttendanceId(data.data.attendanceId);
        setShowLateModal(true);
      }

      // Refresh status & broadcast to admin/other tabs
      broadcastDataChange('attendance');
      broadcastDataChange('attendance');
      await fetchInitialData();
      setIsSubmitting(false);
    } catch (e: any) {
      toast.error('Terjadi kesalahan saat memproses absensi.');
      setIsSubmitting(false);
    }
  };

  const handleClockOutAction = async () => {
    if (!userCoord) {
      toast.error('Lokasi GPS belum terdeteksi. Silakan refresh lokasi.');
      return;
    }

    if (!isWithinRadius) {
      toast.error(
        `Anda berada di luar area absensi ${selectedLocation?.name}. Jarak: ${Math.round(distanceMeters || 0)}m (Batas: ${selectedLocation?.radius_meters}m).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userCoord.latitude,
          longitude: userCoord.longitude,
          accuracy,
          locationId: selectedLocation?.id,
          photo: capturedPhoto,
          deviceInfo: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal melakukan absen pulang');
        setIsSubmitting(false);
        return;
      }

      toast.success(data.message);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });

      broadcastDataChange('attendance');
      await fetchInitialData();
      setIsSubmitting(false);
    } catch (e: any) {
      toast.error('Terjadi kesalahan saat memproses absensi.');
      setIsSubmitting(false);
    }
  };

  const submitLateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateReasonText || lateReasonText.trim().length < 5) {
      toast.warning('Silakan tulis alasan keterlambatan dengan jelas (minimal 5 karakter).');
      return;
    }

    setSubmittingLateReason(true);
    try {
      const res = await fetch('/api/attendance/late-reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: currentAttendanceId,
          reason: lateReasonText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengirim alasan');
        setSubmittingLateReason(false);
        return;
      }

      toast.success(data.message);
      setShowLateModal(false);
      setSubmittingLateReason(false);
      broadcastDataChange('attendance');
      await fetchInitialData();
    } catch (e: any) {
      toast.error('Gagal mengirim alasan keterlambatan.');
      setSubmittingLateReason(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <Navbar user={user} />
        <main className="max-w-md mx-auto p-4 space-y-4">
          <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const att = statusData?.attendance;
  const isClockedIn = att?.isClockedIn;
  const isClockedOut = att?.isClockedOut;
  const schedule = statusData?.schedule;

  return (
    <div className="min-h-screen pb-28 md:pb-12 bg-transparent">
      <Navbar user={user} />

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Title Header */}
        <div className="text-center">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Absensi Pegawai Digital
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {statusData?.formattedDate} • {statusData?.currentTime} WIB
          </p>
        </div>

        {/* Work Location Selector (if multiple allowed) */}
        {statusData?.allowedLocations && statusData.allowedLocations.length > 1 && (
          <div className="glass-card rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              Pilih Lokasi Kerja:
            </label>
            <select
              value={selectedLocation?.id || ''}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {statusData.allowedLocations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} (Radius: {loc.radius_meters}m)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* GPS Error Alert */}
        {gpsError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                Akses Lokasi GPS Terkendala
              </h4>
              <p className="text-rose-800 dark:text-rose-300 mt-0.5">{gpsError}</p>
              <button
                onClick={() => requestGpsLocation()}
                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Akses GPS Lagi
              </button>
            </div>
          </div>
        )}

        {/* Real-time Location Radar & Distance Visualizer */}
        <LocationRadar
          userCoord={userCoord}
          accuracy={accuracy}
          targetLocation={selectedLocation}
          distanceMeters={distanceMeters}
          isWithinRadius={isWithinRadius}
          onRefreshGps={() => requestGpsLocation()}
          isLoadingGps={isLocating}
        />

        {/* Main Attendance Action Card */}
        <div className="glass-card rounded-3xl p-5 shadow-glass dark:shadow-glass-dark border border-slate-200/80 dark:border-slate-800/80 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Shift: {schedule?.shiftName || 'Reguler'} ({schedule?.startTime} - {schedule?.endTime} WIB)</span>
          </div>

          {/* Today's Progress Status */}
          <div className="flex items-center justify-center gap-6 py-1">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Absen Masuk</span>
              <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {att?.clockInTime ? `${att.clockInTime} WIB` : '—'}
              </div>
              {att?.clockInStatus && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${att.clockInStatus === 'terlambat' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'}`}>
                  {att.clockInStatus === 'terlambat' ? `Terlambat (+${att.minutesLate}m)` : 'Tepat Waktu'}
                </span>
              )}
            </div>

            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Absen Pulang</span>
              <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {att?.clockOutTime ? `${att.clockOutTime} WIB` : '—'}
              </div>
              {att?.clockOutStatus && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {att.clockOutStatus === 'pulang_cepat' ? 'Pulang Cepat' : 'Selesai'}
                </span>
              )}
            </div>
          </div>

          {/* Big Thumb Button */}
          {isClockedOut ? (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs">
              <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
              <div className="font-bold text-sm">Absensi Selesai</div>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Anda sudah menyelesaikan absensi masuk dan pulang hari ini. Selamat beristirahat!
              </p>
            </div>
          ) : !isClockedIn ? (
            <button
              onClick={handleClockInAction}
              disabled={!isWithinRadius || isSubmitting || isLocating}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-lg transition-all duration-200 active:scale-98 flex items-center justify-center gap-2.5 ${
                isWithinRadius && !isSubmitting && !isLocating
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 ring-4 ring-blue-500/20'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
              <span>
                {isSubmitting
                  ? 'Memverifikasi Lokasi...'
                  : isLocating
                  ? 'Mencari Titik GPS...'
                  : isWithinRadius
                  ? 'Absen Masuk Sekarang'
                  : 'Di Luar Radius (Tombol Nonaktif)'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleClockOutAction}
              disabled={!isWithinRadius || isSubmitting || isLocating}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-lg transition-all duration-200 active:scale-98 flex items-center justify-center gap-2.5 ${
                isWithinRadius && !isSubmitting && !isLocating
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white shadow-indigo-600/30 ring-4 ring-indigo-500/20'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
              <span>
                {isSubmitting
                  ? 'Memproses Absen Pulang...'
                  : isWithinRadius
                  ? 'Absen Pulang Sekarang'
                  : 'Di Luar Radius (Tombol Nonaktif)'}
              </span>
            </button>
          )}

          {/* Guidance note */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            * Waktu absensi diverifikasi otomatis menggunakan server waktu resmi Asia/Jakarta (WIB).
          </p>
        </div>
      </main>

      {/* Selfie capture modal if activated */}
      {showSelfieModal && (
        <SelfieCapture
          onCapture={(photo) => {
            setCapturedPhoto(photo);
            setShowSelfieModal(false);
            toast.success('Foto selfie berhasil diambil!');
          }}
          onCancel={() => setShowSelfieModal(false)}
        />
      )}

      {/* Late Reason Form Modal */}
      <Modal
        isOpen={showLateModal}
        onClose={() => setShowLateModal(false)}
        title="Formulir Alasan Keterlambatan"
      >
        <form onSubmit={submitLateReason} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-bold mb-1">Catatan Kehadiran Terlambat</div>
            Absen masuk Anda tercatat melewati batas toleransi keterlambatan ({schedule?.graceMinutes || 10} menit).
            Berdasarkan peraturan kepegawaian IMBS, alasan keterlambatan wajib disampaikan kepada manajemen HRD.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jelaskan Penyebab Keterlambatan:
            </label>
            <textarea
              rows={4}
              value={lateReasonText}
              onChange={(e) => setLateReasonText(e.target.value)}
              placeholder="Contoh: Kendala cuaca hujan lebat di perjalanan, ban bocor, atau urusan darurat keluarga..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLateModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Nanti Saja
            </button>
            <button
              type="submit"
              disabled={submittingLateReason}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submittingLateReason ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Kirimkan Alasan
            </button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}

