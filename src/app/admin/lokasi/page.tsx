'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Navigation,
  Compass,
  Check,
  RefreshCw,
  Building,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Search,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { useToast } from '@/components/ToastContext';
import { parseGoogleMapsCoordinates } from '@/lib/geo-parser';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Memuat peta Leaflet...
    </div>
  ),
});

const InteractiveLocationPicker = dynamic(() => import('@/components/InteractiveLocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Memuat peta interaktif...
    </div>
  ),
});

export default function LokasiPage() {
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
  const [locations, setLocations] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('imbs_locations_list');
        return cached ? JSON.parse(cached) : [];
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('imbs_locations_list');
    }
    return true;
  });

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editLoc, setEditLoc] = useState<any>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(-6.368500);
  const [longitude, setLongitude] = useState(106.892000);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Maps coordinate extractor state
  const [gmapsInput, setGmapsInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locToDelete, setLocToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const [userRes, res] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/locations'),
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
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('imbs_user_session', JSON.stringify(userData.user));
        } catch {}
      }

      const data = res.ok ? await res.json() : { locations: [] };
      const locList = data.locations || [];
      setLocations(locList);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('imbs_locations_list', JSON.stringify(locList));
        } catch {}
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditLoc(null);
    setName('');
    setAddress('');
    setLatitude(-6.368500);
    setLongitude(106.892000);
    setRadiusMeters(100);
    setGmapsInput('');
    setExtractSuccessMsg('');
    setShowModal(true);
  };

  const openEditModal = (loc: any) => {
    setEditLoc(loc);
    setName(loc.name);
    setAddress(loc.address || '');
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setRadiusMeters(loc.radius_meters);
    setGmapsInput('');
    setExtractSuccessMsg('');
    setShowModal(true);
  };

  const confirmDelete = (loc: any) => {
    setLocToDelete(loc);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!locToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/locations?id=${locToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus lokasi kerja');
        setIsDeleting(false);
        return;
      }

      toast.success(data.message || 'Lokasi kerja berhasil dihapus.');
      setShowDeleteModal(false);
      setIsDeleting(false);
      fetchLocations();
    } catch (e) {
      console.error(e);
      toast.error('Terjadi kesalahan saat menghapus lokasi');
      setIsDeleting(false);
    }
  };

  // Extract coordinates from Google Maps Link / Raw coordinates
  const handleExtractFromGmaps = async (customInput?: string) => {
    const raw = (customInput !== undefined ? customInput : gmapsInput).trim();
    if (!raw) {
      toast.warning('Silakan tempelkan link Google Maps atau angka koordinat terlebih dahulu');
      return;
    }

    setIsExtracting(true);
    setExtractSuccessMsg('');

    // 1. Try local regex parsing first (instant)
    const localResult = parseGoogleMapsCoordinates(raw);
    if (localResult) {
      setLatitude(localResult.latitude);
      setLongitude(localResult.longitude);
      setIsExtracting(false);
      setExtractSuccessMsg(`Koordinat berhasil diambil: ${localResult.latitude}, ${localResult.longitude}`);
      toast.success(`Koordinat berhasil diambil dari Google Maps! (${localResult.latitude}, ${localResult.longitude})`);
      return;
    }

    // 2. Call backend parser (resolves shortlinks / search)
    try {
      const res = await fetch('/api/locations/parse-gmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: raw }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengekstrak koordinat dari input tersebut');
        setIsExtracting(false);
        return;
      }

      setLatitude(data.latitude);
      setLongitude(data.longitude);
      if (data.displayName && !address) {
        setAddress(data.displayName);
      }
      setExtractSuccessMsg(`Koordinat berhasil diambil: ${data.latitude}, ${data.longitude}`);
      toast.success(`Koordinat Google Maps berhasil diekstrak! (${data.latitude}, ${data.longitude})`);
      setIsExtracting(false);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memproses koordinat Google Maps');
      setIsExtracting(false);
    }
  };

  // Auto-extract when pasting into input
  const handlePasteGmapsInput = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      setGmapsInput(pastedText);
      handleExtractFromGmaps(pastedText);
    }
  };

  // Open Google Maps in a new tab centered at current coordinates
  const openGoogleMapsInNewTab = () => {
    const url = latitude && longitude
      ? `https://www.google.com/maps/@${latitude},${longitude},18z`
      : 'https://www.google.com/maps';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Get current device GPS
  const pickCurrentGps = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Browser tidak mendukung geolokasi');
      return;
    }
    toast.info('Mengambil titik koordinat GPS dari perangkat...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setExtractSuccessMsg(`Koordinat GPS perangkat disinkronkan: ${lat}, ${lng}`);
        toast.success(`Koordinat GPS perangkat berhasil disinkronkan! (${lat}, ${lng})`);
      },
      (err) => {
        toast.error('Gagal mengambil GPS: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || isNaN(latitude) || isNaN(longitude)) {
      toast.warning('Nama dan koordinat latitude-longitude wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editLoc) {
        // Update
        const res = await fetch('/api/locations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editLoc.id,
            name,
            address,
            latitude: Number(latitude),
            longitude: Number(longitude),
            radiusMeters: Number(radiusMeters),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Gagal memperbarui lokasi');
          setIsSubmitting(false);
          return;
        }
        toast.success(data.message);
      } else {
        // Create
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            address,
            latitude: Number(latitude),
            longitude: Number(longitude),
            radiusMeters: Number(radiusMeters),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Gagal menambahkan lokasi');
          setIsSubmitting(false);
          return;
        }
        toast.success(data.message);
      }

      setShowModal(false);
      setIsSubmitting(false);
      fetchLocations();
    } catch (e) {
      toast.error('Terjadi kesalahan sistem');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16]">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar userRole={user?.role} />

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Lokasi & Radius Geofencing GPS
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Atur titik koordinat GPS dan batas radius absensi yang diizinkan (50m, 100m, atau custom). Mendukung sinkronisasi langsung dari Google Maps.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openAddModal}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Lokasi Baru</span>
              </button>

              <button
                onClick={fetchLocations}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Guide Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Ambil Titik Koordinat dari Google Maps:</strong>{' '}
                Saat menambah/mengedit lokasi, Anda dapat langsung menempelkan tautan Google Maps atau angka koordinat (contoh:{' '}
                <code className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 font-mono text-emerald-800 dark:text-emerald-300 font-bold">
                  -6.3685, 106.8920
                </code>
                ) untuk menetapkan titik geofence secara presisi.
              </div>
            </div>

            <button
              onClick={() => window.open('https://www.google.com/maps', '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-50 transition shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Google Maps ↗
            </button>
          </div>

          {/* Locations Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-glass flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {loc.name}
                        </h3>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Radius: {loc.radius_meters} Meter
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Buka Titik di Google Maps"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => openEditModal(loc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Ubah Titik Koordinat & Radius"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(loc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Hapus Lokasi Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                    {loc.address || 'Alamat tidak ditentukan'}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <div>
                      <div>Lat: {loc.latitude}</div>
                      <div>Lng: {loc.longitude}</div>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold hover:underline flex items-center gap-1"
                    >
                      Google Maps ↗
                    </a>
                  </div>
                </div>

                {/* Leaflet Map Preview */}
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <LeafletMap
                    userCoord={{ latitude: loc.latitude, longitude: loc.longitude }}
                    locationCoord={{ latitude: loc.latitude, longitude: loc.longitude }}
                    locationName={loc.name}
                    radiusMeters={loc.radius_meters}
                    isWithinRadius={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Add / Edit Location Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editLoc ? `Edit Lokasi: ${editLoc.name}` : 'Tambah Titik Lokasi Kerja Baru'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveLocation} className="space-y-4">
          {/* 1. Feature Box: Ambil Koordinat dari Google Maps */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ambil Titik Koordinat dari Google Maps</span>
              </div>

              <button
                type="button"
                onClick={openGoogleMapsInNewTab}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
              >
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Input field for Google Maps Link / Coordinates */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={gmapsInput}
                  onChange={(e) => setGmapsInput(e.target.value)}
                  onPaste={handlePasteGmapsInput}
                  placeholder="Tempel link Google Maps atau koordinat (contoh: -6.3685, 106.8920)..."
                  className="w-full p-2.5 pl-8 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <MapPin className="w-4 h-4 text-emerald-500 absolute left-2.5 top-3" />
              </div>

              <button
                type="button"
                onClick={() => handleExtractFromGmaps()}
                disabled={isExtracting}
                className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isExtracting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>{isExtracting ? 'Mengekstrak...' : 'Ambil Titik'}</span>
              </button>
            </div>

            {extractSuccessMsg && (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{extractSuccessMsg}</span>
              </div>
            )}

            {/* Guide Steps */}
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200/50 dark:border-emerald-800/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">Cara Mengambil Koordinat dari Google Maps:</div>
              <ol className="list-decimal pl-4 space-y-0.5 text-[10.5px] leading-relaxed">
                <li>Buka <strong>Google Maps</strong> melalui tombol di atas atau aplikasi ponsel Anda.</li>
                <li>Cari titik gedung atau kantor yang diinginkan.</li>
                <li><strong>Klik kanan</strong> pada titik bangunan tersebut, lalu klik angka koordinat paling atas (otomatis tersalin).</li>
                <li>Kembali ke halaman ini dan <strong>tempelkan (Paste)</strong> ke kolom di atas.</li>
              </ol>
            </div>
          </div>

          {/* Form Fields: Name & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lokasi Kerja:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kampus Utama IMBS / Gedung Asrama"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Lengkap / Keterangan:
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Raya Cendekia No. 88, Cibubur..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Peta Titik Absensi & Geofencing Interaktif:
              </label>
              <button
                type="button"
                onClick={pickCurrentGps}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5" />
                Gunakan GPS Perangkat Saat Ini
              </button>
            </div>

            <InteractiveLocationPicker
              latitude={latitude}
              longitude={longitude}
              radiusMeters={radiusMeters}
              locationName={name}
              onChange={(coord) => {
                setLatitude(coord.latitude);
                setLongitude(coord.longitude);
                setExtractSuccessMsg(`Titik dipindahkan ke: ${coord.latitude}, ${coord.longitude}`);
              }}
            />
          </div>

          {/* Coordinate Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Latitude:
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Longitude:
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Radius Geofencing */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Batas Radius Geofencing (Meter):
            </label>
            <div className="flex items-center gap-2 mb-2">
              {[50, 80, 100, 150, 200].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRadiusMeters(preset)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                    radiusMeters === preset
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {preset} m
                </button>
              ))}
            </div>
            <input
              type="number"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10) || 100)}
              placeholder="Nilai radius khusus..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editLoc ? 'Simpan Perubahan Lokasi' : 'Tambahkan Lokasi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Location Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Konfirmasi Hapus Lokasi Kerja"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <div className="font-bold">Apakah Anda yakin ingin menghapus lokasi kerja ini?</div>
              <p>
                <strong>{locToDelete?.name}</strong> {locToDelete?.address ? `(${locToDelete.address})` : ''}
              </p>
              <div className="font-mono text-[11px] text-rose-600 dark:text-rose-300">
                Lat: {locToDelete?.latitude}, Lng: {locToDelete?.longitude} (Radius {locToDelete?.radius_meters}m)
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Setelah lokasi ini dihapus, staf tidak lagi dapat melakukan absensi geofencing pada titik koordinat ini.
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={executeDelete}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus Lokasi'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
