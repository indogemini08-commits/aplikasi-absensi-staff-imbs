'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, RefreshCw, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
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
}

export default function LocationRadar({
  userCoord,
  accuracy,
  targetLocation,
  distanceMeters,
  isWithinRadius,
  onRefreshGps,
  isLoadingGps,
}: LocationRadarProps) {
  const [showMap, setShowMap] = useState(false);

  const radius = targetLocation?.radius_meters || 100;
  const distance = distanceMeters !== null ? distanceMeters : 0;

  // Radar visual ratio (0 = at center, 100% = right on boundary, >100% = outside boundary)
  const ratio = Math.min(1.4, distance / (radius || 1));
  const pinOffsetPercent = Math.max(15, Math.min(85, 50 + ratio * 35));

  return (
    <div className="w-full glass-card rounded-2xl p-4 md:p-5 shadow-glass dark:shadow-glass-dark border border-slate-200/80 dark:border-slate-800/80 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Navigation className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Validasi Geofencing GPS
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {targetLocation?.name || 'Mencari lokasi kerja...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowMap(!showMap)}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {showMap ? 'Radar View' : 'Peta View'}
          </button>
          <button
            onClick={onRefreshGps}
            disabled={isLoadingGps}
            title="Refresh Koordinat GPS"
            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingGps ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showMap && userCoord && targetLocation ? (
        <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
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
        <div className="relative w-full h-44 bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-950/90 rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center mb-3">
          {/* Concentric radar rings */}
          <div className="absolute w-36 h-36 rounded-full border border-emerald-500/20 dark:border-emerald-400/20" />
          <div className="absolute w-28 h-28 rounded-full border border-dashed border-emerald-500/30 dark:border-emerald-400/30" />
          <div className={`absolute w-20 h-20 rounded-full ${isWithinRadius ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-rose-500/10 border border-rose-500/40'} animate-radar`} />

          {/* Center: Work Location Marker */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white shadow-md flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1 bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded shadow-xs">
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
        className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
          isWithinRadius
            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isWithinRadius ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          )}
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <div className="font-semibold text-sm mb-0.5">
            {isWithinRadius ? 'Posisi Di Dalam Radius Absensi' : 'Anda Berada Di Luar Radius'}
          </div>
          <div>
            Jarak saat ini: <strong>{Math.round(distance)} meter</strong> dari titik tengah lokasi.
            Batas radius yang diizinkan: <strong>{radius} meter</strong>.
          </div>
          {!isWithinRadius && (
            <div className="mt-1 text-rose-700 dark:text-rose-300 font-medium">
              Silakan mendekat minimal {Math.max(0, Math.round(distance - radius))} meter lagi ke titik lokasi agar tombol absensi aktif.
            </div>
          )}
        </div>
      </div>

      {/* Accuracy & Security Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Validasi Geofence Server-Side
        </span>
        <span>
          Akurasi GPS: <strong>±{accuracy ? Math.round(accuracy) : '-'}m</strong>
        </span>
      </div>
    </div>
  );
}

