# Aplikasi Absensi & Pengelolaan Kehadiran Staff IMBS
### Islamic Modern Boarding School & Institute

Aplikasi absensi dan pengelolaan kehadiran pegawai berbasis web yang modern, profesional, aman, dan siap digunakan. Mengutamakan pengalaman penggunaan **mobile-first (smartphone Android)** untuk kemudahan absensi harian pegawai, serta **desktop/tablet** yang komprehensif bagi Admin & Manajemen HRD.

---

## 🌟 Fitur Utama Aplikasi

### 1. Geofencing GPS & Validasi Lokasi Multi-Titik
- **Akurasi Tinggi & Formula Haversine:** Menghitung jarak lengkung bumi yang presisi antara posisi GPS pegawai dan titik koordinat lokasi kerja.
- **Validasi Server-Side:** Radius dan koordinat divalidasi langsung di backend sebelum transaksi absensi disimpan (mencegah manipulasi frontend).
- **Pengaturan Radius Fleksibel:** Radius dapat diatur per lokasi kerja (**50m, 80m, 100m, atau nilai kustom**).
- **Visualisasi Radar & Peta Interaktif:** Dilengkapi radar jarak real-time serta peta satelit/jalan Leaflet (OpenStreetMap) gratis tanpa kunci API pihak ketiga.
- **Pemberitahuan Informatif:** Menampilkan jarak riil, misalnya: *"Anda berada di luar area absensi. Jarak ke lokasi kerja: 135 meter. Batas radius: 100 meter."*
- **Akurasi GPS:** Otomatis membatasi toleransi sinyal GPS maksimal (misal $\le$ 50m) untuk mencegah pemalsuan posisi.

### 2. Absensi Masuk & Pulang Digital (WIB - Asia/Jakarta)
- **Tombol Sentuh Ramah Ibu Jari (Thumb-Friendly):** Tombol utama berukuran besar, nyaman ditekan dengan satu tangan pada layar smartphone Android (320–430px).
- **Waktu Resmi Server (WIB):** Jam absensi dicatat menggunakan jam resmi server, bukan jam lokal perangkat pengguna.
- **Pencegahan Absensi Ganda:** Proteksi terhadap duplikasi transaksi absensi pada hari/shift yang sama.
- **Verifikasi Tambahan Foto Selfie (Opsional):** Dilengkapi modul kamera WebRTC selfie bila diaktifkan oleh admin lembaga.

### 3. Manajemen Keterlambatan Otomatis
- **Penetapan Toleransi (Grace Period):** Toleransi keterlambatan (misal 5 atau 10 menit) dapat diatur per shift kerja.
- **Deteksi Otomatis:** Pegawai yang melewati toleransi otomatis berstatus **Terlambat**.
- **Formulir Alasan Wajib:** Setelah absen masuk berhasil disimpan, pegawai langsung diarahkan mengisi alasan keterlambatan tanpa risiko hilangnya data kehadiran.
- **Panel Peninjauan HRD:** Admin dapat meninjau, memberi catatan, dan menyetujui/menolak alasan keterlambatan.

### 4. Pengajuan Izin, Sakit, & Cuti Multi-Hari
- **Rentang Tanggal Fleksibel:** Mendukung izin dan cuti lebih dari 1 hari tanpa perlu membuat pengajuan berulang.
- **Perhitungan Otomatis Hari:** Hari kerja dihitung otomatis berdasarkan rentang tanggal kalender.
- **Deteksi Tabrakan Tanggal:** Mencegah permohonan tumpang tindih dengan pengajuan atau jadwal lain.
- **Manajemen Saldo Cuti:**
  - Jatah awal cuti tahunan (default 12 hari).
  - Terpakai, menunggu persetujuan, dan sisa kuota saldo cuti.
  - Saldo cuti **hanya berkurang setelah pengajuan disetujui HRD**.

### 5. Papan Jadwal Kehadiran (Admin Attendance Board)
- **Monitoring Terpusat Harian:** Memantau seluruh pegawai dalam satu layar.
- **Komparasi Rencana vs Aktual:** Menampilkan jam rencana masuk vs jam aktual, jam rencana pulang vs jam aktual, serta selisih menit keterlambatan.
- **Filter Komprehensif:** Tanggal, divisi, status kehadiran (*Belum Absen, Hadir, Terlambat, Izin, Cuti, Sakit, Pulang, Libur*).
- **Statistik Nyata:** Angka statistik murni dihitung dari database tanpa data palsu/mock.

### 6. Rekapitulasi, Laporan, & Ekspor Data
- **Ekspor Excel / CSV Resmi:** Dilengkapi UTF-8 BOM agar otomatis terbaca rapi di Microsoft Excel versi Indonesia tanpa teks berantakan.
- **Tampilan Cetak Siap Dokumen (Print / PDF):** Dilengkapi kop surat resmi IMBS dan tata letak dokumen formal siap cetak.
- **Pencarian, Pengurutan, & Filter Rentang Tanggal:** Memudahkan audit bulanan dan penggajian (payroll).

### 7. Keamanan, RBAC, & Audit Trail
- **Autentikasi & Session:** Cookie HTTP-only terenkripsi HMAC SHA-256 dan hash kata sandi Bcrypt.
- **Pembatasan Hak Akses:** Pegawai hanya dapat mengakses datanya sendiri; URL/API diisolasi ketat.
- **Histori Audit Log:** Mencatat seluruh tindakan pembuatan akun, koreksi jam absensi, persetujuan cuti, dan perubahan radius lokasi beserta waktu dan IP address.

---

## 👥 Akun Demo Pengujian (Siap Pakai)

Semua akun di bawah menggunakan kata sandi: `password123`

| Peran (Role) | Username | Nama Pegawai | NIP | Divisi / Jabatan |
|---|---|---|---|---|
| **Pegawai (Staff)** | `pegawai` | Budi Pratama, S.Pd. | `IMBS-101` | Guru Matematika & Wali Kelas IX |
| **Pegawai (Staff)** | `rahma` | Ustadzah Rahmawati, S.Ag. | `IMBS-102` | Pembina Asrama Putri & Tahfidz |
| **Pegawai (IT)** | `fajar` | Fajar Hidayat, S.Kom. | `IMBS-103` | Pranata Komputer & IT Support |
| **Admin HRD** | `admin` | Siti Nurhaliza, S.Psi. | `IMBS-002` | Kepala SDM & Kepegawaian |
| **Super Admin** | `superadmin` | Dr. H. Ahmad Fauzi, M.Pd. | `IMBS-001` | Direktur Eksekutif Yayasan |

> 💡 **Tip:** Pada halaman Login, tersedia tombol pintas **1-Klik Akun Demo** untuk login instan tanpa harus mengetik username dan password.

---

## 🛠️ Arsitektur Teknologi

- **Frontend & Framework:** Next.js 15 (App Router, Server Actions, Route Handlers), React 19, TypeScript
- **Styling & UI/UX:** Tailwind CSS, Glassmorphism (Backdrop-filter blur, border halus, palet Emerald-Teal & Slate)
- **Komponen Ikon:** Lucide React
- **Pemetaan Lokasi & Peta:** Leaflet & OpenStreetMap (Tile OSM mandiri tanpa biaya/kunci API)
- **Basis Data:** SQLite Relasional (Native `node:sqlite` bawaan Node 24, transaksi ACID, WAL mode)
- **Timezone:** Asia/Jakarta (WIB) terstandarisasi di frontend dan backend

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Mode Produksi (Cepat & Stabil)
Aplikasi sudah selesai dibuild (`next build`). Untuk menjalankan server produksi:
```bash
npm run start
```
Buka peramban di: **http://localhost:3000**

### 2. Mode Pengembangan (Development)
```bash
npm run dev
```

---

## 📁 Struktur Direktori Proyek

```
Aplikasi Absensi Staff IMBS/
├── data/
│   └── absensi.db               # SQLite database relasional lokal
├── public/
│   └── manifest.json            # PWA manifest untuk Android Home Screen
├── src/
│   ├── app/
│   │   ├── (Staff Pages)
│   │   │   ├── dashboard/       # Dashboard beranda pegawai
│   │   │   ├── absensi/         # Halaman absensi masuk/pulang GPS & radar
│   │   │   ├── riwayat/         # Riwayat absensi & alasan keterlambatan
│   │   │   ├── izin/            # Pengajuan izin/cuti & saldo cuti
│   │   │   ├── kalender/        # Kalender kerja & hari libur
│   │   │   ├── koreksi/         # Permohonan koreksi lupa absen
│   │   │   ├── notifikasi/      # Pusat notifikasi staff
│   │   │   └── profil/          # Profil pegawai & pengaturan tema
│   │   ├── admin/
│   │   │   ├── page.tsx         # Dashboard eksekutif HRD
│   │   │   ├── papan-jadwal/    # Papan monitoring kehadiran harian
│   │   │   ├── pegawai/         # Kelola staff & impor CSV
│   │   │   ├── lokasi/          # Kelola lokasi GPS & radius absensi
│   │   │   ├── jadwal/          # Template shift & penugasan
│   │   │   ├── kalender/        # Pengaturan hari libur lembaga
│   │   │   ├── absensi/         # Master absensi & koreksi manual
│   │   │   ├── izin-cuti/       # Persetujuan cuti & izin
│   │   │   ├── keterlambatan/   # Peninjauan alasan telat
│   │   │   ├── koreksi/         # Persetujuan koreksi absensi
│   │   │   ├── laporan/         # Rekap, ekspor CSV, cetak PDF
│   │   │   ├── saldo-cuti/      # Kuota saldo cuti tahunan
│   │   │   ├── audit-log/       # Log histori aktivitas
│   │   │   └── pengaturan/      # Kebijakan presensi & lembaga
│   │   ├── api/                 # Endpoint REST API lengkap
│   │   ├── globals.css          # Desain tokens & glassmorphism
│   │   └── layout.tsx           # Layout root & toast provider
│   ├── components/
│   │   ├── Navbar.tsx           # Topbar navigasi & jam WIB live
│   │   ├── BottomNav.tsx        # Navigasi bawah smartphone Android
│   │   ├── Sidebar.tsx          # Sidebar lipat admin desktop
│   │   ├── LocationRadar.tsx    # Visualizer radar jarak & status radius
│   │   ├── LeafletMap.tsx       # Peta interaktif Leaflet OpenStreetMap
│   │   ├── SelfieCapture.tsx    # Modul kamera selfie verifikasi
│   │   ├── ToastContext.tsx     # Notifikasi toast mengambang
│   │   ├── ThemeToggle.tsx      # Pengalih Dark/Light mode
│   │   └── Modal.tsx            # Dialog modal & bottom sheet
│   └── lib/
│       ├── db.ts                # Skema database & seeder otomatis
│       ├── auth.ts              # Manajemen sesi & enkripsi password
│       ├── geo.ts               # Formula Haversine geofencing GPS
│       ├── date.ts              # Utilitas waktu Asia/Jakarta (WIB)
│       └── audit.ts             # Perekam audit trail
```

