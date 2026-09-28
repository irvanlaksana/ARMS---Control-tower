import React, { useState, useEffect } from 'react';
import LetterForm from './components/LetterForm';
import LetterPreview from './components/LetterPreview';
import BastGenerator from './components/BastGenerator';
import GoogleDriveSaveModal from './components/GoogleDriveSaveModal';
import PrintPreviewModal from './components/PrintPreviewModal';
import { LetterData, BastData, PaperSize, DEFAULT_PAPER_SIZE, PAPER_SIZES } from './types';
import { FileText, ClipboardCheck, UploadCloud, Printer, ArrowLeft, X } from 'lucide-react';
import { generateLetterNumber } from './utils/letterNumber';
import { CONTOH_RODA4, syncChecklist } from './data/defaults';
import { buildLetterDataFromInput, buildBastDataFromInput, GeneratorFormInput } from '../../lib/suratGenerator';
import { ARMSStore } from '../../services/armsDataService';
import { syncLetterDataToBast } from './utils/syncData';
import { getSavedKopTemplate } from './utils/kopStorage';

export type DocumentType = 'surat_tugas' | 'bast';

const defaultInitialLetterData: LetterData = {
  kopImage: null,
  kopImageHeight: 120,
  kopImageFit: 'contain',
  kopImageAlign: 'center',
  kopImageOffsetY: 0,
  kopImageOffsetX: 0,
  kopImageMarginBottom: 32,
  kopCompanyName: 'PT. MITRA JASATRIA INDONESIA',
  letterNumber: generateLetterNumber(),
  assignerName: 'FILEMO HALAWA',
  assignerPosition: 'DIREKTUR',
  assigneeName: 'RIZKY JUANDA SAPUTRA',
  assigneePosition: 'Petugas Penagihan',
  clientName: 'Koperasi Anugrah Mega Mandiri (KAMM)',
  customerContract: '00730191',
  customerName: 'KISNO ANGKAH TRI HIDAYAT',
  customerAddress: 'KALIKABONG RT 004 RW 002, KEL. KALIKABONG, KEC. KALIMANAH',
  customerAddressDetail: 'KALIKABONG RT 004 RW 002',
  customerKabupaten: 'PURBALINGGA',
  customerKecamatan: 'KALIMANAH',
  customerKelurahan: 'KALIKABONG',
  customerDueDate: '2024-02-02',
  customerInstallment: 'Rp 385.000',
  customerTotalInstallment: 'Rp 4.235.000',
  customerUnpaidInstallmentCount: '10 Bulan',
  customerPenalty: 'Rp 41.692.000',
  attachments: [],
  vehicleBrand: 'YAMAHA / VIXION',
  vehiclePlate: 'R4088YV',
  validFrom: '2026-08-21',
  validTo: '2026-08-31',
  signPlaceDate: 'Purwokerto, 22 Agustus 2026'
};

const STORAGE_KEY_BAST = 'bast-generator-v1';

function loadInitialBast(): BastData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BAST);
    if (raw) {
      const parsed = JSON.parse(raw) as BastData;
      return {
        ...CONTOH_RODA4,
        ...parsed,
        checklist: syncChecklist(parsed.jenis ?? 'roda4', parsed.checklist ?? {}),
      };
    }
  } catch {
    /* ignore */
  }
  return CONTOH_RODA4;
}

export interface AssignmentLetterGeneratorProps {
  initialLetterData?: Partial<LetterData>;
  initialBastData?: Partial<BastData>;
  defaultDocType?: DocumentType;
  rootDriveFolderId?: string;
  onClose?: () => void;
  onSaveToDriveSuccess?: (result: { fileId: string; fileUrl: string; fileName: string; folderId: string; docType: DocumentType }) => void;
  skRecordId?: string;
  isModal?: boolean;
  armsStore?: ARMSStore;
  activeCaseId?: string;
  activePersonnelId?: string;
}

export default function AssignmentLetterGenerator({
  initialLetterData,
  initialBastData,
  defaultDocType = 'surat_tugas',
  rootDriveFolderId,
  onClose,
  onSaveToDriveSuccess,
  skRecordId,
  isModal = false,
  armsStore,
  activeCaseId,
  activePersonnelId,
}: AssignmentLetterGeneratorProps) {
  const [docType, setDocType] = useState<DocumentType>(defaultDocType);
  const [data, setData] = useState<LetterData>(() => {
    const savedKop = getSavedKopTemplate();
    const baseKop = savedKop ? {
      kopImage: savedKop.kopImage,
      kopImageHeight: savedKop.kopImageHeight,
      kopImageFit: savedKop.kopImageFit,
      kopImageAlign: savedKop.kopImageAlign,
      kopImageOffsetY: savedKop.kopImageOffsetY,
      kopImageOffsetX: savedKop.kopImageOffsetX,
      kopImageMarginBottom: savedKop.kopImageMarginBottom,
      kopCompanyName: savedKop.kopCompanyName,
    } : {};
    return {
      ...defaultInitialLetterData,
      ...baseKop,
      ...initialLetterData,
    };
  });
  const [bastData, setBastData] = useState<BastData>(() => ({
    ...loadInitialBast(),
    ...initialBastData,
  }));
  const [paperSize, setPaperSize] = useState<PaperSize>(DEFAULT_PAPER_SIZE);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const handleSelectDocType = (nextDoc: DocumentType) => {
    if (nextDoc === 'bast' && docType === 'surat_tugas') {
      setBastData((prev) => syncLetterDataToBast(data, prev));
    }
    setDocType(nextDoc);
  };

  // Autofill handler from ARMS store case
  const handleAutofillFromCase = (caseId: string, personnelId?: string, isPerorangan: boolean = false) => {
    if (!armsStore) return;
    const caseItem = armsStore.cases?.find(c => c.id === caseId);
    if (!caseItem) return;
    const customer = armsStore.customers?.find(c => c.id === caseItem.customerId);
    const personnel = armsStore.personnel?.find(p => p.id === (personnelId || activePersonnelId));
    const client = armsStore.clients?.find(cl => cl.id === caseItem.clientId);

    const formInput: GeneratorFormInput = {
      caseItem,
      customer,
      personnel,
      companyName: armsStore.settings?.companyName,
      companyAddress: armsStore.settings?.companyAddress,
      isPerorangan: isPerorangan || caseItem.clientType === 'PERORANGAN',
      krediturName: caseItem.clientName,
      krediturAddress: client?.address,
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    const newLetterData = buildLetterDataFromInput(formInput);
    const newBastData = buildBastDataFromInput(formInput);

    setData(prev => ({
      ...prev,
      ...newLetterData,
      // Retain custom uploads if any
      kopImage: prev.kopImage || newLetterData.kopImage,
      attachments: prev.attachments?.length ? prev.attachments : newLetterData.attachments,
    }));

    setBastData(prev => ({
      ...prev,
      ...newBastData,
    }));
  };

  // Update if props change
  useEffect(() => {
    if (initialLetterData) {
      setData((prev) => ({ ...prev, ...initialLetterData }));
    }
  }, [initialLetterData]);

  useEffect(() => {
    if (initialBastData) {
      setBastData((prev) => ({
        ...prev,
        ...initialBastData,
        checklist: initialBastData.checklist || prev.checklist,
      }));
    }
  }, [initialBastData]);

  useEffect(() => {
    if (defaultDocType) {
      setDocType(defaultDocType);
    }
  }, [defaultDocType]);

  const activeClientName = docType === 'surat_tugas' ? data.clientName : bastData.krediturLeasing;
  const activeDebtorName = docType === 'surat_tugas' ? data.customerName : bastData.debiturNama;
  const activeContractNo = docType === 'surat_tugas' ? data.customerContract : bastData.nomorKontrak;

  const handleDriveUploadSuccess = (res: { fileId: string; fileUrl: string; fileName: string; folderId: string }) => {
    if (onSaveToDriveSuccess) {
      onSaveToDriveSuccess({
        ...res,
        docType,
      });
    }
  };

  return (
    <div className={`flex flex-col bg-[#F5F5F0] font-sans text-[#4A4A4A] overflow-hidden ${
      isModal ? 'fixed inset-0 z-50 h-screen max-h-screen w-screen' : 'h-full w-full'
    }`}>
      {/* Header Toolbar */}
      <header id="app-main-header" className="bg-[#EBEBE4] border-b border-[#D1D1CA] px-3 md:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5 print:hidden shadow-xs z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Kembali ke Manajemen SK"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          )}

          <div className="bg-[#5A5A40] p-1.5 rounded-lg text-white shadow-xs">
            {docType === 'surat_tugas' ? <FileText size={18} /> : <ClipboardCheck size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-[#2C2C24] leading-tight">
                {docType === 'surat_tugas' ? 'Generator Surat Tugas Penagihan' : 'BAST & Penyerahan Unit'}
              </h1>
              <span className="text-[10px] bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20 px-2 py-0.5 rounded-full font-mono font-bold">
                GAS Ready
              </span>
            </div>
            <p className="text-[10px] md:text-[11px] text-[#8A8A7A] leading-tight">
              {docType === 'surat_tugas'
                ? 'Format resmi SKP Surat Tugas Eksekusi Penagihan'
                : 'Berita Acara Serah Terima & Surat Penyerahan Sukarela'}
            </p>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Document Template Selector */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D1D1CA] shadow-2xs">
            <button
              type="button"
              id="tab-surat-tugas"
              onClick={() => handleSelectDocType('surat_tugas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                docType === 'surat_tugas'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText size={13} />
              Surat Tugas
            </button>
            <button
              type="button"
              id="tab-bast"
              onClick={() => handleSelectDocType('bast')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                docType === 'bast'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck size={13} />
              BAST
            </button>
          </div>

          {/* Paper Size Selector in Header */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#D1D1CA] shadow-2xs">
            <span className="text-xs font-bold text-slate-700">Kertas:</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="text-xs font-bold text-[#5A5A40] bg-transparent focus:outline-none cursor-pointer"
            >
              {(Object.keys(PAPER_SIZES) as PaperSize[]).map((key) => (
                <option key={key} value={key}>
                  {PAPER_SIZES[key].name} ({PAPER_SIZES[key].widthMm}×{PAPER_SIZES[key].heightMm}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Pratinjau Cetak */}
          <button
            type="button"
            id="btn-header-print-preview"
            onClick={() => setIsPrintPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-[#D1D1CA] rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title="Buka Pratinjau Cetak & Ukuran Kertas"
          >
            <Printer size={14} className="text-[#5A5A40]" />
            <span className="hidden sm:inline">Pratinjau Cetak</span>
            <span className="sm:hidden">Cetak</span>
          </button>

          {/* Tombol Simpan ke GDrive */}
          <button
            type="button"
            id="btn-simpan-ke-gdrive"
            onClick={() => setIsDriveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title="Simpan Dokumen ke Google Drive Multi Finance"
          >
            <UploadCloud size={14} />
            <span className="hidden sm:inline">Simpan ke GDrive</span>
            <span className="sm:hidden">GDrive</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ml-1"
              title="Tutup"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div id="app-main-layout" className="flex-1 flex flex-col overflow-hidden min-h-0">
        {docType === 'bast' ? (
          <BastGenerator 
            data={bastData} 
            onChange={setBastData}
            paperSize={paperSize}
            onPaperSizeChange={setPaperSize}
            onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
            onOpenDriveModal={() => setIsDriveModalOpen(true)}
          />
        ) : (
          <>
            {/* Mobile Tabs for Surat Tugas */}
            <div className="lg:hidden flex bg-[#EBEBE4] border-b border-[#D1D1CA] print:hidden shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${
                  activeTab === 'form'
                    ? 'text-[#5A5A40] border-b-2 border-[#5A5A40] bg-white/50'
                    : 'text-[#8A8A7A] hover:text-[#4A4A4A]'
                }`}
              >
                Isi Data
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${
                  activeTab === 'preview'
                    ? 'text-[#5A5A40] border-b-2 border-[#5A5A40] bg-white/50'
                    : 'text-[#8A8A7A] hover:text-[#4A4A4A]'
                }`}
              >
                Pratinjau Surat
              </button>
            </div>

            <main className="flex-1 flex overflow-hidden min-h-0">
              {/* Form Panel */}
              <div
                className={`w-full lg:w-[360px] xl:w-[400px] shrink-0 border-r border-[#D1D1CA] bg-[#EBEBE4] flex-col overflow-hidden ${
                  activeTab === 'form' ? 'flex' : 'hidden lg:flex'
                } print:hidden`}
              >
                <div className="flex-1 overflow-y-auto p-2.5 md:p-3 custom-scrollbar">
                  <LetterForm 
                    data={data} 
                    onChange={setData}
                    armsStore={armsStore}
                    activeCaseId={activeCaseId}
                    activePersonnelId={activePersonnelId}
                    onAutofillFromCase={handleAutofillFromCase}
                  />
                </div>
              </div>

              {/* Preview Panel */}
              <div
                className={`flex-1 flex-col overflow-hidden bg-[#FDFBF7] min-h-0 ${
                  activeTab === 'preview' ? 'flex' : 'hidden lg:flex'
                } print:block print:bg-white`}
              >
                <LetterPreview 
                  data={data}
                  paperSize={paperSize}
                  onPaperSizeChange={setPaperSize}
                  onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
                  onOpenDriveModal={() => setIsDriveModalOpen(true)}
                />
              </div>
            </main>
          </>
        )}
      </div>

      {/* Full-Featured Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        docType={docType}
        letterData={data}
        bastData={bastData}
        paperSize={paperSize}
        onPaperSizeChange={setPaperSize}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
      />

      {/* Google Drive Save Modal */}
      <GoogleDriveSaveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentDocType={docType}
        paperSize={paperSize}
        suggestedClientName={activeClientName}
        suggestedDebtorName={activeDebtorName}
        suggestedContractNo={activeContractNo}
        rootFolderId={rootDriveFolderId}
        onSaveSuccess={handleDriveUploadSuccess}
      />
    </div>
  );
}
