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
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  periodFormatted,
  monthName,
  formattedEndDate,
  institution,
  recapSummary,
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
                  Mode Preview Resmi
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
              className={`bg-white text-slate-900 w-full p-8 sm:p-10 shadow-2xl border border-slate-300 rounded-none font-sans ${
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
              {/* 1. Official Kop Surat (Header) */}
              <div className="flex items-center justify-between gap-3 mb-2">
                {/* Left Logo: Lembaga / Sekolah */}
                <div className="w-24 sm:w-28 flex items-center justify-center shrink-0">
                  <img
                    src={institution.logoInstitution || "/logo-imbs-left.png"}
                    alt="Logo Lembaga"
                    className="max-h-[70px] w-auto object-contain"
                  />
                </div>

                {/* Center Institution Text */}
                <div className="flex-1 text-center px-1">
                  <div className="text-[11px] font-bold text-slate-800 tracking-wider uppercase leading-tight">
                    {institution.govName}
                  </div>
                  <div className="text-[15px] sm:text-[17px] font-black text-slate-900 tracking-wide uppercase leading-snug mt-0.5">
                    {institution.foundationName}
                  </div>
                  <div className="text-[17px] sm:text-[19px] font-black text-slate-950 tracking-tight uppercase leading-snug mt-0.5">
                    {institution.schoolName}
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-700 font-medium leading-tight mt-1">
                    {institution.address}
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-800 font-bold leading-tight mt-0.5">
                    {institution.contact}
                  </div>
                </div>

                {/* Right Logo: Yayasan */}
                <div className="w-24 sm:w-28 flex items-center justify-center shrink-0">
                  <img
                    src={institution.logoFoundation || "/logo-imbs-right.png"}
                    alt="Logo Yayasan"
                    className="max-h-[70px] w-auto object-contain"
                  />
                </div>
              </div>

              {/* Official Kop Double Divider */}
              <div className="border-t-[3px] border-slate-900 mt-2 mb-[2px]"></div>
              <div className="border-t-[1px] border-slate-900 mb-4"></div>

              {/* 2. Title Banner */}
              <div className="bg-[#8c949c] text-white py-1.5 px-4 text-center font-bold text-xs sm:text-[13px] uppercase tracking-wider mb-4 shadow-2xs">
                REKAP KEHADIRAN DEWAN GURU DAN PEGAWAI
              </div>

              {/* 3. Badges: Periode & Bulan */}
              <div className="flex items-center justify-between mb-4 gap-4">
                {/* Left Badge: PERIODE */}
                <div className="w-52">
                  <div className="bg-[#1b5f8c] text-white text-[10px] font-bold uppercase py-1 px-3 text-center tracking-wider">
                    PERIODE
                  </div>
                  <div className="bg-[#f0f6fa] border border-[#1b5f8c] border-t-0 py-1 px-3 text-center text-[10.5px] font-bold text-slate-800 tracking-tight">
                    {periodFormatted}
                  </div>
                </div>

                {/* Right Badge: BULAN */}
                <div className="w-48">
                  <div className="bg-[#1b5f8c] text-white text-[10px] font-bold uppercase py-1 px-3 text-center tracking-wider">
                    BULAN
                  </div>
                  <div className="bg-[#dcebf6] border border-[#1b5f8c] border-t-0 py-0.5 px-3 text-center text-base sm:text-lg font-black text-slate-800 tracking-widest">
                    {monthName}
                  </div>
                </div>
              </div>

              {/* 4. Official Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse border border-[#8eaec7] text-[10px] leading-tight">
                  <thead>
                    {/* Header Row 1 */}
                    <tr className="bg-[#1b5f8c] text-white font-bold uppercase">
                      <th
                        rowSpan={2}
                        className="border border-[#759bb8] py-2 px-1 text-center w-8 font-bold"
                      >
                        No
                      </th>
                      <th
                        rowSpan={2}
                        className="border border-[#759bb8] py-2 px-2.5 text-left w-52 font-bold"
                      >
                        Nama
                      </th>
                      <th
                        rowSpan={2}
                        className="border border-[#759bb8] py-2 px-2 text-left w-36 font-bold"
                      >
                        Departemen
                      </th>
                      <th
                        colSpan={6}
                        className="border border-[#759bb8] py-1 px-2 text-center tracking-wider font-bold"
                      >
                        KETERANGAN
                      </th>
                      <th
                        rowSpan={2}
                        className="border border-[#759bb8] py-2 px-2 text-center w-24 font-bold"
                      >
                        Predikat
                      </th>
                    </tr>

                    {/* Subheaders under KETERANGAN */}
                    <tr className="bg-[#1b5f8c] text-white font-semibold text-[9px]">
                      <th className="border border-[#759bb8] py-1.5 px-1 text-center w-16">
                        Absen Masuk
                      </th>
                      <th className="border border-[#759bb8] py-1.5 px-1 text-center w-16">
                        Absen Pulang
                      </th>
                      <th className="border border-[#759bb8] py-1.5 px-1 text-center w-12">
                        Telat
                      </th>
                      <th className="border border-[#759bb8] py-1.5 px-1 text-center w-18">
                        Pulang Lebih Awal
                      </th>
                      <th className="border border-[#759bb8] py-1.5 px-1 text-center w-18">
                        Lupa Absen Pulang
                      </th>
                      <th className="border border-[#759bb8] py-1.5 px-1 text-center w-16">
                        Tidak Hadir
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recapSummary.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="text-center py-6 border border-[#cbd5e1] text-slate-400 italic"
                        >
                          Tidak ada data kehadiran pada periode ini
                        </td>
                      </tr>
                    ) : (
                      recapSummary.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={item.employee_id || idx}
                            className={isEven ? 'bg-white' : 'bg-[#eef4f9]'}
                          >
                            <td className="border border-[#cbd5e1] py-1.5 px-1 text-center font-medium text-slate-700">
                              {item.no}
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-2 font-bold text-slate-900">
                              {item.name}
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-2 text-slate-700 font-medium">
                              {item.department_name}
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-1 text-center text-slate-800">
                              {item.total_masuk} Kali
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-1 text-center text-slate-800">
                              {item.total_pulang} Kali
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-1 text-center text-slate-800">
                              {item.total_telat} Kali
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-1 text-center text-slate-800">
                              {item.total_pulang_cepat} Kali
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-1 text-center text-slate-800">
                              {item.total_lupa_pulang} Kali
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-1 text-center text-slate-800">
                              {item.total_tidak_hadir} Kali
                            </td>
                            <td className="border border-[#cbd5e1] py-1.5 px-1.5 text-center font-bold">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] ${
                                  item.predikat === 'Sangat Baik'
                                    ? 'text-emerald-800'
                                    : item.predikat === 'Baik'
                                    ? 'text-blue-800'
                                    : item.predikat === 'Kurang Baik'
                                    ? 'text-amber-800'
                                    : 'text-rose-800'
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
                </table>
              </div>

              {/* 5. Signatures (Tanda Tangan) Section */}
              <div className="flex justify-between items-start mt-8 pt-4 px-6 text-[11px] text-slate-900">
                {/* Left Signature: Kepala Sekolah */}
                <div className="text-left w-56">
                  <div>Mengetahui,</div>
                  <div className="font-semibold mt-0.5">Kepala Sekolah</div>
                  <div className="h-20"></div>
                  <div className="font-bold underline tracking-wide">
                    {institution.headmaster || 'Fauzan Azhiimaa, Lc'}
                  </div>
                </div>

                {/* Right Signature: Tata Usaha */}
                <div className="text-left w-56">
                  <div>{`Bogor, ${formattedEndDate}`}</div>
                  <div className="font-semibold mt-0.5">Tata Usaha</div>
                  <div className="h-20"></div>
                  <div className="font-bold underline tracking-wide uppercase">
                    {institution.tuStaff || 'ALDRI WAHYUDI CHANDRA'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Format baku resmi IMBS Tamansari Bogor. Dihitung secara real-time dari database absensi.</span>
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
