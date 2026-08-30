import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, DriveFolder } from '../../types/arms';
import { ROOT_GDRIVE_URL } from '../../data/initialData';
import {
  HardDrive,
  FolderPlus,
  Folder,
  ExternalLink,
  Link2,
  Check,
  Copy,
  Plus,
  X,
  Sparkles,
  Info,
  ChevronRight,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

interface GoogleDriveFolderPickerProps {
  store: ARMSStore;
  currentUser?: User;
  onUpdateStore?: (newStore: ARMSStore) => void;
  // Selected Folder
  selectedFolderId?: string;
  onSelectFolder?: (folderId: string, folderUrl: string) => void;
  // File URL Value
  valueUrl: string;
  onChangeUrl: (url: string) => void;
  // Default Category context
  defaultCategory?: 'SK' | 'LAWYER_SOMASI' | 'MOU_KONTRAK' | 'DEBTOR_CASES' | 'FIELD_OPS' | 'FINANCE_RECEIPTS' | 'SETTLEMENT' | 'GENERAL' | 'CUSTOM';
  label?: string;
  helperText?: string;
  compact?: boolean;
}

export const GoogleDriveFolderPicker: React.FC<GoogleDriveFolderPickerProps> = ({
  store,
  currentUser,
  onUpdateStore,
  selectedFolderId,
  onSelectFolder,
  valueUrl,
  onChangeUrl,
  defaultCategory = 'SK',
  label = 'Penyimpanan Google Drive & Tautan Dokumen',
  helperText = 'Unggah berkas scan/PDF ke folder tujuan di Google Drive, lalu salin link URL dokumen ke sini.',
  compact = false,
}) => {
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState<DriveFolder['category']>(defaultCategory);
  const [newFolderUrl, setNewFolderUrl] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const driveFolders = store.driveFolders || [];
  const rootUrl = store.settings?.googleDriveFolderUrl || ROOT_GDRIVE_URL;

  // Find active folder or fallback to category-matching folder
  const currentFolder = driveFolders.find((f) => f.id === selectedFolderId) 
    || driveFolders.find((f) => f.category === defaultCategory)
    || driveFolders[0];

  const activeFolderUrl = currentFolder?.folderUrl || rootUrl;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenId = e.target.value;
    if (chosenId === '__CREATE_NEW__') {
      setShowCreateFolderModal(true);
      return;
    }
    const chosenFolder = driveFolders.find((f) => f.id === chosenId);
    if (chosenFolder && onSelectFolder) {
      onSelectFolder(chosenFolder.id, chosenFolder.folderUrl);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newId = `FLD-${Date.now().toString().slice(-4)}`;
    const folderItem: DriveFolder = {
      id: newId,
      name: newFolderName.trim(),
      category: newFolderCategory,
      folderUrl: newFolderUrl.trim() || rootUrl,
      description: newFolderDesc.trim() || undefined,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
    };

    const updatedFolders = [...driveFolders, folderItem];

    if (onUpdateStore) {
      const audit = currentUser ? createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'DRIVE_FOLDER',
        newId,
        `Created new Google Drive Folder [${newFolderName}] under category [${newFolderCategory}]`
      ) : null;

      onUpdateStore({
        ...store,
        driveFolders: updatedFolders,
        auditLogs: audit ? [audit, ...(store.auditLogs || [])] : store.auditLogs,
      });
    }

    if (onSelectFolder) {
      onSelectFolder(newId, folderItem.folderUrl);
    }

    // Reset & close
    setNewFolderName('');
    setNewFolderUrl('');
    setNewFolderDesc('');
    setShowCreateFolderModal(false);
  };

  const isDriveUrlValid = valueUrl && (valueUrl.startsWith('http://') || valueUrl.startsWith('https://'));

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>{label}</span>
              <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 text-[10px] rounded font-mono font-normal">
                Cloud GDrive
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">{helperText}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showInstructions ? 'Tutup Panduan' : 'Panduan Akses'}</span>
          </button>

          <a
            href={rootUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold text-blue-300 hover:text-white bg-blue-950/70 hover:bg-blue-900 px-2.5 py-1 rounded-lg border border-blue-700/80 flex items-center gap-1.5 transition group shadow-sm"
            title="Buka Folder Google Drive Master ARMS"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Buka GDrive Master</span>
            <ExternalLink className="w-3 h-3 text-blue-400" />
          </a>
        </div>
      </div>

      {/* Step-by-Step Instructions Collapsible */}
      {showInstructions && (
        <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-blue-950/40 border border-indigo-800/40 rounded-xl p-3.5 text-xs text-slate-300 space-y-2">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5" />
            <span>Alur Pengelolaan Manual Google Drive ARMS:</span>
          </div>
          <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-slate-300 pl-1 leading-relaxed">
            <li>
              Pilih <strong className="text-white">Folder Tujuan</strong> di bawah ini atau buat folder baru jika belum ada.
            </li>
            <li>
              Klik tombol <strong className="text-blue-300">"Buka Folder di GDrive ↗"</strong> untuk membuka folder Google Drive tersebut di tab baru.
            </li>
            <li>
              Unggah file dokumen (PDF/Scan/Foto) ke dalam folder tersebut di Google Drive.
            </li>
            <li>
              Klik kanan file yang diunggah di Google Drive &gt; <em>Salin link (Get link)</em> &gt; pastikan akses disetel ke <em>"Anyone with link / Tim ARMS"</em>.
            </li>
            <li>
              Tempelkan (Paste) link tersebut pada kolom <strong className="text-emerald-300">"Tautan URL Berkas Dokumen"</strong> di bawah.
            </li>
          </ol>
        </div>
      )}

      {/* 1. SELEKSI FOLDER TUJUAN & TOMBOL BUAT FOLDER BARU */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Folder Tujuan Penyimpanan di Google Drive:</span>
          </label>

          <button
            type="button"
            onClick={() => setShowCreateFolderModal(true)}
            className="text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/80 px-2.5 py-0.5 rounded-md flex items-center gap-1 transition"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Buat Folder Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-8">
            <select
              value={currentFolder?.id || ''}
              onChange={handleSelectChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <optgroup label="📁 Folder Master & Kategori Sistem">
                {driveFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.category ? `[${f.category}]` : ''}
                  </option>
                ))}
              </optgroup>
              <option value="__CREATE_NEW__" className="text-indigo-400 font-bold">
                ➕ Buat Folder Baru di Google Drive...
              </option>
            </select>
          </div>

          <div className="sm:col-span-4 flex items-center gap-1.5">
            <a
              href={activeFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-indigo-500 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition group"
              title="Akses Langsung Folder Ini di Google Drive"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">Buka di GDrive</span>
            </a>
          </div>
        </div>

        {currentFolder?.description && (
          <p className="text-[10px] text-slate-400 italic pl-1">
            Keterangan Folder: {currentFolder.description}
          </p>
        )}
      </div>

      {/* 2. INPUT URL BERKAS / SCAN DOKUMEN */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tautan URL Berkas Dokumen (Google Drive Link):</span>
          </label>
          {isDriveUrlValid && (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Link Terhubung
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/.../view atau link dokumen"
              value={valueUrl}
              onChange={(e) => onChangeUrl(e.target.value)}
              className={`w-full bg-slate-900 border rounded-xl pl-3 pr-8 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition ${
                isDriveUrlValid ? 'border-emerald-600/70 focus:border-emerald-400' : 'border-slate-700 focus:border-indigo-500'
              }`}
            />
            {valueUrl && (
              <button
                type="button"
                onClick={() => onChangeUrl('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                title="Hapus Link"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isDriveUrlValid && (
            <>
              <a
                href={valueUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                title="Buka & Uji Link Dokumen di Tab Baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Uji Buka</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(valueUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 p-2 rounded-xl text-xs transition"
                title="Salin Link ke Clipboard"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
        <p className="text-[10px] text-slate-500 pl-1">
          Folder Google Drive Master: <span className="font-mono text-indigo-300 truncate inline-block max-w-[280px] align-bottom">{rootUrl}</span>
        </p>
      </div>

      {/* MODAL BUAT FOLDER BARU */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Buat / Daftarkan Folder Google Drive Baru</h3>
                  <p className="text-[11px] text-slate-400">Tambah direktori folder untuk mengorganisir arsip dokumen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Folder Baru <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 📁 08. Somasi BAF Finance 2026 atau 📁 Kasus Bpk. Hendra"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Kategori Dokumen
                  </label>
                  <select
                    value={newFolderCategory}
                    onChange={(e) => setNewFolderCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SK">Surat Tugas & Kuasa (SK)</option>
                    <option value="LAWYER_SOMASI">Somasi & Tindakan Advokat</option>
                    <option value="MOU_KONTRAK">MoU & Perjanjian Kerjasama</option>
                    <option value="DEBTOR_CASES">Berkas Debitur & SPH</option>
                    <option value="FIELD_OPS">Berita Acara Lapangan</option>
                    <option value="FINANCE_RECEIPTS">Bukti Transfer & Kwitansi</option>
                    <option value="SETTLEMENT">Laporan Settlement</option>
                    <option value="GENERAL">Dokumen Umum & Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    URL Folder di GDrive (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={newFolderUrl}
                    onChange={(e) => setNewFolderUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Deskripsi / Catatan Folder
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan peruntukan folder ini..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-3 text-[11px] text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <span>Tip: Buat subfolder di Google Drive utama terlebih dahulu via: </span>
                  <a
                    href={rootUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white underline font-semibold ml-1 inline-flex items-center gap-0.5"
                  >
                    Buka Google Drive <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="block mt-0.5 text-slate-400">Lalu salin link folder tersebut dan masukkan di sini. Jika dikosongkan, folder akan otomatis menginduk ke Google Drive Master.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition flex items-center gap-1.5 shadow-lg shadow-indigo-950"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Folder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
