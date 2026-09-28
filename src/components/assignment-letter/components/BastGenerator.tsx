import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BastData, ChecklistMap, VehicleType, PaperSize, LetterData } from '../types';
import { PAPER_SIZES, DEFAULT_PAPER_SIZE } from '../types';
import { BLANK_DATA, CONTOH_RODA2, CONTOH_RODA4, syncChecklist, emptyChecklist } from '../data/defaults';
import { getSavedKopTemplate } from '../utils/kopStorage';
import FormPanel from './FormPanel';
import SuratPenyerahan from './SuratPenyerahan';
import BastSheet from './BastSheet';
import { Btn } from './ui';
import { FileDown, Loader2, RotateCcw, Sparkles, UploadCloud, Printer, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

const STORAGE_KEY = 'bast-generator-v1';

type PageMode = 'both' | 'bast' | 'penyerahan';

function loadInitial(): BastData {
  const savedKop = getSavedKopTemplate();
  const baseKop: Partial<BastData> = savedKop ? {
    kopImage: savedKop.kopImage,
    kopImageHeight: savedKop.kopImageHeight,
    kopImageFit: savedKop.kopImageFit,
    kopImageAlign: savedKop.kopImageAlign,
    kopImageOffsetY: savedKop.kopImageOffsetY,
    kopImageOffsetX: savedKop.kopImageOffsetX,
    kopImageMarginBottom: savedKop.kopImageMarginBottom,
    kopCompanyName: savedKop.kopCompanyName,
    useImageKop: Boolean(savedKop.kopImage),
  } : {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BastData;
      return {
        ...CONTOH_RODA4,
        ...baseKop,
        ...parsed,
        kopImage: parsed.kopImage !== undefined ? parsed.kopImage : (savedKop?.kopImage ?? null),
        kopImageHeight: parsed.kopImageHeight ?? savedKop?.kopImageHeight ?? 120,
        kopImageFit: parsed.kopImageFit ?? savedKop?.kopImageFit ?? 'contain',
        kopImageAlign: parsed.kopImageAlign ?? savedKop?.kopImageAlign ?? 'center',
        kopImageOffsetY: parsed.kopImageOffsetY ?? savedKop?.kopImageOffsetY ?? 0,
        kopImageOffsetX: parsed.kopImageOffsetX ?? savedKop?.kopImageOffsetX ?? 0,
        kopImageMarginBottom: parsed.kopImageMarginBottom ?? savedKop?.kopImageMarginBottom ?? 24,
        useImageKop: parsed.useImageKop !== undefined ? parsed.useImageKop : Boolean(savedKop?.kopImage),
        checklist: syncChecklist(parsed.jenis ?? 'roda4', parsed.checklist ?? {}),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    ...CONTOH_RODA4,
    ...baseKop,
  };
}

interface BastGeneratorProps {
  data?: BastData;
  onChange?: (data: BastData) => void;
  externalData?: BastData;
  onDataChange?: (data: BastData) => void;
  letterData?: LetterData;
  onSyncFromLetter?: () => void;
  paperSize?: PaperSize;
  onPaperSizeChange?: (size: PaperSize) => void;
  onOpenPrintPreview?: () => void;
  onOpenDriveModal?: () => void;
}

export default function BastGenerator({
  data: propData,
  onChange: propOnChange,
  externalData,
  onDataChange,
  letterData,
  onSyncFromLetter,
  paperSize = DEFAULT_PAPER_SIZE,
  onPaperSizeChange,
  onOpenPrintPreview,
  onOpenDriveModal,
}: BastGeneratorProps = {}) {
  // Support both (data, onChange) and (externalData, onDataChange)
  const isControlled = Boolean(propData || externalData);
  const activeOnChange = propOnChange || onDataChange;

  const [internalData, setInternalData] = useState<BastData>(() => loadInitial());
  const data = (propData || externalData) ?? internalData;

  const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.f4;
  const A4_PX = (activePaper.widthMm * 96) / 25.4;

  const [pageMode, setPageMode] = useState<PageMode>('both');
  const [zoom, setZoom] = useState(0.85);
  const [autoFit, setAutoFit] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'form' | 'preview'>('form');
  const previewRef = useRef<HTMLDivElement>(null);

  // Debounced auto-save to localStorage
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [data]);

  const updateData = useCallback(
    (updater: (prev: BastData) => BastData) => {
      if (isControlled && activeOnChange) {
        activeOnChange(updater(data));
      } else {
        setInternalData(updater);
      }
    },
    [isControlled, activeOnChange, data]
  );

  const fit = useCallback(() => {
    const el = previewRef.current;
    if (!el) return;
    const w = el.clientWidth - 48;
    setZoom(Math.min(1.2, Math.max(0.35, w / A4_PX)));
  }, [A4_PX]);

  useLayoutEffect(() => {
    if (!autoFit) return;
    fit();
    const ro = new ResizeObserver(() => fit());
    if (previewRef.current) ro.observe(previewRef.current);
    return () => ro.disconnect();
  }, [autoFit, fit, activePaper.widthMm]);

  const set = useCallback(
    <K extends keyof BastData>(key: K, value: BastData[K]) =>
      updateData((d) => ({ ...d, [key]: value })),
    [updateData],
  );

  const setJenis = useCallback(
    (j: VehicleType) =>
      updateData((d) => ({ ...d, jenis: j, checklist: syncChecklist(j, d.checklist) })),
    [updateData],
  );

  const setChecklist = useCallback(
    (c: ChecklistMap) => updateData((d) => ({ ...d, checklist: c })),
    [updateData],
  );

  const contoh = () =>
    updateData((d) => (d.jenis === 'roda2' ? CONTOH_RODA2 : CONTOH_RODA4));
  
  const reset = () =>
    updateData((d) => ({
      ...BLANK_DATA,
      jenis: d.jenis,
      perusahaan: d.perusahaan,
      cabang: d.cabang,
      alamat: d.alamat,
      telepon: d.telepon,
      kopImage: d.kopImage,
      kopImageHeight: d.kopImageHeight,
      kopImageFit: d.kopImageFit,
      kopImageAlign: d.kopImageAlign,
      kopImageOffsetY: d.kopImageOffsetY,
      kopImageOffsetX: d.kopImageOffsetX,
      kopImageMarginBottom: d.kopImageMarginBottom,
      kopCompanyName: d.kopCompanyName,
      useImageKop: d.useImageKop,
      checklist: emptyChecklist(d.jenis),
    }));

  const applyTemplate = useCallback((template: BastData) => {
    const savedKop = getSavedKopTemplate();
    updateData((prev) => ({
      ...template,
      kopImage: template.kopImage !== undefined ? template.kopImage : (prev.kopImage ?? savedKop?.kopImage ?? null),
      kopImageHeight: template.kopImageHeight ?? prev.kopImageHeight ?? savedKop?.kopImageHeight ?? 120,
      kopImageFit: template.kopImageFit ?? prev.kopImageFit ?? savedKop?.kopImageFit ?? 'contain',
      kopImageAlign: template.kopImageAlign ?? prev.kopImageAlign ?? savedKop?.kopImageAlign ?? 'center',
      kopImageOffsetY: template.kopImageOffsetY ?? prev.kopImageOffsetY ?? savedKop?.kopImageOffsetY ?? 0,
      kopImageOffsetX: template.kopImageOffsetX ?? prev.kopImageOffsetX ?? savedKop?.kopImageOffsetX ?? 0,
      kopImageMarginBottom: template.kopImageMarginBottom ?? prev.kopImageMarginBottom ?? savedKop?.kopImageMarginBottom ?? 24,
      useImageKop: template.useImageKop !== undefined ? template.useImageKop : (prev.useImageKop ?? Boolean(savedKop?.kopImage)),
    }));
  }, [updateData]);

  const zoomBy = (d: number) => {
    setAutoFit(false);
    setZoom((z) => Math.min(1.6, Math.max(0.25, +(z + d).toFixed(2))));
  };

  const handleSavePdf = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [activePaper.widthMm, activePaper.heightMm],
        compress: true,
      });

      const pagesToRender: { id: string; name: string }[] = [];
      if (pageMode === 'both' || pageMode === 'penyerahan') {
        pagesToRender.push({ id: 'surat-penyerahan-doc', name: 'Surat Penyerahan' });
      }
      if (pageMode === 'both' || pageMode === 'bast') {
        pagesToRender.push({ id: 'bast-sheet-doc', name: 'BAST' });
      }

      for (let i = 0; i < pagesToRender.length; i++) {
        const pageInfo = pagesToRender[i];
        const el = document.getElementById(pageInfo.id);
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

      const safeName = (data.debiturNama || 'Debitur').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `BAST_Penyerahan_${safeName}_${data.jenis.toUpperCase()}_${paperSize.toUpperCase()}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF error, fallback to print:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (onOpenPrintPreview) {
      onOpenPrintPreview();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-[#EBEBE4] border-b border-[#D1D1CA] print:hidden shrink-0">
        <button
          onClick={() => setActiveTabMobile('form')}
          className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
            activeTabMobile === 'form'
              ? 'text-[#5A5A40] border-b-2 border-[#5A5A40] bg-white/50'
              : 'text-[#8A8A7A] hover:text-[#4A4A4A]'
          }`}
        >
          Formulir BAST
        </button>
        <button
          onClick={() => setActiveTabMobile('preview')}
          className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
            activeTabMobile === 'preview'
              ? 'text-[#5A5A40] border-b-2 border-[#5A5A40] bg-white/50'
              : 'text-[#8A8A7A] hover:text-[#4A4A4A]'
          }`}
        >
          Pratinjau Dokumen
        </button>
      </div>

      {/* ============ SIDEBAR / FORM ============ */}
      <aside
        className={`w-full lg:w-[350px] xl:w-[380px] shrink-0 border-r border-slate-300 bg-slate-50 flex flex-col overflow-hidden ${
          activeTabMobile === 'form' ? 'flex' : 'hidden lg:flex'
        } print:hidden`}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur shadow-xs shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold tracking-tight text-slate-900 leading-tight">
                Data BAST Kendaraan
              </h2>
              <p className="text-[10px] text-slate-500 leading-tight">
                Berita Acara & Surat Penyerahan
              </p>
            </div>
            <div className="flex gap-1">
              {onSyncFromLetter && (
                <button
                  type="button"
                  id="btn-sync-surat-tugas-top"
                  onClick={onSyncFromLetter}
                  className="flex items-center gap-1 px-2 py-1 text-[10.5px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition cursor-pointer"
                  title="Ambil dan sinkronkan semua isian dari Surat Tugas"
                >
                  <Sparkles size={11} className="text-emerald-600" />
                  <span>Sinkron</span>
                </button>
              )}
              <button
                type="button"
                onClick={contoh}
                className="flex items-center gap-1 px-2 py-1 text-[10.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition cursor-pointer"
              >
                <Sparkles size={11} />
                Contoh
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 px-2 py-1 text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-md border border-slate-200 transition cursor-pointer"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="p-2.5 md:p-3 flex-1 overflow-y-auto custom-scrollbar">
          <FormPanel
            data={data}
            set={set}
            setJenis={setJenis}
            setChecklist={setChecklist}
            onApplyTemplate={applyTemplate}
            onSyncFromLetter={onSyncFromLetter}
          />
        </div>
      </aside>

      {/* ============ PREVIEW & EXPORT ============ */}
      <main
        className={`flex-1 flex-col bg-slate-200/80 overflow-hidden ${
          activeTabMobile === 'preview' ? 'flex' : 'hidden lg:flex'
        } print:block print:bg-white`}
      >
        {/* Top bar controls */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-4 py-2.5 shadow-xs">
          {/* Page Tabs */}
          <div className="flex items-center gap-1.5 rounded-lg bg-white p-1 shadow-xs border border-slate-200">
            {(
              [
                ['both', 'Semua Halaman'],
                ['penyerahan', 'Surat Penyerahan'],
                ['bast', 'Lembar BAST'],
              ] as [PageMode, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPageMode(v)}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                  pageMode === v
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-700">Kertas:</span>
              {onPaperSizeChange ? (
                <select
                  value={paperSize}
                  onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
                  className="text-xs font-bold text-[#5A5A40] bg-transparent focus:outline-none cursor-pointer"
                >
                  {(Object.keys(PAPER_SIZES) as PaperSize[]).map((key) => (
                    <option key={key} value={key}>
                      {PAPER_SIZES[key].name} ({PAPER_SIZES[key].widthMm}×{PAPER_SIZES[key].heightMm}mm)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-[#5A5A40]">{activePaper.name}</span>
              )}
            </div>

            {/* Print Preview Button */}
            {onOpenPrintPreview && (
              <button
                type="button"
                id="btn-bast-preview-modal-trigger"
                onClick={onOpenPrintPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                title="Buka Pratinjau Cetak Lengkap (Print Preview)"
              >
                <Eye size={14} className="text-[#5A5A40]" />
                <span className="hidden sm:inline">Pratinjau Cetak</span>
              </button>
            )}

            {/* Quick Direct Print */}
            <button
              type="button"
              id="btn-bast-quick-print"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              title="Cetak Dokumen Sekarang (Ctrl+P)"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => zoomBy(-0.1)}
                className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
              >
                −
              </button>
              <span className="w-10 text-center text-[11px] font-bold text-slate-600">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomBy(0.1)}
                className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setAutoFit((a) => !a)}
                className={`text-[10.5px] px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  autoFit ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Auto
              </button>
            </div>

            {/* Simpan ke GDrive Button */}
            {onOpenDriveModal && (
              <button
                type="button"
                id="btn-bast-simpan-gdrive"
                onClick={onOpenDriveModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D6A4F] text-white rounded-lg hover:bg-[#1B4332] active:scale-[0.98] transition-all font-semibold text-xs shadow-sm cursor-pointer"
              >
                <UploadCloud size={14} />
                <span className="hidden sm:inline">Drive</span>
              </button>
            )}

            {/* Simpan PDF Button */}
            <button
              id="btn-simpan-bast-pdf"
              onClick={handleSavePdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5A5A40] text-white rounded-lg hover:bg-[#484833] active:scale-[0.98] transition-all font-semibold text-xs shadow-sm cursor-pointer disabled:opacity-70"
            >
              {isExporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <FileDown size={14} />
                  <span>Simpan PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div
          ref={previewRef}
          className="flex-1 overflow-auto p-4 md:p-8 flex justify-center custom-scrollbar"
        >
          <div
            className="flex flex-col items-center gap-8 transition-transform duration-150 origin-top"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            {(pageMode === 'both' || pageMode === 'penyerahan') && (
              <div
                id="surat-penyerahan-doc"
                className="shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-slate-300 print:shadow-none print:border-none"
              >
                <SuratPenyerahan data={data} paperSize={paperSize} />
              </div>
            )}
            {(pageMode === 'both' || pageMode === 'bast') && (
              <div
                id="bast-sheet-doc"
                className="shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-slate-300 print:shadow-none print:border-none print:break-before-page"
              >
                <BastSheet data={data} paperSize={paperSize} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

