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

interface RecapItem {
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

interface InstitutionInfo {
  govName: string;
  foundationName: string;
  schoolName: string;
  address: string;
  contact: string;
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

  // Paper Size & Orientation state
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');

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
        windowWidth: orientation === 'landscape' ? 1400 : 1100,
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
        windowWidth: orientation === 'landscape' ? 1400 : 1100,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-200/90 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
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
                  Pratinjau Cetak & Ekspor Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Periksa tata letak dan kesesuaian dokumen resmi sebelum mengunduh dalam format PDF atau PNG.
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
                    <span>Simpan dalam PDF</span>
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
                    <span>Simpan dalam PNG High Quality</span>
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
                  onClick={() => setOrientation('portrait')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    orientation === 'portrait'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Portrait (Tegak)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    orientation === 'landscape'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Landscape (Mendatar)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-mono bg-slate-200/70 dark:bg-slate-700/70 px-2 py-0.5 rounded-md font-semibold text-slate-700 dark:text-slate-200">
              {paperSize === 'A4'
                ? orientation === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'
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
        <div className="flex-1 overflow-auto bg-slate-100/90 dark:bg-[#080c14] p-6 sm:p-10 flex justify-center">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full flex justify-center"
          >
            {/* The Official Document Paper Sheet */}
            <div
              ref={documentRef}
              id="official-recap-document"
              className={`bg-white text-slate-900 w-full p-8 sm:p-10 shadow-2xl border border-slate-300 rounded-none font-sans relative ${
                orientation === 'landscape'
                  ? paperSize === 'A3'
                    ? 'max-w-[1350px]'
                    : 'max-w-[1150px]'
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
              {/* Document Reference Header */}
              <div className="flex items-center justify-between text-[8.5px] font-mono text-slate-400 border-b border-slate-200 pb-2 mb-4 tracking-wider">
                <div>NO. REG: IMBS/LPR-PRES/{cleanPeriodForFilename.toUpperCase()}</div>
                <div>KLASIFIKASI: DOKUMEN RESMI KEDINASAN • SIM-PRESENSI</div>
              </div>

              {/* 1. Official Kop Surat (Header) */}
              <div className="flex items-center justify-between gap-4 mb-3">
                {/* Left Logo: Lembaga / Sekolah */}
                <div className="w-24 sm:w-28 flex items-center justify-center shrink-0">
                  <img
                    src={institution.logoInstitution || "/logo-imbs-left.png"}
                    alt="Logo Lembaga"
                    className="max-h-[75px] w-auto object-contain"
                  />
                </div>

                {/* Center Institution Text */}
                <div className="flex-1 text-center px-1">
                  <div className="text-[10.5px] font-bold text-slate-600 tracking-[0.2em] uppercase leading-tight">
                    {institution.govName}
                  </div>
                  <div className="text-[15px] sm:text-[17px] font-black text-slate-800 tracking-wider uppercase leading-snug mt-0.5">
                    {institution.foundationName}
                  </div>
                  <div className="text-[18px] sm:text-[21px] font-black text-[#0f2942] tracking-tight uppercase leading-snug mt-0.5">
                    {institution.schoolName}
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-600 font-medium leading-tight mt-1">
                    {institution.address}
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-700 font-semibold leading-tight mt-0.5">
                    {institution.contact}
                  </div>
                </div>

                {/* Right Logo: Yayasan */}
                <div className="w-24 sm:w-28 flex items-center justify-center shrink-0">
                  <img
                    src={institution.logoFoundation || "/logo-imbs-right.png"}
                    alt="Logo Yayasan"
                    className="max-h-[75px] w-auto object-contain"
                  />
                </div>
              </div>

              {/* Official Kop Divider: Multi-tone Official Rules */}
              <div className="border-t-[3px] border-[#0f2942] mt-3 mb-[2px]"></div>
              <div className="border-t-[1.5px] border-emerald-600 mb-5"></div>

              {/* 2. Executive Title Banner */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0f2942] via-[#1a4168] to-[#0f2942] text-white py-3.5 px-6 text-center shadow-xs mb-4 border border-[#0f2942]">
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400" />
                <h2 className="font-black text-sm sm:text-base uppercase tracking-[0.14em] text-white leading-tight">
                  Laporan Rekapitulasi Kehadiran Dewan Guru & Pegawai
                </h2>
                <p className="text-[10px] sm:text-[10.5px] text-emerald-300/90 font-medium tracking-wide mt-1">
                  Sistem Informasi Presensi Digital Terverifikasi Geofencing GPS & Waktu Indonesia Barat (WIB)
                </p>
              </div>

              {/* 3. Executive Metadata Ribbon */}
              <div className="grid grid-cols-4 gap-2.5 mb-5">
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 text-center">
                  <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Periode Evaluasi
                  </div>
                  <div className="text-[11px] font-black text-slate-900 mt-0.5 tracking-tight">
                    {periodFormatted}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-2.5 text-center">
                  <div className="text-[8.5px] font-bold text-emerald-700 uppercase tracking-wider">
                    Bulan Pelaporan
                  </div>
                  <div className="text-[12px] font-black text-emerald-950 mt-0.5 tracking-widest uppercase">
                    {monthName}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 text-center">
                  <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Personel
                  </div>
                  <div className="text-[11px] font-black text-slate-900 mt-0.5">
                    {recapSummary.length} <span className="text-[9px] font-medium text-slate-500">Pegawai</span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/70 p-2.5 text-center">
                  <div className="text-[8.5px] font-bold text-indigo-700 uppercase tracking-wider">
                    Ketepatan Waktu
                  </div>
                  <div className="text-[11px] font-black text-indigo-950 mt-0.5">
                    {stats?.persentaseKehadiranTepat ?? 100}% <span className="text-[9px] font-medium text-indigo-600">Presisi</span>
                  </div>
                </div>
              </div>

              {/* 4. Modern Executive Table */}
              <div className="overflow-x-auto mb-6 rounded-xl border border-slate-300 shadow-2xs">
                <table className="w-full border-collapse text-[10px] leading-tight">
                  <thead>
                    {/* Header Row 1 */}
                    <tr className="bg-[#0f2942] text-white font-extrabold uppercase tracking-wider text-[9.5px]">
                      <th
                        rowSpan={2}
                        className="py-2.5 px-1.5 text-center w-8 border-r border-[#1a4168]"
                      >
                        No
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 text-left w-52 border-r border-[#1a4168]"
                      >
                        Nama Pegawai
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-2.5 text-left w-36 border-r border-[#1a4168]"
                      >
                        Departemen
                      </th>
                      <th
                        colSpan={6}
                        className="py-2 px-2 text-center tracking-widest border-b border-[#1a4168]"
                      >
                        Keterangan Kehadiran (Hari Kerja)
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-2 text-center w-24 border-l border-[#1a4168]"
                      >
                        Predikat
                      </th>
                    </tr>

                    {/* Subheaders under Keterangan */}
                    <tr className="bg-[#163a5f] text-white/95 font-bold text-[9px] text-center">
                      <th className="py-2 px-1 border-r border-[#204c77] w-16">
                        Absen Masuk
                      </th>
                      <th className="py-2 px-1 border-r border-[#204c77] w-16">
                        Absen Pulang
                      </th>
                      <th className="py-2 px-1 border-r border-[#204c77] w-12">
                        Telat
                      </th>
                      <th className="py-2 px-1 border-r border-[#204c77] w-18">
                        Pulang Cepat
                      </th>
                      <th className="py-2 px-1 border-r border-[#204c77] w-18">
                        Lupa Pulang
                      </th>
                      <th className="py-2 px-1 w-16">
                        Tidak Hadir
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {recapSummary.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="text-center py-8 text-slate-400 italic bg-white"
                        >
                          Tidak ada catatan kehadiran pada rentang evaluasi ini.
                        </td>
                      </tr>
                    ) : (
                      recapSummary.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={item.employee_id || idx}
                            className={isEven ? 'bg-white' : 'bg-slate-50/80'}
                          >
                            <td className="py-2 px-1 text-center font-medium text-slate-500 border-r border-slate-200">
                              {item.no}
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-200">
                              <div className="font-bold text-slate-900 leading-tight">
                                {item.name}
                              </div>
                              {item.nip && (
                                <div className="text-[8.5px] font-mono text-slate-400 mt-0.5">
                                  {item.nip}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-slate-700 font-medium border-r border-slate-200">
                              <div>{item.department_name}</div>
                              {item.position && (
                                <div className="text-[8.5px] text-slate-400 mt-0.5">
                                  {item.position}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-1 text-center font-semibold text-slate-800 border-r border-slate-200">
                              {item.total_masuk} Kali
                            </td>
                            <td className="py-2 px-1 text-center font-semibold text-slate-800 border-r border-slate-200">
                              {item.total_pulang} Kali
                            </td>
                            <td className={`py-2 px-1 text-center border-r border-slate-200 font-semibold ${
                              item.total_telat > 0 ? 'text-amber-700 font-bold bg-amber-50/50' : 'text-slate-400 font-normal'
                            }`}>
                              {item.total_telat} Kali
                            </td>
                            <td className={`py-2 px-1 text-center border-r border-slate-200 font-semibold ${
                              item.total_pulang_cepat > 0 ? 'text-amber-700 font-bold bg-amber-50/50' : 'text-slate-400 font-normal'
                            }`}>
                              {item.total_pulang_cepat} Kali
                            </td>
                            <td className={`py-2 px-1 text-center border-r border-slate-200 font-semibold ${
                              item.total_lupa_pulang > 0 ? 'text-amber-700 font-bold bg-amber-50/50' : 'text-slate-400 font-normal'
                            }`}>
                              {item.total_lupa_pulang} Kali
                            </td>
                            <td className={`py-2 px-1 text-center border-r border-slate-200 font-semibold ${
                              item.total_tidak_hadir > 0 ? 'text-rose-700 font-bold bg-rose-50/60' : 'text-slate-400 font-normal'
                            }`}>
                              {item.total_tidak_hadir} Kali
                            </td>
                            <td className="py-2 px-2 text-center font-bold">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                  item.predikat === 'Sangat Baik'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : item.predikat === 'Baik'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : item.predikat === 'Kurang Baik'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
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

                  {/* Summary Totals Row */}
                  {recapSummary.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300 text-[9.5px]">
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider font-extrabold text-[#0f2942] border-r border-slate-300">
                          Total Akumulasi Keseluruhan
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 border-r border-slate-300">
                          {totalMasukAll} Kali
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 border-r border-slate-300">
                          {totalPulangAll} Kali
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 border-r border-slate-300">
                          {totalTelatAll} Kali
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 border-r border-slate-300">
                          {totalPulangCepatAll} Kali
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 border-r border-slate-300">
                          {totalLupaPulangAll} Kali
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 border-r border-slate-300">
                          {totalTidakHadirAll} Kali
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500 font-semibold text-[8.5px]">
                          Terverifikasi
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* 5. Signatures & Digital Verification Section */}
              <div className="grid grid-cols-3 items-end mt-8 pt-4 px-2 text-[10.5px] text-slate-900">
                {/* Left Signature: Kepala Sekolah */}
                <div className="text-left w-full pr-4">
                  <div className="text-slate-600">Mengetahui,</div>
                  <div className="font-bold text-slate-900 text-xs mt-0.5">Kepala Sekolah</div>
                  <div className="h-16 sm:h-20 flex items-end">
                    <div className="w-24 border-b border-dashed border-slate-300 pb-1 text-[8.5px] text-slate-400 italic">
                      Tanda Tangan & Cap
                    </div>
                  </div>
                  <div className="font-extrabold underline tracking-wide text-slate-950 mt-1">
                    {institution.headmaster || 'Fauzan Azhiimaa, Lc'}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    NIP. —
                  </div>
                </div>

                {/* Center: Digital Verification Badge with SVG QR */}
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs inline-flex flex-col items-center">
                    <svg
                      className="w-16 h-16 text-[#0f2942]"
                      viewBox="0 0 100 100"
                      fill="currentColor"
                    >
                      {/* Stylized QR Code SVG */}
                      <rect x="10" y="10" width="24" height="24" rx="3" fill="#0f2942" />
                      <rect x="15" y="15" width="14" height="14" rx="2" fill="white" />
                      <rect x="18" y="18" width="8" height="8" rx="1" fill="#059669" />

                      <rect x="66" y="10" width="24" height="24" rx="3" fill="#0f2942" />
                      <rect x="71" y="15" width="14" height="14" rx="2" fill="white" />
                      <rect x="74" y="18" width="8" height="8" rx="1" fill="#059669" />

                      <rect x="10" y="66" width="24" height="24" rx="3" fill="#0f2942" />
                      <rect x="15" y="71" width="14" height="14" rx="2" fill="white" />
                      <rect x="18" y="74" width="8" height="8" rx="1" fill="#059669" />

                      <rect x="42" y="12" width="6" height="6" fill="#0f2942" />
                      <rect x="52" y="18" width="6" height="6" fill="#0f2942" />
                      <rect x="42" y="28" width="8" height="8" rx="2" fill="#059669" />
                      <rect x="12" y="44" width="6" height="6" fill="#0f2942" />
                      <rect x="24" y="48" width="8" height="6" fill="#0f2942" />
                      <rect x="40" y="42" width="20" height="20" rx="4" fill="#0f2942" />
                      <circle cx="50" cy="52" r="4" fill="white" />
                      <rect x="68" y="44" width="8" height="8" fill="#0f2942" />
                      <rect x="80" y="52" width="8" height="6" fill="#0f2942" />
                      <rect x="42" y="70" width="6" height="10" fill="#0f2942" />
                      <rect x="54" y="76" width="10" height="6" fill="#0f2942" />
                      <rect x="72" y="72" width="16" height="16" rx="2" fill="#0f2942" />
                    </svg>
                    <div className="text-[7.5px] font-bold text-slate-700 tracking-wider uppercase mt-1">
                      Dokumen Sah Digital
                    </div>
                    <div className="text-[7px] text-slate-400 font-mono">
                      SIM-PRESENSI IMBS
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-400 mt-1 max-w-[170px] leading-tight">
                    Diverifikasi otomatis berbasis integritas database & GPS
                  </div>
                </div>

                {/* Right Signature: Tata Usaha */}
                <div className="text-right w-full pl-4">
                  <div className="text-slate-600">{`Bogor, ${formattedEndDate}`}</div>
                  <div className="font-bold text-slate-900 text-xs mt-0.5">Tata Usaha</div>
                  <div className="h-16 sm:h-20 flex items-end justify-end">
                    <div className="w-24 border-b border-dashed border-slate-300 pb-1 text-[8.5px] text-slate-400 italic text-center">
                      Tanda Tangan & Cap
                    </div>
                  </div>
                  <div className="font-extrabold underline tracking-wide text-slate-950 uppercase mt-1">
                    {institution.tuStaff || 'ALDRI WAHYUDI CHANDRA'}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    NIP. —
                  </div>
                </div>
              </div>

              {/* Bottom Security Notice */}
              <div className="mt-8 pt-3 border-t border-slate-200 text-[8.5px] text-slate-400 flex items-center justify-between">
                <span>SIM-Presensi Imam Muzani Boarding School • Dokumen ini sah dan diterbitkan resmi oleh sistem.</span>
                <span className="font-mono">Hal. 1 dari 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
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
