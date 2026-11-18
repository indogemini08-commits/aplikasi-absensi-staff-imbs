'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
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
  total_izin?: number;
  total_sakit?: number;
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
  const previewScrollContainerRef = useRef<HTMLDivElement>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [measuredHeight, setMeasuredHeight] = useState<number>(1200);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Auto-fit calculation based on current viewport
  const handleFitToScreen = () => {
    if (previewScrollContainerRef.current) {
      const containerWidth = previewScrollContainerRef.current.clientWidth - 48; // padding margin
      const optimalZoom = Math.min(100, Math.max(45, Math.floor((containerWidth / 1240) * 100)));
      setZoomLevel(optimalZoom);
    }
  };

  // Measure natural document height whenever content changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      handleFitToScreen();
      if (documentRef.current) {
        setMeasuredHeight(documentRef.current.offsetHeight);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [isOpen, recapSummary]);

  // Keep height updated with ResizeObserver
  useEffect(() => {
    if (!isOpen || !documentRef.current) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === documentRef.current) {
          setMeasuredHeight(entry.contentRect.height);
        }
      }
    });

    ro.observe(documentRef.current);
    return () => ro.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 140));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const cleanPeriodForFilename = periodFormatted
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_');

  // Inject font and style overrides into cloned documents
  const configureClonedDocument = (clonedDoc: Document) => {
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.forEach((font) => {
        try {
          clonedDoc.fonts.add(font);
        } catch {}
      });
    }

    const style = clonedDoc.createElement('style');
    style.textContent = `
      * {
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        box-sizing: border-box !important;
      }
      html, body {
        height: auto !important;
        min-height: fit-content !important;
        max-height: none !important;
        overflow: visible !important;
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      img {
        display: inline-block !important;
      }
      #imbs-offscreen-export-document,
      #official-recap-document {
        height: auto !important;
        min-height: fit-content !important;
        max-height: none !important;
        overflow: visible !important;
        transform: none !important;
        box-sizing: border-box !important;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        height: auto !important;
      }
      th {
        vertical-align: middle !important;
        line-height: 1.2 !important;
        padding-top: 11px !important;
        padding-bottom: 11px !important;
      }
      td {
        vertical-align: middle !important;
        line-height: 1.25 !important;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }
      .recap-badge,
      .recap-badge-pill,
      .recap-header-badge {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
        line-height: 1 !important;
        box-sizing: border-box !important;
      }
    `;
    clonedDoc.head.appendChild(style);
  };

  /**
   * BULLETPROOF OFFSCREEN SNAPSHOT RENDERER
   * Clones the document into an isolated offscreen container on document.body,
   * completely unconstrained by modal dialogs, CSS scale transforms, or scroll positions.
   * Guarantees 100% zero-crop capture from Kop down to the last signature.
   */
  const captureUnconstrainedCanvas = async (scaleMultiplier: number): Promise<HTMLCanvasElement> => {
    if (!documentRef.current) throw new Error('Elemen dokumen tidak ditemukan');

    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    const html2canvas = (await import('html2canvas')).default;

    // 1. Create dedicated offscreen sandbox container
    const sandbox = document.createElement('div');
    sandbox.id = 'imbs-offscreen-sandbox';
    sandbox.style.position = 'fixed';
    sandbox.style.left = '-99999px';
    sandbox.style.top = '0';
    sandbox.style.width = '1240px';
    sandbox.style.height = 'auto';
    sandbox.style.minHeight = 'fit-content';
    sandbox.style.maxHeight = 'none';
    sandbox.style.overflow = 'visible';
    sandbox.style.transform = 'none';
    sandbox.style.zIndex = '-99999';
    sandbox.style.backgroundColor = '#ffffff';

    // 2. Clone the document node
    const clone = documentRef.current.cloneNode(true) as HTMLElement;
    clone.id = 'imbs-offscreen-export-document';
    clone.style.width = '1240px';
    clone.style.maxWidth = '1240px';
    clone.style.minWidth = '1240px';
    clone.style.height = 'auto';
    clone.style.minHeight = 'fit-content';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.borderRadius = '0';

    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
      // Allow DOM & web components to paint
      await new Promise((resolve) => setTimeout(resolve, 80));

      const captureWidth = 1240;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 600);

      const canvas = await html2canvas(clone, {
        scale: scaleMultiplier,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth + 80,
        windowHeight: captureHeight + 80,
        onclone: (clonedDoc) => configureClonedDocument(clonedDoc),
      });

      return canvas;
    } finally {
      if (sandbox.parentElement) {
        sandbox.parentElement.removeChild(sandbox);
      }
    }
  };

  // 1. Unduh PNG Kualitas Tinggi (300 DPI) - Auto-Fit Bebas Crop
  const handleDownloadPng = async () => {
    try {
      setIsGeneratingPng(true);
      setDownloadSuccess(null);

      const canvas = await captureUnconstrainedCanvas(3.0); // 300 DPI High-Res
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Rekap_Kehadiran_IMBS_${cleanPeriodForFilename}_AutoFit_300DPI.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess('File PNG High Quality (300 DPI Bebas Crop) berhasil diunduh dengan seluruh data lengkap!');
      setTimeout(() => setDownloadSuccess(null), 4500);
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('Gagal menghasilkan file PNG. Silakan coba kembali.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // 2. Unduh PDF Resmi - Dynamic Canvas Page Sizing (Auto-Fit Bebas Crop)
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setDownloadSuccess(null);

      const canvas = await captureUnconstrainedCanvas(2.5); // Crisp 2.5x
      const { jsPDF } = await import('jspdf');

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Hitung dimensi fisik dalam mm dari pixel unscaled (1 px ≈ 0.264583 mm)
      const unscaledWidthPx = canvas.width / 2.5;
      const unscaledHeightPx = canvas.height / 2.5;

      const contentWidthMm = unscaledWidthPx * 0.264583;
      const contentHeightMm = unscaledHeightPx * 0.264583;

      const marginMm = 8;
      const pdfWidthMm = Math.round(contentWidthMm + marginMm * 2);
      const pdfHeightMm = Math.round(contentHeightMm + marginMm * 2);
      const pdfOrientation = pdfWidthMm >= pdfHeightMm ? 'landscape' : 'portrait';

      // Dokumen PDF dibuat dengan ukuran dinamis otomatis mengikuti seluruh konten
      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: [pdfWidthMm, pdfHeightMm],
        compress: true,
      });

      pdf.addImage(imgData, 'PNG', marginMm, marginMm, contentWidthMm, contentHeightMm, undefined, 'FAST');
      pdf.save(`Rekap_Kehadiran_IMBS_${cleanPeriodForFilename}_AutoFit.pdf`);

      setDownloadSuccess('Dokumen PDF resmi (Dynamic Auto-Fit Bebas Crop) berhasil diunduh tanpa ada data yang terpotong!');
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
  const totalIzinAll = recapSummary.reduce((acc, i) => acc + (i.total_izin || 0), 0);
  const totalSakitAll = recapSummary.reduce((acc, i) => acc + (i.total_sakit || 0), 0);
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

  const orgEmail = activeInst.email || 'imammuzanibs@gmail.com';
  const orgPhone = activeInst.phone || '0852 8242 4628';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* Global CSS for Perfect Middle Alignment & Print Isolation */}
      <style jsx global>{`
        #official-recap-document {
          height: auto !important;
          min-height: fit-content !important;
          max-height: none !important;
          overflow: visible !important;
        }
        #official-recap-document th,
        #official-recap-document td {
          vertical-align: middle !important;
        }
        #official-recap-document .recap-badge {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          vertical-align: middle !important;
          line-height: 1 !important;
        }
        #official-recap-document .recap-badge-pill {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          vertical-align: middle !important;
          line-height: 1 !important;
        }
        #official-recap-document .recap-header-badge {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          vertical-align: middle !important;
          line-height: 1 !important;
        }

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
            page-break-inside: auto;
          }
          #official-recap-document thead {
            display: table-header-group !important;
          }
          #official-recap-document tfoot {
            display: table-footer-group !important;
          }
          #official-recap-document tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] 2xl:max-w-[1440px] rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-200/90 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="px-5 sm:px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                  Pratinjau Dokumen Rekap Kehadiran
                </h3>
                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800 text-[10px] sm:text-[10.5px]">
                  Dynamic Auto-Fit Canvas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ukuran dan orientasi halaman otomatis menyesuaikan keseluruhan isi dan jumlah data secara utuh bebas crop.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
                onClick={handleFitToScreen}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer text-[10.5px] font-semibold flex items-center gap-1"
                title="Sesuaikan dengan lebar layar"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Fit</span>
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

            {/* Action Buttons: Simpan PDF, Simpan PNG, Cetak, Tutup (Single Primary Toolbar - No Duplicate) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || isGeneratingPng}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Ekspor dan unduh dokumen sebagai PDF resmi (Auto-Fit Bebas Crop)"
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
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Ekspor gambar PNG resolusi tinggi 300 DPI"
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

        {/* Document Viewer Body (Scrollable paper desk - Independent Scrolling & Zero Cropping) */}
        <div
          ref={previewScrollContainerRef}
          className="flex-1 overflow-auto bg-slate-100/90 dark:bg-[#080c14] p-4 sm:p-6 lg:p-8 flex justify-center items-start"
        >
          {/* Scaled Boundary Wrapper: Automatically reflects the scaled dimension for true scrollbars without clipping */}
          <div
            style={{
              width: `${Math.round(1240 * (zoomLevel / 100))}px`,
              height: `${Math.round((measuredHeight + 40) * (zoomLevel / 100))}px`,
              position: 'relative',
            }}
            className="transition-all duration-150 origin-top shrink-0 pb-16"
          >
            {/* Transform Box */}
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top left',
                width: '1240px',
                position: 'absolute',
                left: 0,
                top: 0,
              }}
            >
              {/* The Official Document Paper Sheet (Dynamic Canvas - Auto-Fit to Data, Zero Cropping) */}
              <div
                ref={documentRef}
                id="official-recap-document"
                className="bg-white text-slate-900 w-[1240px] min-w-[1240px] max-w-[1240px] p-8 sm:p-10 shadow-2xl border border-slate-200/90 rounded-2xl font-sans relative box-border mx-auto h-auto min-h-fit overflow-visible pb-12"
                style={{ height: 'auto', minHeight: 'fit-content' }}
              >
                {/* 1. Header Laporan: Logo, Nama Lembaga, Kontak, & Badge Dokumen */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80">
                  <div className="flex items-center gap-3.5">
                    <div className="h-16 w-16 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
                      <img
                        src={activeInst.logoInstitution || activeInst.logoApp || "/logo-imbs-left.png"}
                        alt={activeInst.schoolName || "Logo IMBS"}
                        className="max-h-full max-w-full object-contain inline-block"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo-imbs-left.png";
                        }}
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-[#0c2340] uppercase font-sans leading-snug">
                        {activeInst.schoolName || 'IMAM MUZANI BOARDING SCHOOL'}
                      </h1>
                      <div className="text-xs font-bold text-slate-700 tracking-wide mt-0.5 uppercase leading-normal">
                        {activeInst.foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1 max-w-xl">
                        {activeInst.address || 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610'}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-0.5 leading-normal">
                        {orgEmail && <span>E-Mail: <span className="text-slate-700 font-semibold">{orgEmail}</span></span>}
                        {orgEmail && orgPhone && <span>•</span>}
                        {orgPhone && <span>No Telepon: <span className="text-slate-700 font-semibold">{orgPhone}</span></span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end self-start shrink-0">
                    <div className="recap-header-badge inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-[#edf4fb] text-[#1c4974] text-xs font-black tracking-wider uppercase border border-[#cfe1f3] shadow-xs leading-none">
                      <span>REKAPITULASI KEHADIRAN</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 font-semibold mt-2.5 leading-normal">
                      No. Dok: <span className="font-bold text-[#0c2340]">IMBS/ABS/{cleanPeriodForFilename.toUpperCase()}</span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">
                      Tgl Cetak: <span className="font-bold text-slate-800">{formattedEndDate}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Informasi Pelaporan: Layout 2 Kolom Sejajar */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-3 px-1 text-xs border-b border-slate-200/80">
                  {/* Kolom Kiri */}
                  <div className="space-y-1.5">
                    <div className="flex items-center text-[11px] leading-normal">
                      <span className="w-28 text-slate-500 font-medium shrink-0">Nama Lembaga</span>
                      <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                      <span className="font-bold text-[#0c2340] text-[11px] whitespace-nowrap uppercase leading-normal">
                        {activeInst.schoolName || 'IMAM MUZANI BOARDING SCHOOL'}
                      </span>
                    </div>
                    <div className="flex items-center text-[11px] leading-normal">
                      <span className="w-28 text-slate-500 font-medium shrink-0">Yayasan Naungan</span>
                      <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                      <span className="font-bold text-[#0c2340] text-[11px] whitespace-nowrap uppercase leading-normal">
                        {activeInst.foundationName || 'YAYASAN SABILUL HUDA NAMBO'}
                      </span>
                    </div>
                    <div className="flex items-center text-[11px] leading-normal">
                      <span className="w-28 text-slate-500 font-medium shrink-0">Periode Absensi</span>
                      <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                      <span className="recap-badge inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 font-extrabold text-[#0c2340] text-[11px] border border-slate-200 leading-none align-middle whitespace-nowrap">
                        {periodFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Kolom Kanan */}
                  <div className="space-y-1.5">
                    <div className="flex items-center text-[11px] leading-normal">
                      <span className="w-28 text-slate-500 font-medium shrink-0">Bulan Pelaporan</span>
                      <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                      <span className="font-bold text-[#0c2340] text-[11px] uppercase leading-normal whitespace-nowrap">
                        {monthName}
                      </span>
                    </div>
                    <div className="flex items-center text-[11px] leading-normal">
                      <span className="w-28 text-slate-500 font-medium shrink-0">
                        {activeInst.tuStaffTitle || 'Petugas Tata Usaha'}
                      </span>
                      <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                      <span className="font-bold text-[#0c2340] text-[11px] leading-normal whitespace-nowrap">
                        {activeInst.tuStaff || 'ALDRI WAHYUDI CHANDRA'}
                      </span>
                    </div>
                    <div className="flex items-center text-[11px] leading-normal">
                      <span className="w-28 text-slate-500 font-medium shrink-0">Tanggal Cetak</span>
                      <span className="w-3 text-slate-400 text-center shrink-0">:</span>
                      <span className="font-bold text-[#0c2340] text-[11px] leading-normal whitespace-nowrap">
                        {formattedEndDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Tabel Rekapitulasi Kehadiran (Full Frame 12 Kolom - Middle Align & Dynamic Rows) */}
                <div className="w-full rounded-2xl border border-slate-200/80 shadow-xs backdrop-blur-md bg-white/80 my-4 overflow-visible h-auto">
                  <table className="w-full text-left border-collapse table-auto whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#0c2340] text-white text-[10.5px] font-bold tracking-wider uppercase whitespace-nowrap align-middle">
                        <th className="py-3 px-2 text-center w-[3.5%] whitespace-nowrap align-middle leading-normal">No</th>
                        <th className="py-3 px-3 text-left w-[18%] whitespace-nowrap align-middle leading-normal">Nama Pegawai</th>
                        <th className="py-3 px-3 text-left w-[13.5%] whitespace-nowrap align-middle leading-normal">Departemen</th>
                        <th className="py-3 px-2 text-center w-[7%] whitespace-nowrap align-middle leading-normal">Masuk</th>
                        <th className="py-3 px-2 text-center w-[7%] whitespace-nowrap align-middle leading-normal">Pulang</th>
                        <th className="py-3 px-2 text-center w-[6%] whitespace-nowrap align-middle leading-normal">Telat</th>
                        <th className="py-3 px-2 text-center w-[7%] whitespace-nowrap align-middle leading-normal">Pulang Cepat</th>
                        <th className="py-3 px-2.5 text-center w-[9%] whitespace-nowrap align-middle leading-normal">Tidak Absen Pulang</th>
                        <th className="py-3 px-2 text-center w-[6%] whitespace-nowrap align-middle leading-normal">Izin</th>
                        <th className="py-3 px-2 text-center w-[6%] whitespace-nowrap align-middle leading-normal">Sakit</th>
                        <th className="py-3 px-2 text-center w-[7.5%] whitespace-nowrap align-middle leading-normal">Tidak Hadir</th>
                        <th className="py-3 px-2.5 text-center w-[9.5%] whitespace-nowrap align-middle leading-normal">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 whitespace-nowrap text-[10.5px] sm:text-[11px] align-middle">
                      {recapSummary.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-10 text-center text-slate-400 italic whitespace-nowrap align-middle">
                            Tidak ada catatan kehadiran untuk rentang waktu ini.
                          </td>
                        </tr>
                      ) : (
                        recapSummary.map((item, idx) => {
                          const isEven = idx % 2 === 0;
                          return (
                            <tr
                              key={item.employee_id || idx}
                              className={`transition-colors hover:bg-blue-50/40 whitespace-nowrap align-middle ${
                                isEven ? 'bg-white/95 backdrop-blur-xs' : 'bg-slate-50/70 backdrop-blur-xs'
                              }`}
                            >
                              <td className="py-2.5 px-2 text-center text-slate-500 font-medium whitespace-nowrap align-middle leading-normal">
                                {item.no}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap align-middle">
                                <div className="font-bold text-slate-900 leading-snug whitespace-nowrap">
                                  {item.name}
                                </div>
                                {item.nip && (
                                  <div className="text-[9px] font-sans text-slate-400 mt-0.5 whitespace-nowrap leading-snug">
                                    {item.nip}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap align-middle">
                                <div className="whitespace-nowrap leading-snug">{item.department_name}</div>
                                {item.position && (
                                  <div className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap leading-snug">
                                    {item.position}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center tabular-nums font-bold text-slate-900 whitespace-nowrap align-middle leading-normal">
                                {item.total_masuk} Kali
                              </td>
                              <td className="py-2.5 px-2 text-center tabular-nums font-bold text-slate-900 whitespace-nowrap align-middle leading-normal">
                                {item.total_pulang} Kali
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                                {item.total_telat > 0 ? (
                                  <span className="recap-badge inline-flex items-center justify-center px-2 py-1 rounded border border-amber-200/80 bg-amber-50 text-amber-800 font-bold text-[10.5px] leading-none whitespace-nowrap align-middle">
                                    {item.total_telat} Kali
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal whitespace-nowrap leading-normal">0 Kali</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                                {item.total_pulang_cepat > 0 ? (
                                  <span className="recap-badge inline-flex items-center justify-center px-2 py-1 rounded border border-blue-200/80 bg-blue-50 text-blue-700 font-bold text-[10.5px] leading-none whitespace-nowrap align-middle">
                                    {item.total_pulang_cepat} Kali
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal whitespace-nowrap leading-normal">0 Kali</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap align-middle">
                                {item.total_lupa_pulang > 0 ? (
                                  <span className="recap-badge inline-flex items-center justify-center px-2 py-1 rounded border border-orange-200/80 bg-orange-50 text-orange-700 font-bold text-[10.5px] leading-none whitespace-nowrap align-middle">
                                    {item.total_lupa_pulang} Kali
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal whitespace-nowrap leading-normal">0 Kali</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                                {(item.total_izin || 0) > 0 ? (
                                  <span className="recap-badge inline-flex items-center justify-center px-2 py-1 rounded border border-blue-200/80 bg-blue-50 text-blue-700 font-bold text-[10.5px] leading-none whitespace-nowrap align-middle">
                                    {item.total_izin} Hari
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal whitespace-nowrap leading-normal">0 Hari</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                                {(item.total_sakit || 0) > 0 ? (
                                  <span className="recap-badge inline-flex items-center justify-center px-2 py-1 rounded border border-purple-200/80 bg-purple-50 text-purple-700 font-bold text-[10.5px] leading-none whitespace-nowrap align-middle">
                                    {item.total_sakit} Hari
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal whitespace-nowrap leading-normal">0 Hari</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                                {item.total_tidak_hadir > 0 ? (
                                  <span className="recap-badge inline-flex items-center justify-center px-2 py-1 rounded border border-rose-200/80 bg-rose-50 text-rose-700 font-bold text-[10.5px] leading-none whitespace-nowrap align-middle">
                                    {item.total_tidak_hadir} Kali
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal whitespace-nowrap leading-normal">0 Kali</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap align-middle">
                                <span
                                  className={`recap-badge-pill inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold border shadow-2xs leading-none whitespace-nowrap align-middle ${
                                    item.predikat === 'Sangat Baik'
                                      ? 'bg-blue-50 text-blue-700 border-blue-300'
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
                      <tfoot className="border-t-2 border-slate-200/90 bg-[#f8fafc]/95 font-bold text-slate-800 text-[10.5px] whitespace-nowrap align-middle">
                        <tr className="align-middle">
                          <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-slate-600 whitespace-nowrap align-middle leading-normal">
                            Total Akumulasi Keseluruhan:
                          </td>
                          <td className="py-3 px-2 text-center text-slate-900 whitespace-nowrap align-middle leading-normal">{totalMasukAll} Kali</td>
                          <td className="py-3 px-2 text-center text-slate-900 whitespace-nowrap align-middle leading-normal">{totalPulangAll} Kali</td>
                          <td className="py-3 px-2 text-center text-amber-700 whitespace-nowrap align-middle leading-normal">{totalTelatAll} Kali</td>
                          <td className="py-3 px-2 text-center text-blue-700 whitespace-nowrap align-middle leading-normal">{totalPulangCepatAll} Kali</td>
                          <td className="py-3 px-2.5 text-center text-orange-700 whitespace-nowrap align-middle leading-normal">{totalLupaPulangAll} Kali</td>
                          <td className="py-3 px-2 text-center text-blue-700 whitespace-nowrap align-middle leading-normal">{totalIzinAll} Hari</td>
                          <td className="py-3 px-2 text-center text-purple-700 whitespace-nowrap align-middle leading-normal">{totalSakitAll} Hari</td>
                          <td className="py-3 px-2 text-center text-rose-700 whitespace-nowrap align-middle leading-normal">{totalTidakHadirAll} Kali</td>
                          <td className="py-3 px-2.5 text-center text-slate-600 font-medium whitespace-nowrap align-middle leading-normal">Terverifikasi</td>
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
                    <div className="text-slate-500 text-[10.5px] whitespace-nowrap leading-normal">Mengetahui,</div>
                    <div className="font-bold text-slate-900 text-xs whitespace-nowrap leading-normal">
                      {activeInst.headmasterTitle || 'Kepala Sekolah'}
                    </div>
                    <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic whitespace-nowrap leading-normal">
                      [ Tanda Tangan & Cap Sah ]
                    </div>
                    <div className="font-extrabold text-slate-950 underline text-xs tracking-normal whitespace-nowrap leading-normal">
                      {activeInst.headmaster || 'Fauzan Azhiimaa, Lc'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5 whitespace-nowrap leading-normal">
                      NIP: {activeInst.headmasterNip || '—'}
                    </div>
                  </div>

                  {/* Pilar 3: Tanggal Cetak & Tanda Tangan Penandatangan 2 / Tata Usaha (Kanan) */}
                  <div className="text-center w-52 shrink-0 whitespace-nowrap pb-1">
                    <div className="text-slate-600 text-[10.5px] font-medium mb-0.5 whitespace-nowrap leading-normal">
                      Bogor, <span className="font-semibold text-slate-800">{formattedEndDate}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs whitespace-nowrap leading-normal">
                      {activeInst.tuStaffTitle || 'Petugas Tata Usaha'}
                    </div>
                    <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic whitespace-nowrap leading-normal">
                      [ Tanda Tangan Sah ]
                    </div>
                    <div className="font-extrabold text-slate-950 underline text-xs tracking-normal whitespace-nowrap leading-normal">
                      {activeInst.tuStaff || 'ALDRI WAHYUDI CHANDRA'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5 whitespace-nowrap leading-normal">
                      NIP: {activeInst.tuStaffNip || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar: Clean, Single Dismiss Button (NO DUPLICATE BUTTONS) */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Dokumen resmi hasil kalkulasi real-time SIM-Presensi Imam Muzani Boarding School (Dynamic Auto-Fit Canvas).</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2 px-5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
