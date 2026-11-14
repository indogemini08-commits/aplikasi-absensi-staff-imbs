'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

export interface RecapItem {
  no: number;
  employee_id: string;
  name: string;
  nip: string;
  department_name: string;
  position: string;
  total_masuk: number;
  total_pulang: number;
  total_telat: number;
  total_pulang_cepat: number;
  total_lupa_pulang: number;
  total_tidak_hadir: number;
  predikat: string;
}

export interface InstitutionInfo {
  govName: string;
  foundationName: string;
  schoolName: string;
  address: string;
  contact: string;
  email?: string;
  phone?: string;
  headmaster: string;
  headmasterTitle?: string;
  headmasterNip?: string;
  tuStaff: string;
  tuStaffTitle?: string;
  tuStaffNip?: string;
  logoInstitution?: string;
  logoFoundation?: string;
  logoApp?: string;
}

export type PaperSize = 'A4' | 'F4' | 'A3';
export type Orientation = 'portrait' | 'landscape';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodFormatted: string;
  monthName: string;
  formattedEndDate: string;
  institution: InstitutionInfo;
  recapSummary: RecapItem[];
  stats?: any;
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  periodFormatted,
  monthName,
  formattedEndDate,
  institution,
  recapSummary,
  stats,
}: ReportPreviewModalProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 65 : 100
  );
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 140));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoomLevel(100);

  const cleanPeriodForFilename = periodFormatted
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_');

  // 1. Simpan dalam PNG High Quality (300 DPI) - Auto-Fit
  const handleDownloadPng = async () => {
    if (!documentRef.current) return;
    try {
      setIsGeneratingPng(true);
      setDownloadSuccess(null);

      const html2canvas = (await import('html2canvas')).default;
      const element = documentRef.current;

      const canvas = await html2canvas(element, {
        scale: 3, // Ultra-sharp 300 DPI high resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.offsetWidth || 1240,
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Rekap_Kehadiran_IMBS_${cleanPeriodForFilename}_AutoFit_300DPI.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess('File PNG High Quality (Auto-Fit 300 DPI) berhasil diunduh tanpa ada bagian yang terpotong!');
      setTimeout(() => setDownloadSuccess(null), 4500);
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('Gagal menghasilkan file PNG. Silakan coba kembali.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // 2. Simpan dalam PDF Resmi - Kertas dan Orientasi Otomatis Menyesuaikan Isi (Auto-Fit)
  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    try {
      setIsGeneratingPdf(true);
      setDownloadSuccess(null);

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = documentRef.current;

      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution for crisp PDF rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.offsetWidth || 1240,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Hitung dimensi fisik dalam mm dari ukuran asli elemen sebelum scale (1 px ≈ 0.264583 mm)
      const elementWidthPx = canvas.width / 2.5;
      const elementHeightPx = canvas.height / 2.5;

      const contentWidthMm = elementWidthPx * 0.264583;
      const contentHeightMm = elementHeightPx * 0.264583;

      const marginMm = 6;
      const pdfWidthMm = contentWidthMm + marginMm * 2;
      const pdfHeightMm = contentHeightMm + marginMm * 2;
      const pdfOrientation = pdfWidthMm >= pdfHeightMm ? 'landscape' : 'portrait';

      // Kertas otomatis dibuat presisi sesuai seluruh dimensi isi dokumen (Auto-Fit Bebas Crop)
      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: [pdfWidthMm, pdfHeightMm],
      });

      pdf.addImage(imgData, 'PNG', marginMm, marginMm, contentWidthMm, contentHeightMm);
      pdf.save(`Rekap_Kehadiran_IMBS_${cleanPeriodForFilename}_AutoFit.pdf`);

      setDownloadSuccess('Dokumen PDF resmi (Auto-Fit Bebas Crop) berhasil diunduh secara utuh!');
      setTimeout(() => setDownloadSuccess(null), 4500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal menghasilkan file PDF. Silakan coba kembali.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalMasukAll = recapSummary.reduce((acc, i) => acc + (i.total_masuk || 0), 0);
  const totalPulangAll = recapSummary.reduce((acc, i) => acc + (i.total_pulang || 0), 0);
  const totalTelatAll = recapSummary.reduce((acc, i) => acc + (i.total_telat || 0), 0);
  const totalPulangCepatAll = recapSummary.reduce((acc, i) => acc + (i.total_pulang_cepat || 0), 0);
  const totalLupaPulangAll = recapSummary.reduce((acc, i) => acc + (i.total_lupa_pulang || 0), 0);
  const totalTidakHadirAll = recapSummary.reduce((acc, i) => acc + (i.total_tidak_hadir || 0), 0);

  // Real-time synchronization: read latest live settings from storage
  let localSettings: any = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem('imbs_settings_data') || localStorage.getItem('imbs_settings_data');
      if (raw) localSettings = JSON.parse(raw);
    } catch {}
  }

  const activeInst = {
    ...institution,
    headmaster: localSettings?.headmaster_name || institution.headmaster,
    headmasterTitle: localSettings?.headmaster_title || institution.headmasterTitle || 'Kepala Sekolah',
    headmasterNip: localSettings?.headmaster_nip || institution.headmasterNip || '',
    tuStaff: localSettings?.tu_staff_name || institution.tuStaff,
    tuStaffTitle: localSettings?.tu_staff_title || institution.tuStaffTitle || 'Petugas Tata Usaha',
    tuStaffNip: localSettings?.tu_staff_nip || institution.tuStaffNip || '',
    schoolName: localSettings?.organization_name || institution.schoolName,
    foundationName: localSettings?.foundation_name || institution.foundationName,
    address: localSettings?.institution_address || institution.address,
    email: localSettings?.institution_email || institution.email,
    phone: localSettings?.institution_phone || institution.phone,
    logoApp: localSettings?.logo_app || institution.logoApp,
    logoInstitution: localSettings?.logo_institution || institution.logoInstitution,
    logoFoundation: localSettings?.logo_foundation || institution.logoFoundation,
  };

  // Parse contact info for clean display
  const orgEmail = activeInst.email || 'imammuzanibs@gmail.com';
  const orgPhone = activeInst.phone || '0852 8242 4628';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* Print Specific CSS to isolate the document & remove dark mode / blur / buttons */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-recap-document,
          #official-recap-document * {
            visibility: visible;
          }
          #official-recap-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          #official-recap-document .backdrop-blur-md,
          #official-recap-document .backdrop-blur-sm,
          #official-recap-document .backdrop-blur-xs {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: #ffffff !important;
          }
          #official-recap-document table {
            border: 1px solid #cbd5e1 !important;
            width: 100% !important;
          }
          #official-recap-document th {
            background-color: #0c2340 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #official-recap-document td {
            border-bottom: 1px solid #e2e8f0 !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: landscape;
            margin: 6mm 8mm;
          }
        }
      `}</style>

      {/* Expanded Modal Box for Ultra-Wide Full Frame Preview */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] 2xl:max-w-[1400px] rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-200/90 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar - Harmonized with App Aesthetic */}
        <div className="px-5 sm:px-6 py-4 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                  Pratinjau Dokumen Rekap Kehadiran
                </h3>
                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800 text-[10px] sm:text-[10.5px]">
                  Format Otomatis (Auto-Fit Bebas Crop)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kertas dan orientasi dokumen otomatis menyesuaikan seluruh isi data secara presisi tanpa ada tampilan yang terpotong.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Controls Pill */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Perkecil"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-200 px-1 text-center w-11 text-[11px]">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Perbesar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer text-[10.5px] font-semibold flex items-center gap-1"
                title="Reset ke 100%"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">100%</span>
              </button>
            </div>

            {/* Action Buttons: PDF, PNG, Cetak */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || isGeneratingPng}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Simpan PDF</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadPng}
                disabled={isGeneratingPdf || isGeneratingPng}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPng ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses PNG...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>Simpan PNG (300 DPI)</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="py-2.5 px-3.5 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Cetak langsung ke printer"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden md:inline">Cetak</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer ml-1"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Download Success Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{downloadSuccess}</span>
            </div>
            <button
              onClick={() => setDownloadSuccess(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Document Viewer Body (Scrollable paper desk) */}
        <div className="flex-1 overflow-auto bg-slate-100/90 dark:bg-[#080c14] p-4 sm:p-6 lg:p-8 flex justify-center">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full flex justify-center min-w-fit"
          >
            {/* The Official Document Paper Sheet (Auto Layout - Zero Cropping) */}
            <div
              ref={documentRef}
              id="official-recap-document"
              className="bg-white text-slate-900 w-full max-w-[1240px] min-w-[1020px] p-6 sm:p-8 md:p-10 shadow-2xl border border-slate-200/90 rounded-2xl font-sans relative box-border mx-auto transition-all"
            >
              {/* 1. Header Laporan: Logo, Nama Lembaga, Kontak, & Badge Dokumen */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80">
                <div className="flex items-center gap-3.5">
                  <div className="h-16 w-16 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
                    <img
                      src={activeInst.logoInstitution || activeInst.logoApp || "/logo-imbs-left.png"}
                      alt={activeInst.schoolName || "Logo IMBS"}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo-imbs-left.png";
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-[#0c2340] tracking-tight leading-tight uppercase font-sans">
                      {activeInst.schoolName || 'IMAM MUZANI BOARDING SCHOOL'}
                    </h1>
                    <div className="text-xs font-bold text-slate-700 tracking-wide mt-0.5 uppercase">
                      {activeInst.foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1 max-w-xl">
                      {activeInst.address || 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                      {orgEmail && <span>E-Mail: <span className="text-slate-700 font-semibold">{orgEmail}</span></span>}
                      {orgEmail && orgPhone && <span>•</span>}
                      {orgPhone && <span>No Telepon: <span className="text-slate-700 font-semibold">{orgPhone}</span></span>}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end self-start shrink-0">
                  <span className="px-3.5 py-1 rounded-xl bg-[#edf4fb] text-[#1c4974] text-xs font-black tracking-wider uppercase border border-[#cfe1f3] shadow-xs">
                    REKAPITULASI KEHADIRAN
                  </span>
                  <div className="text-[10px] font-mono text-slate-500 font-semibold mt-2">
                    No. Dok: <span className="font-bold text-[#0c2340]">IMBS/ABS/{cleanPeriodForFilename.toUpperCase()}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">
                    Tgl Cetak: <span className="font-bold text-slate-800">{formattedEndDate}</span>
                  </div>
                </div>
              </div>

              {/* 2. Informasi Pelaporan: Layout 2 Kolom Sejajar */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-3 px-1 text-xs border-b border-slate-200/80">
                {/* Kolom Kiri */}
                <div className="space-y-1.5">
                  <div className="flex items-center text-[11px]">
                    <span className="w-28 text-slate-500 font-medium shrink-0">Nama Lembaga</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-[#0c2340] text-[11px] truncate uppercase">
                      {activeInst.schoolName || 'IMAM MUZANI BOARDING SCHOOL'}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px]">
                    <span className="w-28 text-slate-500 font-medium shrink-0">Yayasan Naungan</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-[#0c2340] text-[11px] truncate uppercase">
                      {activeInst.foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px]">
                    <span className="w-28 text-slate-500 font-medium shrink-0">Periode Absensi</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-extrabold text-[#0c2340] text-[11px] border border-slate-200">
                      {periodFormatted}
                    </span>
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-1.5">
                  <div className="flex items-center text-[11px]">
                    <span className="w-28 text-slate-500 font-medium shrink-0">Bulan Pelaporan</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-[#0c2340] text-[11px] uppercase">
                      {monthName}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px]">
                    <span className="w-28 text-slate-500 font-medium shrink-0">
                      {activeInst.tuStaffTitle || 'Petugas Tata Usaha'}
                    </span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-[#0c2340] text-[11px]">
                      {activeInst.tuStaff || 'ALDRI WAHYUDI CHANDRA'}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px]">
                    <span className="w-28 text-slate-500 font-medium shrink-0">Tanggal Cetak</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-[#0c2340] text-[11px] whitespace-nowrap">
                      {formattedEndDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Tabel Rekapitulasi Kehadiran (Full Frame - Tidak Absen Pulang Bebas Wrap & Zero Cropping) */}
              <div className="w-full rounded-2xl border border-slate-200/80 shadow-xs backdrop-blur-md bg-white/80 my-4 overflow-hidden">
                <table className="w-full text-left border-collapse table-auto whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#0c2340] text-white text-[10px] sm:text-[10.5px] font-bold tracking-wider uppercase whitespace-nowrap">
                      <th className="py-2.5 px-2 text-center w-[3.5%] whitespace-nowrap">No</th>
                      <th className="py-2.5 px-3 text-left w-[20%] whitespace-nowrap">Nama Pegawai</th>
                      <th className="py-2.5 px-3 text-left w-[14%] whitespace-nowrap">Departemen</th>
                      <th className="py-2.5 px-2 text-center w-[9%] whitespace-nowrap">Absen Masuk</th>
                      <th className="py-2.5 px-2 text-center w-[9%] whitespace-nowrap">Absen Pulang</th>
                      <th className="py-2.5 px-2 text-center w-[6.5%] whitespace-nowrap">Telat</th>
                      <th className="py-2.5 px-2 text-center w-[8.5%] whitespace-nowrap">Pulang Cepat</th>
                      <th className="py-2.5 px-3 text-center w-[12%] whitespace-nowrap">Tidak Absen Pulang</th>
                      <th className="py-2.5 px-2 text-center w-[8.5%] whitespace-nowrap">Tidak Hadir</th>
                      <th className="py-2.5 px-2.5 text-center w-[9%] whitespace-nowrap">Predikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 whitespace-nowrap text-[10.5px] sm:text-[11px]">
                    {recapSummary.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 italic whitespace-nowrap">
                          Tidak ada catatan kehadiran untuk rentang waktu ini.
                        </td>
                      </tr>
                    ) : (
                      recapSummary.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={item.employee_id || idx}
                            className={`transition-colors hover:bg-blue-50/40 whitespace-nowrap ${
                              isEven ? 'bg-white/95 backdrop-blur-xs' : 'bg-slate-50/70 backdrop-blur-xs'
                            }`}
                          >
                            <td className="py-2 px-2 text-center text-slate-500 font-medium whitespace-nowrap">
                              {item.no}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <div className="font-bold text-slate-900 leading-tight whitespace-nowrap">
                                {item.name}
                              </div>
                              {item.nip && (
                                <div className="text-[9px] font-sans text-slate-400 mt-0.5 whitespace-nowrap">
                                  {item.nip}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-medium whitespace-nowrap">
                              <div className="whitespace-nowrap">{item.department_name}</div>
                              {item.position && (
                                <div className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">
                                  {item.position}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center tabular-nums font-bold text-slate-900 whitespace-nowrap">
                              {item.total_masuk} Kali
                            </td>
                            <td className="py-2 px-2 text-center tabular-nums font-bold text-slate-900 whitespace-nowrap">
                              {item.total_pulang} Kali
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              {item.total_telat > 0 ? (
                                <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70 inline-block whitespace-nowrap">
                                  {item.total_telat} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap">0 Kali</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              {item.total_pulang_cepat > 0 ? (
                                <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70 inline-block whitespace-nowrap">
                                  {item.total_pulang_cepat} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap">0 Kali</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {item.total_lupa_pulang > 0 ? (
                                <span className="text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200/70 inline-block whitespace-nowrap">
                                  {item.total_lupa_pulang} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap">0 Kali</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              {item.total_tidak_hadir > 0 ? (
                                <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/70 inline-block whitespace-nowrap">
                                  {item.total_tidak_hadir} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap">0 Kali</span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              {/* Pill Badge Predikat Minimalis & Konsisten */}
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold border shadow-2xs whitespace-nowrap ${
                                  item.predikat === 'Sangat Baik'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : item.predikat === 'Baik'
                                    ? 'bg-[#edf4fb] text-[#1c4974] border-[#cfe1f3]'
                                    : item.predikat === 'Kurang Baik'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                {item.predikat}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {recapSummary.length > 0 && (
                    <tfoot className="border-t-2 border-slate-200/90 bg-[#f8fafc]/95 font-bold text-slate-800 text-[10.5px] whitespace-nowrap">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600 whitespace-nowrap">
                          Total Akumulasi Keseluruhan:
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-900 whitespace-nowrap">{totalMasukAll} Kali</td>
                        <td className="py-2.5 px-2 text-center text-slate-900 whitespace-nowrap">{totalPulangAll} Kali</td>
                        <td className="py-2.5 px-2 text-center text-amber-700 whitespace-nowrap">{totalTelatAll} Kali</td>
                        <td className="py-2.5 px-2 text-center text-blue-700 whitespace-nowrap">{totalPulangCepatAll} Kali</td>
                        <td className="py-2.5 px-3 text-center text-orange-700 whitespace-nowrap">{totalLupaPulangAll} Kali</td>
                        <td className="py-2.5 px-2 text-center text-rose-700 whitespace-nowrap">{totalTidakHadirAll} Kali</td>
                        <td className="py-2.5 px-2.5 text-center text-slate-600 font-medium whitespace-nowrap">Terverifikasi</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* 4. Area Verifikasi dan Tanda Tangan (Full Frame - 3 Pilar Proporsional) */}
              <div className="flex flex-row items-end justify-between gap-4 pt-4 mt-3 border-t border-slate-200/80 print-avoid-break">
                {/* Pilar 1: Card VERIFIKASI KEASLIAN (QR Code & Serial) */}
                <div className="bg-[#f8fafc]/90 backdrop-blur-xs rounded-2xl border border-slate-200/90 p-3 w-52 text-center shadow-2xs shrink-0 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>VERIFIKASI KEASLIAN</span>
                  </div>
                  <div className="my-1.5 flex justify-center">
                    <svg className="w-14 h-14 text-[#0c2340]" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="8" y="8" width="26" height="26" rx="4" fill="#0c2340" />
                      <rect x="13" y="13" width="16" height="16" rx="2" fill="white" />
                      <rect x="17" y="17" width="8" height="8" rx="1" fill="#1c4974" />
                      <rect x="66" y="8" width="26" height="26" rx="4" fill="#0c2340" />
                      <rect x="71" y="13" width="16" height="16" rx="2" fill="white" />
                      <rect x="75" y="17" width="8" height="8" rx="1" fill="#1c4974" />
                      <rect x="8" y="66" width="26" height="26" rx="4" fill="#0c2340" />
                      <rect x="13" y="71" width="16" height="16" rx="2" fill="white" />
                      <rect x="17" y="75" width="8" height="8" rx="1" fill="#1c4974" />
                      <rect x="42" y="12" width="7" height="7" fill="#0c2340" />
                      <rect x="52" y="18" width="7" height="7" fill="#0c2340" />
                      <rect x="42" y="28" width="8" height="8" rx="2" fill="#1c4974" />
                      <rect x="14" y="44" width="7" height="7" fill="#0c2340" />
                      <rect x="25" y="48" width="8" height="7" fill="#0c2340" />
                      <rect x="40" y="42" width="20" height="20" rx="4" fill="#0c2340" />
                      <circle cx="50" cy="52" r="4" fill="white" />
                      <rect x="68" y="44" width="8" height="8" fill="#0c2340" />
                      <rect x="80" y="52" width="8" height="7" fill="#0c2340" />
                      <rect x="42" y="70" width="7" height="10" fill="#0c2340" />
                      <rect x="54" y="76" width="10" height="7" fill="#0c2340" />
                      <rect x="72" y="72" width="16" height="16" rx="3" fill="#0c2340" />
                    </svg>
                  </div>
                  <div className="font-sans text-[8.5px] font-bold text-slate-700 tracking-wider whitespace-nowrap">
                    |||||| IMBS/ABS/{cleanPeriodForFilename.slice(0, 10).toUpperCase()} ||||||
                  </div>
                  <div className="text-[7.5px] text-slate-400 mt-0.5 whitespace-nowrap">
                    Scan untuk Bukti Verifikasi Resmi Sistem
                  </div>
                  <div className="text-[8px] font-bold text-slate-700 mt-0.5 whitespace-nowrap">
                    IMAM MUZANI BOARDING SCHOOL
                  </div>
                </div>

                {/* Pilar 2: Tanda Tangan Penandatangan 1 / Kepala Sekolah (Tengah) */}
                <div className="text-center w-52 shrink-0 whitespace-nowrap pb-1">
                  <div className="text-slate-500 text-[10.5px] whitespace-nowrap">Mengetahui,</div>
                  <div className="font-bold text-slate-900 text-xs whitespace-nowrap">
                    {activeInst.headmasterTitle || 'Kepala Sekolah'}
                  </div>
                  <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic whitespace-nowrap">
                    [ Tanda Tangan & Cap Sah ]
                  </div>
                  <div className="font-extrabold text-slate-950 underline text-xs tracking-tight whitespace-nowrap">
                    {activeInst.headmaster || 'Fauzan Azhiimaa, Lc'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5 whitespace-nowrap">
                    NIP: {activeInst.headmasterNip || '—'}
                  </div>
                </div>

                {/* Pilar 3: Tanggal Cetak & Tanda Tangan Penandatangan 2 / Tata Usaha (Kanan) */}
                <div className="text-center w-52 shrink-0 whitespace-nowrap pb-1">
                  <div className="text-slate-600 text-[10.5px] font-medium mb-0.5 whitespace-nowrap">
                    Bogor, <span className="font-semibold text-slate-800">{formattedEndDate}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs whitespace-nowrap">
                    {activeInst.tuStaffTitle || 'Petugas Tata Usaha'}
                  </div>
                  <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic whitespace-nowrap">
                    [ Tanda Tangan Sah ]
                  </div>
                  <div className="font-extrabold text-slate-950 underline text-xs tracking-tight whitespace-nowrap">
                    {activeInst.tuStaff || 'ALDRI WAHYUDI CHANDRA'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5 whitespace-nowrap">
                    NIP: {activeInst.tuStaffNip || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Dokumen resmi hasil kalkulasi real-time SIM-Presensi Imam Muzani Boarding School (Layout Otomatis Bebas Crop).</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isGeneratingPng}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Simpan dalam PDF</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={isGeneratingPdf || isGeneratingPng}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPng ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span>Simpan dalam PNG High Quality</span>
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
