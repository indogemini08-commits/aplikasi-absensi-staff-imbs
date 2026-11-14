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
  tuStaff: string;
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
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Default optimized to A4 Landscape for wide data tables
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');

  if (!isOpen) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 140));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoomLevel(100);

  const cleanPeriodForFilename = periodFormatted
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_');

  // Paper dimensions in mm
  const getPaperDimensionsMm = () => {
    let w = 210;
    let h = 297;
    if (paperSize === 'A4') {
      w = 210;
      h = 297;
    } else if (paperSize === 'F4') {
      w = 215;
      h = 330;
    } else if (paperSize === 'A3') {
      w = 297;
      h = 420;
    }

    if (orientation === 'landscape') {
      return { width: h, height: w };
    }
    return { width: w, height: h };
  };

  // 1. Simpan dalam PNG High Quality (300 DPI)
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
      link.download = `Rekap_Kehadiran_IMBS_${cleanPeriodForFilename}_${paperSize}_${orientation}_HQ.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(`File PNG High Quality (${paperSize} ${orientation === 'portrait' ? 'Portrait' : 'Landscape'} 300 DPI) berhasil diunduh!`);
      setTimeout(() => setDownloadSuccess(null), 4500);
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('Gagal menghasilkan file PNG. Silakan coba kembali.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // 2. Simpan dalam PDF Resmi (A4, F4, A3 | Portrait / Landscape)
  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    try {
      setIsGeneratingPdf(true);
      setDownloadSuccess(null);

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = documentRef.current;

      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution for crisp PDF vector rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.offsetWidth || 1240,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      // jsPDF format mapping
      let pdfFormat: string | [number, number] = 'a4';
      if (paperSize === 'A4') {
        pdfFormat = 'a4';
      } else if (paperSize === 'F4') {
        pdfFormat = [215, 330];
      } else if (paperSize === 'A3') {
        pdfFormat = 'a3';
      }

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfFormat,
      });

      const { width: pageWidth, height: pageHeight } = getPaperDimensionsMm();
      const margin = 8; // 8mm margin
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      if (imgHeight <= printableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        const scaleFactor = printableHeight / imgHeight;
        if (scaleFactor >= 0.70) {
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth * scaleFactor, printableHeight);
        } else {
          let heightLeft = imgHeight;
          let position = margin;
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= printableHeight;

          while (heightLeft > 0) {
            position = margin - (imgHeight - heightLeft);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= printableHeight;
          }
        }
      }

      pdf.save(`Rekap_Kehadiran_IMBS_${cleanPeriodForFilename}_${paperSize}_${orientation}.pdf`);
      setDownloadSuccess(`Dokumen PDF resmi (${paperSize} ${orientation === 'portrait' ? 'Portrait' : 'Landscape'}) berhasil diunduh!`);
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

  // Parse contact info for clean display
  const orgEmail = institution.email || 'imammuzanibs@gmail.com';
  const orgPhone = institution.phone || '0852 8242 4628';

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
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            max-width: 100% !important;
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
            size: ${paperSize === 'A3' ? 'A3' : paperSize === 'F4' ? '215mm 330mm' : 'A4'} ${orientation};
            margin: 8mm;
          }
        }
      `}</style>

      {/* Expanded Modal Box for Ultra-Wide Full Frame Preview */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] 2xl:max-w-[1400px] rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-200/90 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar - Harmonized with App Aesthetic */}
        <div className="px-6 py-4 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  Pratinjau Dokumen Rekap Kehadiran
                </h3>
                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800 text-[10.5px]">
                  Format Cetak Resmi IMBS (Full Frame)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Layout Full Frame presisi menyesuaikan ukuran kertas A4 Landscape tanpa pemotongan tabel.
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

        {/* Paper Size & Orientation Sub-Toolbar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">Ukuran Kertas:</span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-2xs">
                {(['A4', 'F4', 'A3'] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                      paperSize === size
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {size === 'F4' ? 'F4 / Folio' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation Selector */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">Orientasi:</span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    orientation === 'landscape'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Landscape (Direkomendasikan)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    orientation === 'portrait'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Portrait (Tegak)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-mono bg-slate-200/70 dark:bg-slate-700/70 px-2 py-0.5 rounded-md font-semibold text-slate-700 dark:text-slate-200">
              {paperSize === 'A4'
                ? orientation === 'portrait' ? '210 × 297 mm' : '297 × 210 mm (Standar Laporan)'
                : paperSize === 'F4'
                ? orientation === 'portrait' ? '215 × 330 mm (Folio)' : '330 × 215 mm (Folio)'
                : orientation === 'portrait' ? '297 × 420 mm (A3)' : '420 × 297 mm (A3)'}
            </span>
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
            className="w-full flex justify-center"
          >
            {/* The Official Document Paper Sheet (Full Frame Layout - Zero Cropping) */}
            <div
              ref={documentRef}
              id="official-recap-document"
              className={`bg-white text-slate-900 w-full p-6 sm:p-8 shadow-2xl border border-slate-200/90 rounded-2xl font-sans relative box-border ${
                orientation === 'landscape'
                  ? paperSize === 'A3'
                    ? 'max-w-[1380px]'
                    : 'max-w-[1240px]'
                  : paperSize === 'A3'
                  ? 'max-w-[1000px]'
                  : 'max-w-[850px]'
              }`}
              style={{
                minHeight:
                  orientation === 'landscape'
                    ? paperSize === 'A3' ? '920px' : '780px'
                    : paperSize === 'A3' ? '1450px' : paperSize === 'F4' ? '1280px' : '1100px',
              }}
            >
              {/* 1. Header Laporan: Logo, Nama Lembaga, Kontak, & Badge Dokumen */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80">
                {/* Left: Logo & Identity */}
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src={institution.logoInstitution || institution.logoApp || "/logo-imbs-left.png"}
                      alt="Logo Lembaga"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-[#0c2340] tracking-tight uppercase leading-tight whitespace-nowrap">
                      {institution.schoolName || 'IMAM MUZANI BOARDING SCHOOL'}
                    </h1>
                    <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                      {institution.foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
                    </div>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">
                      {institution.address || 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610'}
                    </p>
                    <div className="text-[10px] text-slate-600 font-semibold leading-tight mt-1 flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                      <span>E-Mail: <span className="text-slate-800">{orgEmail}</span></span>
                      <span className="text-slate-300">•</span>
                      <span>No Telepon: <span className="text-slate-800">{orgPhone}</span></span>
                    </div>
                  </div>
                </div>

                {/* Right: Badge & Dokumen Meta */}
                <div className="flex flex-col sm:items-end shrink-0 pt-0.5 whitespace-nowrap">
                  <div className="bg-[#edf4fb] text-[#1c4974] font-black text-xs px-3.5 py-1.5 rounded-xl border border-[#cfe1f3] uppercase tracking-wider shadow-2xs flex items-center gap-1.5 whitespace-nowrap">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#1c4974]" />
                    <span>REKAPITULASI KEHADIRAN</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10.5px] font-mono font-bold text-slate-800 mt-1.5 whitespace-nowrap">
                    <span className="text-slate-400 font-sans text-[10px] font-medium">No. Dok:</span>
                    <span>IMBS/ABS/{cleanPeriodForFilename.toUpperCase()}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                    Tgl Cetak: <span className="font-semibold text-slate-700">{formattedEndDate}</span>
                  </div>
                </div>
              </div>

              {/* 2. Informasi Pelaporan: Layout 2 Kolom Sejajar Simetris & Bebas Wrap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 py-3 text-xs border-b border-slate-100">
                {/* Kolom Kiri */}
                <div className="space-y-1">
                  <div className="flex items-center whitespace-nowrap">
                    <span className="w-32 text-slate-500 font-medium text-[11px] shrink-0 whitespace-nowrap">Nama Lembaga</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-slate-900 text-[11px] whitespace-nowrap truncate">{institution.schoolName}</span>
                  </div>
                  <div className="flex items-center whitespace-nowrap">
                    <span className="w-32 text-slate-500 font-medium text-[11px] shrink-0 whitespace-nowrap">Yayasan Naungan</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-semibold text-slate-800 text-[11px] whitespace-nowrap truncate">{institution.foundationName}</span>
                  </div>
                  <div className="flex items-center whitespace-nowrap">
                    <span className="w-32 text-slate-500 font-medium text-[11px] shrink-0 whitespace-nowrap">Periode Absensi</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-[#0c2340] text-[11px] bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/70 whitespace-nowrap">{periodFormatted}</span>
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-1">
                  <div className="flex items-center whitespace-nowrap">
                    <span className="w-32 text-slate-500 font-medium text-[11px] shrink-0 whitespace-nowrap">Bulan Pelaporan</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-bold text-[#0c2340] text-[11px] uppercase tracking-wide whitespace-nowrap">{monthName}</span>
                  </div>
                  <div className="flex items-center whitespace-nowrap">
                    <span className="w-32 text-slate-500 font-medium text-[11px] shrink-0 whitespace-nowrap">Petugas Tata Usaha</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-semibold text-slate-900 text-[11px] whitespace-nowrap">{institution.tuStaff || 'ALDRI WAHYUDI CHANDRA'}</span>
                  </div>
                  <div className="flex items-center whitespace-nowrap">
                    <span className="w-32 text-slate-500 font-medium text-[11px] shrink-0 whitespace-nowrap">Penanggung Jawab</span>
                    <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                    <span className="font-semibold text-slate-900 text-[11px] whitespace-nowrap">
                      {institution.headmaster || 'Fauzan Azhiimaa, Lc'} <span className="text-slate-400 text-[10px] font-normal">(Kepala Sekolah)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Tabel Rekapitulasi Kehadiran (Full Frame - Menyesuaikan Lebar Kertas Tanpa Scroll/Crop) */}
              <div className="w-full rounded-2xl border border-slate-200/80 shadow-xs backdrop-blur-md bg-white/80 my-4 overflow-hidden">
                <table className="w-full text-left border-collapse table-auto whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#0c2340] text-white text-[10px] sm:text-[10.5px] font-bold tracking-wider uppercase whitespace-nowrap">
                      <th className="py-2.5 px-1.5 text-center w-[3.5%] whitespace-nowrap">No</th>
                      <th className="py-2.5 px-3 text-left w-[22%] whitespace-nowrap">Nama Pegawai</th>
                      <th className="py-2.5 px-3 text-left w-[17%] whitespace-nowrap">Departemen</th>
                      <th className="py-2.5 px-2 text-center w-[8%] whitespace-nowrap">Absen Masuk</th>
                      <th className="py-2.5 px-2 text-center w-[8%] whitespace-nowrap">Absen Pulang</th>
                      <th className="py-2.5 px-1.5 text-center w-[6.5%] whitespace-nowrap">Telat</th>
                      <th className="py-2.5 px-1.5 text-center w-[8.5%] whitespace-nowrap">Pulang Cepat</th>
                      <th className="py-2.5 px-1.5 text-center w-[8.5%] whitespace-nowrap">Lupa Pulang</th>
                      <th className="py-2.5 px-1.5 text-center w-[8%] whitespace-nowrap">Tidak Hadir</th>
                      <th className="py-2.5 px-2.5 text-center w-[10%] whitespace-nowrap">Predikat</th>
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
                            <td className="py-2 px-1.5 text-center text-slate-500 font-medium whitespace-nowrap">
                              {item.no}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <div className="font-bold text-slate-900 leading-tight whitespace-nowrap">
                                {item.name}
                              </div>
                              {item.nip && (
                                <div className="text-[9px] font-mono text-slate-400 mt-0.5 whitespace-nowrap">
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
                            <td className="py-2 px-2 text-center font-bold text-slate-800 whitespace-nowrap">
                              {item.total_masuk} Kali
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-slate-800 whitespace-nowrap">
                              {item.total_pulang} Kali
                            </td>
                            <td className="py-2 px-1.5 text-center whitespace-nowrap">
                              {item.total_telat > 0 ? (
                                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 inline-block whitespace-nowrap">
                                  {item.total_telat} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap">0 Kali</span>
                              )}
                            </td>
                            <td className="py-2 px-1.5 text-center whitespace-nowrap">
                              {item.total_pulang_cepat > 0 ? (
                                <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70 inline-block whitespace-nowrap">
                                  {item.total_pulang_cepat} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap">0 Kali</span>
                              )}
                            </td>
                            <td className="py-2 px-1.5 text-center whitespace-nowrap">
                              {item.total_lupa_pulang > 0 ? (
                                <span className="text-orange-700 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200/70 inline-block whitespace-nowrap">
                                  {item.total_lupa_pulang} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap">0 Kali</span>
                              )}
                            </td>
                            <td className="py-2 px-1.5 text-center whitespace-nowrap">
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
                        <td className="py-2.5 px-1.5 text-center text-amber-700 whitespace-nowrap">{totalTelatAll} Kali</td>
                        <td className="py-2.5 px-1.5 text-center text-blue-700 whitespace-nowrap">{totalPulangCepatAll} Kali</td>
                        <td className="py-2.5 px-1.5 text-center text-orange-700 whitespace-nowrap">{totalLupaPulangAll} Kali</td>
                        <td className="py-2.5 px-1.5 text-center text-rose-700 whitespace-nowrap">{totalTidakHadirAll} Kali</td>
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
                  <div className="font-mono text-[8.5px] font-bold text-slate-700 tracking-wider whitespace-nowrap">
                    |||||| IMBS/ABS/{cleanPeriodForFilename.slice(0, 10).toUpperCase()} ||||||
                  </div>
                  <div className="text-[7.5px] text-slate-400 mt-0.5 whitespace-nowrap">
                    Scan untuk Bukti Verifikasi Resmi Sistem
                  </div>
                  <div className="text-[8px] font-bold text-slate-700 mt-0.5 whitespace-nowrap">
                    IMAM MUZANI BOARDING SCHOOL
                  </div>
                </div>

                {/* Pilar 2: Tanda Tangan Kepala Sekolah (Tengah) */}
                <div className="text-center w-52 shrink-0 whitespace-nowrap pb-1">
                  <div className="text-slate-500 text-[10.5px] whitespace-nowrap">Mengetahui,</div>
                  <div className="font-bold text-slate-900 text-xs whitespace-nowrap">Kepala Sekolah</div>
                  <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic whitespace-nowrap">
                    [ Tanda Tangan & Cap Sah ]
                  </div>
                  <div className="font-extrabold text-slate-950 underline text-xs tracking-tight whitespace-nowrap">
                    {institution.headmaster || 'Fauzan Azhiimaa, Lc'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                    NIP: —
                  </div>
                </div>

                {/* Pilar 3: Tanggal Cetak & Tanda Tangan Tata Usaha (Kanan) */}
                <div className="text-center w-52 shrink-0 whitespace-nowrap pb-1">
                  <div className="text-slate-600 text-[10.5px] font-medium mb-0.5 whitespace-nowrap">
                    Bogor, <span className="font-semibold text-slate-800">{formattedEndDate}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs whitespace-nowrap">Petugas Tata Usaha</div>
                  <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic whitespace-nowrap">
                    [ Tanda Tangan Sah ]
                  </div>
                  <div className="font-extrabold text-slate-950 underline text-xs tracking-tight whitespace-nowrap">
                    {institution.tuStaff || 'ALDRI WAHYUDI CHANDRA'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                    NIP: —
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Dokumen resmi hasil kalkulasi real-time SIM-Presensi Imam Muzani Boarding School.</span>
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
