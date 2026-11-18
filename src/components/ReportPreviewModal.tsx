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

  // Helper callback for html2canvas to guarantee perfect vertical middle alignment (Zero Text-Drop / Anti Bottom-Align)
  const configureClonedDocument = (clonedDoc: Document) => {
    // 1. Synchronize loaded web fonts to cloned iframe
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.forEach((font) => {
        try {
          clonedDoc.fonts.add(font);
        } catch { }
      });
    }

    // 2. Inject explicit CSS overrides into cloned document before canvas capture
    // 2. Unconstrain cloned document & parents, remove transform scale completely
    const clonedDocRoot = clonedDoc.getElementById('official-recap-document');
    if (clonedDocRoot) {
      clonedDocRoot.style.height = 'auto';
      clonedDocRoot.style.minHeight = 'fit-content';
      clonedDocRoot.style.maxHeight = 'none';
      clonedDocRoot.style.overflow = 'visible';
      clonedDocRoot.style.transform = 'none';

      let parent = clonedDocRoot.parentElement;
      while (parent && parent !== clonedDoc.body) {
        parent.style.height = 'auto';
        parent.style.minHeight = 'fit-content';
        parent.style.maxHeight = 'none';
        parent.style.overflow = 'visible';
        parent.style.transform = 'none';
        parent = parent.parentElement;
      }
    }

    // 3. Inject explicit CSS overrides into cloned document before canvas capture
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
      }
      img {
        display: inline-block !important;
      }
      #official-recap-document {
        height: auto !important;
        min-height: fit-content !important;
        max-height: none !important;
        overflow: visible !important;
        transform: none !important;
        box-sizing: border-box !important;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      }
      #official-recap-document h1 {
        line-height: 1.25 !important;
        margin-bottom: 2px !important;
      }
      #official-recap-document table {
        border-collapse: collapse !important;
        width: 100% !important;
        height: auto !important;
      }
      #official-recap-document th {
        vertical-align: middle !important;
        line-height: 1.2 !important;
        padding-top: 11px !important;
        padding-bottom: 11px !important;
      }
      #official-recap-document td {
        vertical-align: middle !important;
        line-height: 1.25 !important;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }
      #official-recap-document .recap-badge {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
        line-height: 1 !important;
        padding: 4px 8px !important;
        min-height: 22px !important;
        box-sizing: border-box !important;
      }
      #official-recap-document .recap-badge-pill {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
        line-height: 1 !important;
        padding: 4px 12px !important;
        min-height: 22px !important;
        box-sizing: border-box !important;
      }
      #official-recap-document .recap-header-badge {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
        line-height: 1 !important;
        padding: 6px 16px !important;
        min-height: 30px !important;
        box-sizing: border-box !important;
      }
    `;
    clonedDoc.head.appendChild(style);
  };

  // 1. Simpan dalam PNG High Quality (300 DPI) - Auto-Fit & Middle Align
  const handleDownloadPng = async () => {
    if (!documentRef.current) return;
    try {
      setIsGeneratingPng(true);
      setDownloadSuccess(null);

      // Pastikan seluruh font telah siap agar metrik teks presisi
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }

      const html2canvas = (await import('html2canvas')).default;
      const element = documentRef.current;
      const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1240);
      const fullHeight = Math.max(element.scrollHeight, element.offsetHeight);

      const canvas = await html2canvas(element, {
        scale: 3, // Ultra-sharp 300 DPI high resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        onclone: (clonedDoc) => configureClonedDocument(clonedDoc),
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Rekap_Kehadiran_IMBS_${cleanPeriodForFilename}_AutoFit_300DPI.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess('File PNG High Quality (Auto-Fit 300 DPI) berhasil diunduh dengan seluruh data lengkap!');
      setTimeout(() => setDownloadSuccess(null), 4500);
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('Gagal menghasilkan file PNG. Silakan coba kembali.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // 2. Simpan dalam PDF Resmi - Kertas dan Orientasi Otomatis Menyesuaikan Isi (Auto-Fit & Middle Align)
  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    try {
      setIsGeneratingPdf(true);
      setDownloadSuccess(null);

      // Pastikan seluruh font telah siap agar metrik teks presisi
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = documentRef.current;
      const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1240);
      const fullHeight = Math.max(element.scrollHeight, element.offsetHeight);

      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution for crisp PDF rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        onclone: (clonedDoc) => configureClonedDocument(clonedDoc),
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Hitung dimensi fisik dalam mm dari ukuran asli elemen sebelum scale (1 px ≈ 0.264583 mm)
      const elementWidthPx = canvas.width / 2.5;
      const elementHeightPx = canvas.height / 2.5;

      const contentWidthMm = elementWidthPx * 0.264583;
      const contentHeightMm = elementHeightPx * 0.264583;

      const marginMm = 8;
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

      setDownloadSuccess('Dokumen PDF resmi (Auto-Fit Seluruh Halaman) berhasil diunduh tanpa terpotong!');
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
    } catch { }
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
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                  Pratinjau Dokumen Rekap Kehadiran
                </h3>
                <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-800 text-[10px] sm:text-[10.5px]">
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
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
          <div className="bg-blue-50 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-800 px-6 py-2.5 flex items-center justify-between text-xs text-blue-800 dark:text-blue-200 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{downloadSuccess}</span>
            </div>
            <button
              onClick={() => setDownloadSuccess(null)}
              className="text-blue-700 dark:text-blue-300 hover:text-blue-950 font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Document Viewer Body (Scrollable paper desk - Auto-Expand Height, Zero Cropping) */}
        <div className="flex-1 overflow-auto bg-slate-100/90 dark:bg-[#080c14] p-4 sm:p-6 lg:p-8 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full flex justify-center items-start min-w-fit h-auto min-h-fit pb-12"
          >
            {/* The Official Document Paper Sheet (Auto Layout - Zero Cropping) */}
            <div
              ref={documentRef}
              id="official-recap-document"
              className="bg-white text-slate-900 w-full max-w-[1240px] min-w-[1020px] p-6 sm:p-8 md:p-10 shadow-2xl border border-slate-200/90 rounded-2xl font-sans relative box-border mx-auto transition-all h-auto min-h-fit overflow-visible"
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

              {/* 3. Tabel Rekapitulasi Kehadiran (Full Frame - Middle Align & Zero Cropping) */}
              <div className="w-full rounded-2xl border border-slate-200/80 shadow-xs backdrop-blur-md bg-white/80 my-4 overflow-visible h-auto">
                <table className="w-full text-left border-collapse table-auto whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#0c2340] text-white text-[10px] sm:text-[10.5px] font-bold tracking-wider uppercase whitespace-nowrap align-middle">
                      <th className="py-3 px-2 text-center w-[3.5%] whitespace-nowrap align-middle leading-normal">No</th>
                      <th className="py-3 px-3 text-left w-[20%] whitespace-nowrap align-middle leading-normal">Nama Pegawai</th>
                      <th className="py-3 px-3 text-left w-[14%] whitespace-nowrap align-middle leading-normal">Departemen</th>
                      <th className="py-3 px-2 text-center w-[9%] whitespace-nowrap align-middle leading-normal">Absen Masuk</th>
                      <th className="py-3 px-2 text-center w-[9%] whitespace-nowrap align-middle leading-normal">Absen Pulang</th>
                      <th className="py-3 px-2 text-center w-[6.5%] whitespace-nowrap align-middle leading-normal">Telat</th>
                      <th className="py-3 px-2 text-center w-[8.5%] whitespace-nowrap align-middle leading-normal">Pulang Cepat</th>
                      <th className="py-3 px-3 text-center w-[12%] whitespace-nowrap align-middle leading-normal">Tidak Absen Pulang</th>
                      <th className="py-3 px-2 text-center w-[8.5%] whitespace-nowrap align-middle leading-normal">Tidak Hadir</th>
                      <th className="py-3 px-2.5 text-center w-[9%] whitespace-nowrap align-middle leading-normal">Predikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 whitespace-nowrap text-[10.5px] sm:text-[11px] align-middle">
                    {recapSummary.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 italic whitespace-nowrap align-middle">
                          Tidak ada catatan kehadiran untuk rentang waktu ini.
                        </td>
                      </tr>
                    ) : (
                      recapSummary.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={item.employee_id || idx}
                            className={`transition-colors hover:bg-blue-50/40 whitespace-nowrap align-middle ${isEven ? 'bg-white/95 backdrop-blur-xs' : 'bg-slate-50/70 backdrop-blur-xs'
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
                            <td className="py-2.5 px-3 text-center whitespace-nowrap align-middle">
                              {item.total_lupa_pulang > 0 ? (
                                <span className="recap-badge inline-flex items-center justify-center px-2.5 py-1 rounded border border-orange-200/80 bg-orange-50 text-orange-700 font-bold text-[10.5px] leading-none whitespace-nowrap align-middle">
                                  {item.total_lupa_pulang} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal whitespace-nowrap leading-normal">0 Kali</span>
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
                              {/* Pill Badge Predikat Minimalis, Simetris & Konsisten (Middle Align) */}
                              <span
                                className={`recap-badge-pill inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold border shadow-2xs leading-none whitespace-nowrap align-middle ${item.predikat === 'Sangat Baik'
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
                        <td className="py-3 px-3 text-center text-orange-700 whitespace-nowrap align-middle leading-normal">{totalLupaPulangAll} Kali</td>
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

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
