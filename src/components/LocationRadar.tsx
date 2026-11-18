'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Radio,
  Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet map component to prevent SSR window reference error
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Memuat peta Leaflet...
    </div>
  ),
});

interface LocationRadarProps {
  userCoord: { latitude: number; longitude: number } | null;
  accuracy: number | null;
  targetLocation: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
  } | null;
  distanceMeters: number | null;
  isWithinRadius: boolean;
  onRefreshGps: () => void;
  isLoadingGps: boolean;
  isCalibrating?: boolean;
}

export default function LocationRadar({
  userCoord,
  accuracy,
  targetLocation,
  distanceMeters,
  isWithinRadius,
  onRefreshGps,
  isLoadingGps,
  isCalibrating,
}: LocationRadarProps) {
  const [showMap, setShowMap] = useState(false);

  const radius = targetLocation?.radius_meters || 100;
  const distance = distanceMeters !== null ? distanceMeters : 0;

  // Radar visual ratio (0 = at center, 100% = right on boundary, >100% = outside boundary)
  const ratio = Math.min(1.4, distance / (radius || 1));
  const pinOffsetPercent = Math.max(15, Math.min(85, 50 + ratio * 35));

  // Determine accuracy tier
  const getAccuracyTier = (acc: number | null) => {
    if (acc === null) return { label: 'Menunggu Sinyal GPS...', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', badge: '⚪ Deteksi' };
    if (acc <= 12) return { label: `Sangat Presisi (±${Math.round(acc)}m)`, color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60', badge: '🟢 Optimal' };
    if (acc <= 25) return { label: `Presisi Baik (±${Math.round(acc)}m)`, color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60', badge: '🔵 Akurat' };
    if (acc <= 50) return { label: `Presisi Sedang (±${Math.round(acc)}m)`, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60', badge: '🟡 Cukup' };
    return { label: `Sinyal Lemah (±${Math.round(acc)}m)`, color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60', badge: '🔴 Lemah' };
  };

  const accuracyTier = getAccuracyTier(accuracy);

  return (
    <div className="w-full glass-card rounded-3xl p-4 md:p-5 shadow-glass dark:shadow-glass-dark border border-slate-200/80 dark:border-slate-800/80 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Navigation className={`w-4 h-4 ${isLoadingGps || isCalibrating ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Validasi Geofencing GPS Presisi
              </h4>
              {isCalibrating && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {targetLocation?.name || 'Mencari lokasi kerja...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowMap(!showMap)}
            className="text-xs px-2.5 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            {showMap ? 'Radar' : 'Peta'}
          </button>
          <button
            onClick={onRefreshGps}
            disabled={isLoadingGps || isCalibrating}
            title="Kalibrasi Sinyal GPS Presisi Tinggi"
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGps || isCalibrating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Kalibrasi</span>
          </button>
        </div>
      </div>

      {/* Accuracy Status Pill */}
      <div className="mb-3 flex items-center justify-between text-xs px-1">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${accuracyTier.color}`}>
          <Radio className="w-3 h-3 shrink-0" />
          <span>{accuracyTier.label}</span>
        </div>
        {userCoord && (
          <span className="text-[10px] text-slate-400 font-mono">
            {userCoord.latitude.toFixed(5)}, {userCoord.longitude.toFixed(5)}
          </span>
        )}
      </div>

      {showMap && userCoord && targetLocation ? (
        <div className="mb-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <LeafletMap
            userCoord={userCoord}
            locationCoord={{ latitude: targetLocation.latitude, longitude: targetLocation.longitude }}
            locationName={targetLocation.name}
            radiusMeters={radius}
            isWithinRadius={isWithinRadius}
          />
        </div>
      ) : (
        /* Radar Graphic Visualization */
        <div className="relative w-full h-44 bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-950/90 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center mb-3">
          {/* Concentric radar rings */}
          <div className="absolute w-36 h-36 rounded-full border border-blue-500/20 dark:border-blue-400/20" />
          <div className="absolute w-28 h-28 rounded-full border border-dashed border-blue-500/30 dark:border-blue-400/30" />
          <div className={`absolute w-20 h-20 rounded-full ${isWithinRadius ? 'bg-blue-500/10 border border-blue-500/40' : 'bg-rose-500/10 border border-rose-500/40'} animate-radar`} />

          {/* Center: Work Location Marker */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full shadow-xs">
              Lokasi Kerja
            </span>
          </div>

          {/* User Marker */}
          {userCoord && (
            <div
              className="absolute z-20 transition-all duration-700 flex flex-col items-center"
              style={{
                left: `${pinOffsetPercent}%`,
                top: `${pinOffsetPercent > 50 ? 30 : 65}%`,
              }}
            >
              <div className={`w-7 h-7 rounded-full ${isWithinRadius ? 'bg-indigo-600 ring-4 ring-indigo-400/30' : 'bg-rose-600 ring-4 ring-rose-400/30'} text-white shadow-md flex items-center justify-center animate-bounce`}>
                <Navigation className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap">
                Anda ({Math.round(distance)}m)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Geofence Status Banner */}
      <div
        className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors ${
          isWithinRadius
            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
            : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isWithinRadius ? (
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          )}
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <div className="font-bold text-sm mb-0.5">
            {isWithinRadius ? 'Posisi Berada Di Dalam Radius Absensi' : 'Anda Berada Di Luar Radius'}
          </div>
          <div>
            Jarak ke titik tengah lokasi: <strong>{Math.round(distance)} meter</strong>.
            Batas radius kerja: <strong>{radius} meter</strong>.
          </div>
          {!isWithinRadius && (
            <div className="mt-1 text-rose-700 dark:text-rose-300 font-medium">
              Silakan mendekat minimal <strong>{Math.max(0, Math.round(distance - radius))} meter</strong> lagi ke area kampus atau lakukan <em>Kalibrasi Presisi</em> di tempat terbuka.
            </div>
          )}
        </div>
      </div>

      {/* Accuracy & Security Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          Verifikasi Satelit Geofence Presisi
        </span>
        <span className="font-semibold">
          Toleransi Akurasi: <strong>±{accuracy ? Math.round(accuracy) : '-'}m</strong>
        </span>
      </div>
    </div>
  );
}
