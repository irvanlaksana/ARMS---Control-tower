import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, 
  Folder, 
  FolderOpen,
  UploadCloud, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  FileText,
  Search,
  Plus,
  RefreshCw,
  ArrowLeft,
  Check
} from 'lucide-react';
import { 
  listSubfolders,
  findOrCreateFolder,
  uploadPdfToDrive,
  DriveFolder,
  SKP_ROOT_FOLDER_ID
} from '../services/googleDriveService';
import { PaperSize, PAPER_SIZES } from '../types';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

interface GoogleDriveSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocType: 'surat_tugas' | 'bast';
  paperSize?: PaperSize;
  suggestedClientName?: string;
  suggestedDebtorName?: string;
  suggestedContractNo?: string;
  rootFolderId?: string;
  onSaveSuccess?: (result: { fileId: string; fileUrl: string; fileName: string; folderId: string }) => void;
}

export default function GoogleDriveSaveModal({
  isOpen,
  onClose,
  currentDocType,
  paperSize = 'f4',
  suggestedClientName = '',
  suggestedDebtorName = '',
  suggestedContractNo = '',
  rootFolderId,
  onSaveSuccess,
}: GoogleDriveSaveModalProps) {
  // Navigation State
  const [step, setStep] = useState<'select_folder' | 'confirm_upload'>('select_folder');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successLink, setSuccessLink] = useState<string | null>(null);

  const effectiveRootId = rootFolderId || SKP_ROOT_FOLDER_ID;

  // Folder Navigation Hierarchy
  const [folderPath, setFolderPath] = useState<DriveFolder[]>([
    { id: effectiveRootId, name: 'SKP' }
  ]);
  const currentFolder = folderPath[folderPath.length - 1] || { id: SKP_ROOT_FOLDER_ID, name: 'SKP' };

  // Subfolders of current active directory
  const [subFolders, setSubFolders] = useState<DriveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [customFolderName, setCustomFolderName] = useState(suggestedDebtorName || '');

  // Search filter inside current folder
  const [searchFolder, setSearchFolder] = useState('');

  // Filename preview
  const defaultFileName = `${
    currentDocType === 'surat_tugas' ? 'SURAT_TUGAS' : 'BAST'
  }_${(suggestedDebtorName || 'Debitur').trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_${(suggestedContractNo || 'KONTRAK').trim().replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  const [fileName, setFileName] = useState(defaultFileName);

  useEffect(() => {
    if (isOpen) {
      setSuccessLink(null);
      setErrorMsg('');
      setFileName(defaultFileName);
      setCustomFolderName(suggestedDebtorName || '');
      const rootItem: DriveFolder = { id: SKP_ROOT_FOLDER_ID, name: 'SKP' };
      setFolderPath([rootItem]);
      loadFolderContents(rootItem);
    }
  }, [isOpen, suggestedClientName, suggestedDebtorName, suggestedContractNo, currentDocType]);

  // Load subfolders for given folder
  const loadFolderContents = async (folder: DriveFolder) => {
    setLoading(true);
    setErrorMsg('');
    setStatusMsg(`Membuka folder "${folder.name}"...`);
    try {
      const folders = await listSubfolders(folder.id);
      setSubFolders(folders);
      setStep('select_folder');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat folder Google Drive. Pastikan izin akses telah disetujui.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  // Open / Enter a subfolder
  const handleOpenSubfolder = (folder: DriveFolder) => {
    const nextPath = [...folderPath, folder];
    setFolderPath(nextPath);
    setSearchFolder('');
    loadFolderContents(folder);
  };

  // Navigate up one level
  const handleNavigateUp = () => {
    if (folderPath.length <= 1) return;
    const nextPath = folderPath.slice(0, folderPath.length - 1);
    setFolderPath(nextPath);
    setSearchFolder('');
    loadFolderContents(nextPath[nextPath.length - 1]);
  };

  // Navigate directly via breadcrumb click
  const handleBreadcrumbClick = (index: number) => {
    if (index === folderPath.length - 1) return;
    const nextPath = folderPath.slice(0, index + 1);
    setFolderPath(nextPath);
    setSearchFolder('');
    loadFolderContents(nextPath[nextPath.length - 1]);
  };

  // Select folder as target upload destination
  const handleSelectFolderAsTarget = (folder: DriveFolder) => {
    setSelectedFolder(folder);
    setStep('confirm_upload');
  };

  // Create new folder inside the CURRENT folder
  const handleCreateFolder = async (autoOpen: boolean = false) => {
    const nameToCreate = customFolderName.trim() || suggestedDebtorName.trim() || 'Folder Baru';
    
    setLoading(true);
    setErrorMsg('');
    setStatusMsg(`Membuat folder "${nameToCreate}" di dalam ${currentFolder.name}...`);
    try {
      const newFolder = await findOrCreateFolder(currentFolder.id, nameToCreate);
      
      // Update subfolders list
      if (!subFolders.some((f) => f.id === newFolder.id)) {
        setSubFolders([newFolder, ...subFolders]);
      }
      setCustomFolderName('');

      if (autoOpen) {
        // Open the newly created folder
        handleOpenSubfolder(newFolder);
      } else {
        // Select it directly as target
        handleSelectFolderAsTarget(newFolder);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal membuat folder baru.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  // Generate PDF Blob from current page
  const generatePdfBlob = async (): Promise<Blob> => {
    const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.f4;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [activePaper.widthMm, activePaper.heightMm],
      compress: true,
    });

    if (currentDocType === 'surat_tugas') {
      const page1 = document.getElementById('letter-page-1') || document.getElementById('preview-modal-letter-page-1');
      if (!page1) throw new Error('Dokumen Surat Tugas tidak ditemukan di halaman');

      const imgData1 = await toJpeg(page1, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      pdf.addImage(imgData1, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');

      const page2 = document.getElementById('letter-page-2') || document.getElementById('preview-modal-letter-page-2');
      if (page2) {
        pdf.addPage([activePaper.widthMm, activePaper.heightMm], 'portrait');
        const imgData2 = await toJpeg(page2, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });
        pdf.addImage(imgData2, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');
      }
    } else {
      const pages = ['surat-penyerahan-doc', 'bast-sheet-doc', 'preview-modal-penyerahan-doc', 'preview-modal-bast-sheet-doc'];
      const foundEls: HTMLElement[] = [];

      // Check standard preview elements first, then modal elements
      const p1 = document.getElementById('surat-penyerahan-doc') || document.getElementById('preview-modal-penyerahan-doc');
      const p2 = document.getElementById('bast-sheet-doc') || document.getElementById('preview-modal-bast-sheet-doc');
      if (p1) foundEls.push(p1);
      if (p2) foundEls.push(p2);

      let added = 0;
      for (const el of foundEls) {
        if (added > 0) pdf.addPage([activePaper.widthMm, activePaper.heightMm], 'portrait');
        const imgData = await toJpeg(el, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');
        added++;
      }
      if (added === 0) throw new Error('Dokumen BAST tidak ditemukan di halaman');
    }

    return pdf.output('blob');
  };

  // Execute Upload
  const handleUpload = async () => {
    if (!selectedFolder) {
      setErrorMsg('Silakan pilih atau buat folder terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setStatusMsg('Merender PDF dan mengunggah ke Google Drive...');
    try {
      const blob = await generatePdfBlob();
      const finalName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      const uploaded = await uploadPdfToDrive(selectedFolder.id, finalName, blob);

      setSuccessLink(
        uploaded.webViewLink ||
          `https://drive.google.com/drive/folders/${selectedFolder.id}`
      );
      setStatusMsg('File berhasil disimpan ke Google Drive!');

      if (onSaveSuccess) {
        onSaveSuccess({
          fileId: uploaded.id,
          fileUrl: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
          fileName: finalName,
          folderId: selectedFolder.id,
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah file.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5A5A40] text-white rounded-xl shadow-xs">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Penyimpanan Dokumen ke Google Drive
              </h3>
              <p className="text-xs text-slate-500">
                Jelajahi, pilih folder, atau buat folder baru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStep('select_folder')}
            className={`font-semibold flex items-center gap-1.5 ${
              step === 'select_folder'
                ? 'text-[#5A5A40]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen size={14} />
            1. Jelajahi & Pilih / Buat Folder
          </button>
          <ChevronRight size={12} className="text-slate-400" />
          <span
            className={`font-semibold flex items-center gap-1.5 ${
              step === 'confirm_upload' ? 'text-[#5A5A40]' : 'text-slate-400'
            }`}
          >
            <FileText size={14} />
            2. Konfirmasi & Simpan
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Gagal mengakses Google Drive</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {successLink && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Dokumen Berhasil Disimpan!
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  File telah diunggah ke folder <strong>{selectedFolder?.name}</strong> di Google Drive.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <a
                  href={successLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink size={14} />
                  Buka di Google Drive
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: FOLDER EXPLORER (OPEN, SELECT, CREATE) */}
          {!successLink && step === 'select_folder' && (
            <div className="space-y-3.5">
              {/* Breadcrumbs & Navigation Bar */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5 text-slate-700 font-medium">
                    {folderPath.length > 1 && (
                      <button
                        type="button"
                        onClick={handleNavigateUp}
                        disabled={loading}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition flex items-center gap-1 text-[11px] font-semibold mr-1 cursor-pointer"
                        title="Kembali ke folder sebelumnya"
                      >
                        <ArrowLeft size={13} />
                        <span>Kembali</span>
                      </button>
                    )}

                    {folderPath.map((item, idx) => {
                      const isLast = idx === folderPath.length - 1;
                      return (
                        <React.Fragment key={item.id}>
                          {idx > 0 && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
                          <button
                            type="button"
                            onClick={() => handleBreadcrumbClick(idx)}
                            disabled={isLast || loading}
                            className={`px-1.5 py-0.5 rounded transition shrink-0 flex items-center gap-1 ${
                              isLast
                                ? 'bg-white font-bold text-[#5A5A40] shadow-2xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer'
                            }`}
                          >
                            <Folder size={12} className={isLast ? 'text-[#5A5A40]' : 'text-amber-500'} />
                            <span>{item.name}</span>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadFolderContents(currentFolder)}
                      disabled={loading}
                      className="text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      title="Segarkan daftar isi folder"
                    >
                      <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                      <span className="hidden sm:inline">Muat Ulang</span>
                    </button>
                    <a
                      href={`https://drive.google.com/drive/folders/${currentFolder.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#5A5A40] hover:text-[#484833] bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 px-2 py-1 rounded-lg flex items-center gap-1 transition"
                      title="Buka langsung di tab Google Drive"
                    >
                      <ExternalLink size={11} />
                      <span className="hidden sm:inline">Drive</span>
                    </a>
                  </div>
                </div>

                {/* Banner to select CURRENT FOLDER directly */}
                <div className="pt-1.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/50 p-2 rounded-lg border-dashed border-amber-200">
                  <div className="text-[11px] text-slate-700">
                    <span className="text-slate-500">Folder Aktif Saat Ini:</span>{' '}
                    <strong className="text-slate-900 font-bold">{currentFolder.name}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectFolderAsTarget(currentFolder)}
                    className="px-3 py-1.5 bg-[#5A5A40] text-white hover:bg-[#484833] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                  >
                    <Check size={13} />
                    Pilih "{currentFolder.name}" Sebagai Tujuan
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder={`Cari sub-folder di dalam "${currentFolder.name}"...`}
                  value={searchFolder}
                  onChange={(e) => setSearchFolder(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]"
                />
              </div>

              {/* Subfolders Explorer List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                  <span>Daftar Sub-Folder di "{currentFolder.name}":</span>
                  <span>{subFolders.length} folder ditemukan</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white shadow-2xs">
                  {subFolders
                    .filter((f) => f.name.toLowerCase().includes(searchFolder.toLowerCase()))
                    .map((folder) => {
                      return (
                        <div
                          key={folder.id}
                          className="p-2.5 sm:p-3 flex items-center justify-between hover:bg-slate-50 transition gap-2 group"
                        >
                          <div
                            onClick={() => handleOpenSubfolder(folder)}
                            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                            title="Klik untuk membuka sub-folder ini"
                          >
                            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition shrink-0">
                              <Folder size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#5A5A40] transition">
                                {folder.name}
                              </p>
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                Klik untuk buka sub-folder
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenSubfolder(folder)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Buka isi folder ini"
                            >
                              <FolderOpen size={12} />
                              Buka
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectFolderAsTarget(folder)}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#5A5A40] bg-[#5A5A40]/10 hover:bg-[#5A5A40] hover:text-white rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Pilih folder ini sebagai tujuan simpan PDF"
                            >
                              <Check size={12} />
                              Pilih
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {subFolders.length === 0 && !loading && (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-1.5">
                      <p className="font-semibold text-slate-700">Folder "{currentFolder.name}" masih kosong.</p>
                      <p className="text-[11px] text-slate-400">
                        Anda dapat memilih folder ini langsung atau membuat sub-folder baru di bawah.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CREATE FOLDER SECTION */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FolderPlus size={15} className="text-[#5A5A40]" />
                    Buat Folder Baru di dalam "{currentFolder.name}":
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder={`Nama folder baru di dalam "${currentFolder.name}"...`}
                    value={customFolderName}
                    onChange={(e) => setCustomFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customFolderName.trim()) {
                        handleCreateFolder(false);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCreateFolder(false)}
                      disabled={!customFolderName.trim() || loading}
                      className="flex-1 sm:flex-initial px-3 py-2 bg-[#5A5A40] text-white rounded-lg text-xs font-bold hover:bg-[#484833] disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Buat folder dan langsung gunakan sebagai tujuan simpan"
                    >
                      <Plus size={14} /> Buat & Pilih
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateFolder(true)}
                      disabled={!customFolderName.trim() || loading}
                      className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer transition"
                      title="Buat folder dan buka isinya"
                    >
                      <FolderOpen size={13} /> Buat & Buka
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIRM & UPLOAD */}
          {!successLink && step === 'confirm_upload' && selectedFolder && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                  <span className="text-slate-500 shrink-0">Lokasi / Jalur Folder:</span>
                  <div className="flex items-center gap-1 flex-wrap justify-end text-slate-700 font-medium text-[11px]">
                    {folderPath.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        {idx > 0 && <span className="text-slate-400">/</span>}
                        <span>{item.name}</span>
                      </React.Fragment>
                    ))}
                    {selectedFolder.id !== currentFolder.id && (
                      <>
                        <span className="text-slate-400">/</span>
                        <span className="font-bold text-[#5A5A40]">{selectedFolder.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Folder Tujuan Terpilih:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5">
                    <Folder size={13} className="text-emerald-600" />
                    {selectedFolder.name}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tipe Dokumen:</span>
                  <span className="font-semibold text-slate-800">
                    {currentDocType === 'surat_tugas'
                      ? 'Surat Tugas Eksekusi Jaminan Fidusia'
                      : 'BAST & Berita Acara Penyerahan Kendaraan'}
                  </span>
                </div>
              </div>

              {/* Edit Filename */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Nama File PDF:</span>
                  <span className="text-[11px] text-slate-400 font-normal">Dapat disesuaikan</span>
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] font-mono"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                💡 Dokumen PDF berkualitas tinggi akan dibuat dari formulir aktif dan langsung diunggah ke Google Drive Anda secara otomatis.
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {loading && (
              <>
                <Loader2 size={15} className="animate-spin text-[#5A5A40]" />
                <span className="font-medium">{statusMsg || 'Memproses...'}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'confirm_upload' && !successLink && (
              <button
                type="button"
                onClick={() => setStep('select_folder')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Ganti Folder
              </button>
            )}

            {!successLink && step === 'confirm_upload' && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={loading || !selectedFolder}
                className="px-5 py-2 bg-[#5A5A40] text-white hover:bg-[#484833] rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                Unggah & Simpan ke Drive
              </button>
            )}

            {!successLink && step === 'select_folder' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
