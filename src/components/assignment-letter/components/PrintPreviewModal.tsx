import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  FileDown, 
  UploadCloud, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Layers, 
  Eye, 
  Sparkles, 
  Check, 
  Loader2,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  PaperSize, 
  PAPER_SIZES, 
  LetterData, 
  BastData 
} from '../types';
import SuratPenyerahan from './SuratPenyerahan';
import BastSheet from './BastSheet';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { formatDateID, formatCleanAddress, formatDateDDMMYYYY, formatDueDate } from '../utils/dateFormatter';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: 'surat_tugas' | 'bast';
  letterData?: LetterData;
  bastData?: BastData;
  paperSize: PaperSize;
  onPaperSizeChange: (size: PaperSize) => void;
  onOpenDriveModal?: () => void;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  docType,
  letterData,
  bastData,
  paperSize,
  onPaperSizeChange,
  onOpenDriveModal,
}: PrintPreviewModalProps) {
  const [zoom, setZoom] = useState<number>(0.85);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);
  const [showGuidelines, setShowGuidelines] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [activePageIndex, setActivePageIndex] = useState<number>(0); // 0 = all, 1 = page 1, 2 = page 2
  const [bastPageMode, setBastPageMode] = useState<'both' | 'penyerahan' | 'bast'>('both');

  const containerRef = useRef<HTMLDivElement>(null);
  const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.f4;

  // Manage body class for print styling
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-preview-modal-open');
    } else {
      document.body.classList.remove('print-preview-modal-open');
    }
    return () => {
      document.body.classList.remove('print-preview-modal-open');
    };
  }, [isOpen]);

  // Auto-calculate optimal zoom to fit preview on open or resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth - 80;
      const paperPxWidth = (activePaper.widthMm * 96) / 25.4;
      const optimalZoom = Math.min(1.15, Math.max(0.4, containerWidth / paperPxWidth));
      setZoom(+optimalZoom.toFixed(2));
    };

    const timer = setTimeout(handleResize, 80);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, activePaper.widthMm]);

  // Keyboard shortcut listener (Ctrl+P to print, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleDirectPrint();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, paperSize]);

  if (!isOpen) return null;

  // Handle native browser print with custom @page size
  const handleDirectPrint = () => {
    // Inject dynamic @page style for selected paper size
    const existingStyle = document.getElementById('dynamic-print-paper-size');
    if (existingStyle) existingStyle.remove();

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-paper-size';
    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${activePaper.widthMm}mm ${activePaper.heightMm}mm;
          margin: 0;
        }
      }
    `;
    document.head.appendChild(styleEl);

    const originalTitle = document.title;
    if (docType === 'surat_tugas' && letterData) {
      document.title = `Surat_Tugas_${(letterData.customerName || 'Penagihan').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    } else if (bastData) {
      document.title = `BAST_${(bastData.debiturNama || 'Debitur').replace(/[^a-zA-Z0-9_-]/g, '_')}_${bastData.jenis.toUpperCase()}`;
    }

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
      const s = document.getElementById('dynamic-print-paper-size');
      if (s) s.remove();
    }, 1000);
  };

  // Generate & Save PDF with exact paper size
  const handleSavePdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [activePaper.widthMm, activePaper.heightMm],
        compress: true,
      });

      if (docType === 'surat_tugas') {
        const page1 = document.getElementById('preview-modal-letter-page-1');
        if (!page1) throw new Error('Halaman surat tugas tidak ditemukan');

        const img1 = await toJpeg(page1, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });

        pdf.addImage(img1, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');

        const page2 = document.getElementById('preview-modal-letter-page-2');
        if (page2 && letterData?.attachments && letterData.attachments.length > 0) {
          pdf.addPage([activePaper.widthMm, activePaper.heightMm], 'portrait');
          const img2 = await toJpeg(page2, {
            quality: 0.95,
            backgroundColor: '#ffffff',
            pixelRatio: 2,
          });
          pdf.addImage(img2, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');
        }

        const safeName = (letterData?.customerName || 'Penagihan').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        pdf.save(`Surat_Tugas_${safeName}_${paperSize.toUpperCase()}.pdf`);
      } else {
        // BAST Document
        const pagesToRender: string[] = [];
        if (bastPageMode === 'both' || bastPageMode === 'penyerahan') {
          pagesToRender.push('preview-modal-penyerahan-doc');
        }
        if (bastPageMode === 'both' || bastPageMode === 'bast') {
          pagesToRender.push('preview-modal-bast-sheet-doc');
        }

        for (let i = 0; i < pagesToRender.length; i++) {
          const el = document.getElementById(pagesToRender[i]);
          if (!el) continue;

          if (i > 0) {
            pdf.addPage([activePaper.widthMm, activePaper.heightMm], 'portrait');
          }

          const imgData = await toJpeg(el, {
            quality: 0.95,
            backgroundColor: '#ffffff',
            pixelRatio: 2,
          });

          pdf.addImage(imgData, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');
        }

        const safeName = (bastData?.debiturNama || 'Debitur').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        pdf.save(`BAST_Penyerahan_${safeName}_${bastData?.jenis.toUpperCase() || 'UNIT'}_${paperSize.toUpperCase()}.pdf`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengunduh PDF: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const hasAttachments = Boolean(letterData?.attachments && letterData.attachments.length > 0);

  return (
    <div className="print-preview-modal-root fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 text-white shrink-0 shadow-lg print:hidden">
        {/* Left: Title & Document Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-[#5A5A40] rounded-lg text-white shadow-xs">
            <Printer size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">
                Pratinjau Cetak ({docType === 'surat_tugas' ? 'Surat Tugas' : 'BAST Kendaraan'})
              </h2>
              <span className="hidden md:inline-block px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-semibold border border-slate-700">
                {activePaper.shortName} • {activePaper.widthMm} × {activePaper.heightMm} mm
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              Periksa tata letak, margin, dan ukuran kertas sebelum mencetak atau menyimpan PDF
            </p>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Paper Size Dropdown in Header */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 p-1 rounded-lg">
            <span className="text-[11px] font-medium text-slate-400 pl-1.5 hidden sm:inline">Kertas:</span>
            <select
              value={paperSize}
              onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
              className="bg-slate-900 text-amber-300 text-xs font-bold rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] cursor-pointer"
            >
              {(Object.keys(PAPER_SIZES) as PaperSize[]).map((key) => (
                <option key={key} value={key}>
                  {PAPER_SIZES[key].name} ({PAPER_SIZES[key].widthMm}×{PAPER_SIZES[key].heightMm}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Direct Print Button */}
          <button
            type="button"
            id="btn-modal-print-direct"
            onClick={handleDirectPrint}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            title="Cetak Langsung via Printer (Ctrl+P)"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Cetak Dokumen</span>
            <span className="sm:hidden">Cetak</span>
          </button>

          {/* Save PDF Button */}
          <button
            type="button"
            id="btn-modal-save-pdf"
            onClick={handleSavePdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#5A5A40] hover:bg-[#6e6e50] text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isGeneratingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            <span className="hidden sm:inline">Simpan PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {/* GDrive Button */}
          {onOpenDriveModal && (
            <button
              type="button"
              id="btn-modal-gdrive"
              onClick={() => {
                onClose();
                onOpenDriveModal();
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Simpan ke Google Drive"
            >
              <UploadCloud size={14} />
              <span>Drive</span>
            </button>
          )}

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Tutup Pratinjau Cetak (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Secondary Controls Bar (Zoom, Paper Dimensions, Page Filter, Guidelines) */}
      <div className="bg-slate-800/95 border-b border-slate-700/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 shrink-0 print:hidden">
        {/* Left: Paper Sizes Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden md:inline">Ukuran Kertas:</span>
          {(Object.keys(PAPER_SIZES) as PaperSize[]).map((key) => {
            const cfg = PAPER_SIZES[key];
            const isSelected = paperSize === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPaperSizeChange(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#5A5A40] text-white shadow-xs border border-[#7a7a58]'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white border border-transparent'
                }`}
                title={cfg.description}
              >
                {isSelected && <Check size={11} />}
                <span>{cfg.shortName}</span>
                <span className="text-[10px] opacity-70 hidden sm:inline">({cfg.widthMm}×{cfg.heightMm}mm)</span>
              </button>
            );
          })}
        </div>

        {/* Right: View Modes, Zoom, Guidelines, Grayscale */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* BAST Page Filter Mode */}
          {docType === 'bast' && (
            <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setBastPageMode('both')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  bastPageMode === 'both' ? 'bg-[#5A5A40] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua Halaman
              </button>
              <button
                type="button"
                onClick={() => setBastPageMode('penyerahan')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  bastPageMode === 'penyerahan' ? 'bg-[#5A5A40] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Surat Penyerahan
              </button>
              <button
                type="button"
                onClick={() => setBastPageMode('bast')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  bastPageMode === 'bast' ? 'bg-[#5A5A40] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lembar BAST
              </button>
            </div>
          )}

          {/* Surat Tugas Page Filter Mode */}
          {docType === 'surat_tugas' && hasAttachments && (
            <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setActivePageIndex(0)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  activePageIndex === 0 ? 'bg-[#5A5A40] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua (2 Hal)
              </button>
              <button
                type="button"
                onClick={() => setActivePageIndex(1)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  activePageIndex === 1 ? 'bg-[#5A5A40] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hal 1 (Surat)
              </button>
              <button
                type="button"
                onClick={() => setActivePageIndex(2)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  activePageIndex === 2 ? 'bg-[#5A5A40] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hal 2 (Lampiran)
              </button>
            </div>
          )}

          {/* Margins & Guidelines Toggle */}
          <button
            type="button"
            onClick={() => setShowGuidelines((prev) => !prev)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer border ${
              showGuidelines
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 border-slate-700'
            }`}
            title="Tampilkan garis bantu batas margin cetak (safe print area)"
          >
            <SlidersHorizontal size={12} />
            <span>Garis Margin</span>
          </button>

          {/* Grayscale Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsGrayscale((prev) => !prev)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer border ${
              isGrayscale
                ? 'bg-slate-600 text-white border-slate-500'
                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 border-slate-700'
            }`}
            title="Simulasi hasil cetak printer Hitam Putih (B&W)"
          >
            <Eye size={12} />
            <span>{isGrayscale ? 'Mode: B&W' : 'Mode: Warna'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut size={13} />
            </button>
            <span className="w-11 text-center text-[11px] font-bold text-amber-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!containerRef.current) return;
                const containerWidth = containerRef.current.clientWidth - 80;
                const paperPxWidth = (activePaper.widthMm * 96) / 25.4;
                setZoom(+Math.min(1.15, Math.max(0.4, containerWidth / paperPxWidth)).toFixed(2));
              }}
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
              title="Sesuaikan dengan lebar layar"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.0)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                zoom === 1.0 ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Ukuran 100% (Skala Asli)"
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Stage */}
      <div 
        ref={containerRef}
        id="print-modal-canvas"
        className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start custom-scrollbar bg-slate-950/80"
      >
        <div
          id="print-zoom-wrapper"
          className={`flex flex-col items-center gap-10 transition-transform duration-150 origin-top ${
            isGrayscale ? 'filter grayscale contrast-105' : ''
          }`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          {/* ================= SURAT TUGAS PREVIEW ================= */}
          {docType === 'surat_tugas' && letterData && (
            <>
              {/* Page 1: Surat Tugas */}
              {(activePageIndex === 0 || activePageIndex === 1) && (
                <div className="relative group">
                  {/* Paper Header / Tag */}
                  <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-[11px] text-slate-400 font-sans font-medium px-1 print:hidden">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <FileText size={13} className="text-amber-400" /> Halaman 1: Dokumen Surat Tugas
                    </span>
                    <span>
                      {activePaper.name} ({activePaper.widthMm} × {activePaper.heightMm} mm)
                    </span>
                  </div>

                  {/* Document Sheet */}
                  <div
                    id="preview-modal-letter-page-1"
                    style={{
                      width: `${activePaper.widthMm}mm`,
                      minHeight: `${activePaper.heightMm}mm`,
                      paddingTop: '10mm',
                      paddingLeft: '18mm',
                      paddingRight: '18mm',
                      paddingBottom: '10mm',
                    }}
                    className={`relative bg-white shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-slate-300 font-serif text-[9pt] leading-[1.24] box-border text-black print-document-sheet ${
                      hasAttachments && activePageIndex === 0 ? 'print-page-break' : 'print-page-last'
                    } ${
                      showGuidelines ? 'outline outline-1 outline-dashed outline-rose-400' : ''
                    }`}
                  >
                    {/* Visual Guidelines Overlay (if active) */}
                    {showGuidelines && (
                      <div className="absolute inset-0 pointer-events-none border border-emerald-500/30 m-[10mm_18mm_10mm_18mm] flex flex-col justify-between print:hidden">
                        <div className="text-[9px] font-sans font-bold text-emerald-600 bg-emerald-50/80 px-1 py-0.5 self-start">
                          Margin Atas: 10mm | Kiri/Kanan: 18mm
                        </div>
                        <div className="text-[9px] font-sans font-bold text-emerald-600 bg-emerald-50/80 px-1 py-0.5 self-end">
                          Margin Bawah: 10mm
                        </div>
                      </div>
                    )}

                    {/* Kop Surat */}
                    <div style={{ position: 'relative', left: `${letterData.kopImageOffsetX || 0}px`, top: `${letterData.kopImageOffsetY}px`, marginBottom: `${letterData.kopImageMarginBottom}px` }}>
                      {letterData.kopImage ? (
                        <img
                          src={letterData.kopImage}
                          alt="Kop Surat"
                          style={{
                            width: '100%',
                            height: `${letterData.kopImageHeight}px`,
                            objectFit: letterData.kopImageFit,
                            objectPosition: letterData.kopImageAlign,
                          }}
                        />
                      ) : (
                        <div className="border-[2px] border-dashed border-[#D1D1CA] bg-[#F5F5F0] p-6 text-center text-[#8A8A7A] text-[10pt] font-sans rounded-xl">
                          [ Area Kop Surat ]
                        </div>
                      )}
                    </div>

                    {/* Title Section */}
                    <div className="text-center mb-1.5">
                      <h2 className="font-bold underline text-[11pt] tracking-wider uppercase">Surat Tugas</h2>
                      <p className="font-bold text-[8.5pt] font-mono tracking-wide mt-0.5 bg-slate-100/70 inline-block px-2 py-0.5 border border-slate-300 rounded">
                        Nomor: {letterData.letterNumber}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="space-y-0 text-justify letter-content text-[9pt] leading-[1.24]">
                      <p>Yang bertanda tangan di bawah ini, mewakili Manajemen <strong>{letterData.kopCompanyName}</strong>:</p>

                      <div className="pl-6 space-y-0.5 my-1.5">
                        <div className="grid grid-cols-[100px_10px_1fr]">
                          <div className="font-bold">Nama</div><div>:</div><div className="font-bold uppercase">{letterData.assignerName}</div>
                        </div>
                        <div className="grid grid-cols-[100px_10px_1fr]">
                          <div className="font-bold">Jabatan</div><div>:</div><div className="font-bold uppercase">{letterData.assignerPosition}</div>
                        </div>
                      </div>

                      <p>Dengan ini memberikan tugas penuh, wewenang, dan tanggung jawab penagihan di lapangan kepada :</p>

                      <div className="my-1.5 pl-6">
                        <table className="w-full text-left font-bold mb-1 text-[9pt]">
                          <thead>
                            <tr>
                              <th className="pb-1 w-[50%]">Nama</th>
                              <th className="pb-1 w-[50%]">Jabatan</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="uppercase">{letterData.assigneeName || '....................................'}</td>
                              <td>{letterData.assigneePosition}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {letterData.penagihanType === 'perorangan' ? (
                        <>
                          <p>
                            Untuk melakukan konfirmasi, penagihan, mediasi, dan negosiasi penyelesaian kewajiban pembayaran hutang/tagihan atas nama Debitur dari Pemberi Kuasa Perorangan: <strong>{letterData.clientName || '....................................'}</strong>
                            {letterData.krediturPeroranganNik ? ` (NIK: ${letterData.krediturPeroranganNik})` : ''}
                            {letterData.dasarPenagihan ? ` berdasarkan ${letterData.dasarPenagihan}` : ''} yang penagihannya dikuasakan kepada <strong>{letterData.kopCompanyName}</strong>.
                          </p>

                          <p className="mt-1.5 font-bold">Berikut rincian data debitur & besaran tagihan :</p>

                          <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>No. Perjanjian / Bukti</div><div>:</div><div className="font-mono">{letterData.customerContract || '-'}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Nama Debitur</div><div>:</div><div className="uppercase font-bold">{letterData.customerName}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Alamat</div><div>:</div><div className="uppercase">{formatCleanAddress(letterData.customerAddress)}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Tanggal Jatuh Tempo</div><div>:</div><div className="font-bold">{formatDueDate(letterData.customerDueDate)}</div>
                            </div>
                            {letterData.besaranPokok && (
                              <div className="grid grid-cols-[180px_10px_1fr]">
                                <div>Hutang Pokok</div><div>:</div><div>{letterData.besaranPokok}</div>
                              </div>
                            )}
                            {letterData.besaranBungaDenda && (
                              <div className="grid grid-cols-[180px_10px_1fr]">
                                <div>Bunga / Denda / Biaya</div><div>:</div><div>{letterData.besaranBungaDenda}</div>
                              </div>
                            )}
                            {letterData.totalTagihan && (
                              <div className="grid grid-cols-[180px_10px_1fr]">
                                <div className="font-bold">Total Kewajiban Tagihan</div>
                                <div className="font-bold">:</div>
                                <div className="font-bold text-[9.5pt]">{letterData.totalTagihan}</div>
                              </div>
                            )}
                            {letterData.terbilangTagihan && (
                              <div className="grid grid-cols-[180px_10px_1fr]">
                                <div className="italic text-slate-600 text-[8.5pt]">Terbilang</div>
                                <div>:</div>
                                <div className="italic font-medium text-[8.5pt]"># {letterData.terbilangTagihan} #</div>
                              </div>
                            )}
                          </div>

                          {/* Kronologi Singkat / Duduk Perkara (Khusus Perorangan) */}
                          {letterData.kronologi && letterData.kronologi.trim() && (
                            <div className="pl-6 mb-2 text-[9pt]">
                              <div className="border-l-2 border-[#5A5A40] pl-2.5 py-1 bg-slate-50/70 rounded-r">
                                <div className="font-bold text-[8.5pt] uppercase tracking-wide text-slate-800 mb-0.5">
                                  Kronologi & Duduk Perkara :
                                </div>
                                <p className="text-[8.5pt] leading-normal text-justify whitespace-pre-line text-slate-900">
                                  {letterData.kronologi}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Spesifikasi Objek / Kendaraan jika ada */}
                          {(letterData.vehicleBrand || letterData.vehiclePlate) && (
                            <>
                              <p>Adapun jaminan / spesifikasi objek sebagai berikut :</p>
                              <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                                <div className="grid grid-cols-[180px_10px_1fr]">
                                  <div>Merk/Type</div><div>:</div><div className="uppercase">{letterData.vehicleBrand}</div>
                                </div>
                                <div className="grid grid-cols-[180px_10px_1fr]">
                                  <div>Nomor Polisi</div><div>:</div><div className="uppercase font-bold">{letterData.vehiclePlate || 'R-1234-XX'}</div>
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        /* FORMAT LAMA PENAGIHAN LEMBAGA */
                        <>
                          <p>
                            Untuk melakukan konfirmasi, penagihan, dan negosiasi penyelesaian kewajiban pembayaran atas nama Debitur/Nasabah dari <strong>{letterData.clientName}</strong> yang penagihannya dikuasakan kepada <strong>{letterData.kopCompanyName}</strong>.
                          </p>

                          <p className="mt-1.5">Berikut data nasabah :</p>

                          <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>No. Kontrak</div><div>:</div><div>{letterData.customerContract}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Nama</div><div>:</div><div className="uppercase">{letterData.customerName}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Alamat</div><div>:</div><div className="uppercase">{formatCleanAddress(letterData.customerAddress)}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Tanggal Jatuh Tempo</div><div>:</div><div className="font-bold">{formatDueDate(letterData.customerDueDate)}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Angsuran</div><div>:</div><div>{letterData.customerInstallment}{letterData.customerTotalInstallment ? ` / ${letterData.customerTotalInstallment}` : ''}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>DENDA</div><div>:</div><div>{letterData.customerPenalty}</div>
                            </div>
                          </div>

                          <p>Adapun spesifikasi kendaraan sebagai berikut :</p>

                          <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Merk/Type</div><div>:</div><div className="uppercase">{letterData.vehicleBrand}</div>
                            </div>
                            <div className="grid grid-cols-[180px_10px_1fr]">
                              <div>Nomor Polisi</div><div>:</div><div className="uppercase font-bold">{letterData.vehiclePlate || 'R-1234-XX'}</div>
                            </div>
                          </div>
                        </>
                      )}

                      <p>Pelaksanaan Surat Tugas ini wajib tunduk dan patuh pada ketentuan sebagai berikut:</p>

                      <div className="space-y-0 text-[9pt] leading-[1.24]">
                        <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt]">MASA BERLAKU SURAT TUGAS</div>
                        <p>
                          Surat Tugas ini berlaku efektif terhitung sejak tanggal {formatDateID(letterData.validFrom)} sampai dengan tanggal {formatDateID(letterData.validTo)}. Apabila masa berlaku telah berakhir, Surat Tugas ini dinyatakan tidak berlaku lagi dan wajib diperpanjang melalui persetujuan Manajemen {letterData.kopCompanyName}.
                        </p>

                        <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt]">WEWENANG DAN TANGGUNG JAWAB PETUGAS</div>
                        <p>Dalam menjalankan tugas penagihan di lapangan, Tim Penagihan berwenang:</p>
                        <ul className="list-disc pl-6 space-y-0.5 text-[8.5pt] leading-[1.2]">
                          <li className="pl-1.5">Mendatangi alamat domisili, kantor, atau lokasi tempat usaha Debitur sesuai data resmi yang tercantum dalam lembar kerja penagihan.</li>
                          <li className="pl-1.5">Melakukan konfirmasi, negosiasi, dan menyampaikan Surat Peringatan (SP) atau tagihan resmi yang diterbitkan oleh Perusahaan/Kreditur/Mitra Perusahaan.</li>
                          <li className="pl-1.5">Untuk keperluan diatas, PENERIMA TUGAS berhak untuk menerima jaminan piutang/jaminan fidusia, menandatangani dokumen - dokumen, meminta tanda tangan, serta melakukan tindakan yang dianggap perlu dalam melaksanakan tugas tersebut/meminta bantuan pihak berwajib jika diperlukan.</li>
                        </ul>

                        <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt]">LARANGAN DAN KEPATUHAN</div>
                        <ul className="list-disc pl-6 space-y-0.5 text-[8.5pt] leading-[1.2]">
                          <li className="pl-1.5">Dilarang menerima pembayaran tunai (cash) secara langsung dari Debitur dalam bentuk apa pun, kecuali menggunakan Virtual Account resmi atau tanda terima sah dari sistem perusahaan.</li>
                          <li className="pl-1.5">Dilarang menggunakan ancaman, kekerasan fisik, intimidasi, penekanan secara psikologis, atau tindakan melawan hukum yang melanggar Kode Etik Penagihan Bank Indonesia (BI), Otoritas Jasa Keuangan (OJK), serta Peraturan Perundang-undangan Republik Indonesia.</li>
                          <li className="pl-1.5">Petugas wajib bersikap sopan, profesional, mengenakan pakaian rapi dan sopan selama berada di lapangan.</li>
                          <li className="pl-1.5">Petugas wajib melaporkan hasil penagihan (Field Report) secara real-time melalui sistem aplikasi penagihan resmi {letterData.kopCompanyName} pada hari yang sama.</li>
                        </ul>

                        <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt]">SANKSI DAN TANGGUNG JAWAB HUKUM</div>
                        <ul className="list-disc pl-6 space-y-0.5 text-[8.5pt] leading-[1.2]">
                          <li className="pl-1.5">Setiap pelanggaran terhadap kode etik, penyalahgunaan wewenang, penggelapan dana penagihan, atau tindakan penyimpangan yang dilakukan oleh Petugas Penagihan akan dikenakan sanksi tegas berupa Pemutusan Hubungan Kerja (PHK) secara tidak hormat.</li>
                          <li className="pl-1.5">Tindakan pelanggaran hukum yang dilakukan oleh Petugas di luar prosedur resmi Perusahaan menjadi tanggung jawab pribadi petugas bersangkutan secara pidana maupun perdata ({letterData.kopCompanyName} membebaskan diri dari segala tuntutan hukum akibat penyimpangan oknum).</li>
                        </ul>

                        <p className="mt-1.5 pt-0.5">
                          Demikian Surat Tugas ini diterbitkan untuk dipergunakan sebagaimana mestinya dan dilaksanakan dengan penuh rasa tanggung jawab demi menjaga integritas, profesionalisme, dan nama baik {letterData.kopCompanyName} serta Kreditur.
                        </p>
                      </div>

                      {/* Signatures */}
                      <div className="mt-3 flex justify-between break-inside-avoid text-[9pt]">
                        <div className="w-[260px]">
                          <p className="mb-8"><br/>Pemberi Tugas,<br/>{letterData.kopCompanyName}</p>
                          <p className="font-bold underline">{letterData.assignerName}</p>
                          <p>{letterData.assignerPosition}</p>
                        </div>
                        <div className="w-[260px]">
                          <p className="mb-8">{letterData.signPlaceDate}<br/>Penerima Tugas,<br/>PETUGAS PENAGIHAN</p>
                          <p className="font-bold underline">{letterData.assigneeName || '....................................'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page 2: Lampiran (if any) */}
              {hasAttachments && (activePageIndex === 0 || activePageIndex === 2) && (
                <div className="relative group">
                  <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-[11px] text-slate-400 font-sans font-medium px-1 print:hidden">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <FileText size={13} className="text-amber-400" /> Halaman 2: Lampiran Foto / Berkas
                    </span>
                    <span>
                      {activePaper.name} ({activePaper.widthMm} × {activePaper.heightMm} mm)
                    </span>
                  </div>

                  <div
                    id="preview-modal-letter-page-2"
                    style={{
                      width: `${activePaper.widthMm}mm`,
                      minHeight: `${activePaper.heightMm}mm`,
                      paddingTop: '10mm',
                      paddingLeft: '18mm',
                      paddingRight: '18mm',
                      paddingBottom: '12mm',
                    }}
                    className={`bg-white shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-slate-300 font-serif text-[9.5pt] leading-[1.28] box-border text-black print-document-sheet print-page-last ${
                      showGuidelines ? 'outline outline-1 outline-dashed outline-rose-400' : ''
                    }`}
                  >
                    <h3 className="font-bold text-lg mb-6 text-center underline">Lampiran</h3>
                    <div className="flex flex-col items-center gap-8">
                      {letterData.attachments.map((att, idx) => (
                        <img
                          key={idx}
                          src={att.url}
                          alt={`Lampiran ${idx + 1}`}
                          style={{ width: `${att.width || 600}px`, height: `${att.height || 270}px` }}
                          className="object-contain border-2 border-dashed border-[#D1D1CA] p-2"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= BAST PREVIEW ================= */}
          {docType === 'bast' && bastData && (
            <>
              {/* Surat Penyerahan */}
              {(bastPageMode === 'both' || bastPageMode === 'penyerahan') && (
                <div className="relative group">
                  <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-[11px] text-slate-400 font-sans font-medium px-1 print:hidden">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <FileText size={13} className="text-amber-400" /> Halaman 1: Surat Penyerahan Sukarela
                    </span>
                    <span>
                      {activePaper.name} ({activePaper.widthMm} × {activePaper.heightMm} mm)
                    </span>
                  </div>

                  <div
                    id="preview-modal-penyerahan-doc"
                    className={`shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-slate-300 print-document-sheet ${
                      bastPageMode === 'both' ? 'print-page-break' : 'print-page-last'
                    } ${
                      showGuidelines ? 'outline outline-1 outline-dashed outline-rose-400' : ''
                    }`}
                  >
                    <SuratPenyerahan data={bastData} paperSize={paperSize} />
                  </div>
                </div>
              )}

              {/* Lembar BAST */}
              {(bastPageMode === 'both' || bastPageMode === 'bast') && (
                <div className="relative group">
                  <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-[11px] text-slate-400 font-sans font-medium px-1 print:hidden">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <FileText size={13} className="text-amber-400" /> Halaman 2: Lembar BAST & Checklist Fisik
                    </span>
                    <span>
                      {activePaper.name} ({activePaper.widthMm} × {activePaper.heightMm} mm)
                    </span>
                  </div>

                  <div
                    id="preview-modal-bast-sheet-doc"
                    className={`shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-slate-300 print-document-sheet print-page-last ${
                      showGuidelines ? 'outline outline-1 outline-dashed outline-rose-400' : ''
                    }`}
                  >
                    <BastSheet data={bastData} paperSize={paperSize} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-9 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Info size={12} className="text-amber-400" />
            <span>Format kertas: <strong className="text-slate-200">{activePaper.name}</strong> ({activePaper.widthMm} × {activePaper.heightMm} mm)</span>
          </span>
          <span className="hidden md:inline text-slate-600">•</span>
          <span className="hidden md:inline text-slate-400">Pintasan: <strong>Ctrl + P</strong> untuk cetak, <strong>Esc</strong> untuk tutup</span>
        </div>

        <div className="flex items-center gap-2">
          <span>Skala Tampilan: <strong className="text-amber-300">{Math.round(zoom * 100)}%</strong></span>
        </div>
      </footer>
    </div>
  );
}
