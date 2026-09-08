import React, { useState, useEffect } from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { User, DriveFolder } from '../../types/arms';
import { GoogleDriveFolderPicker } from './GoogleDriveFolderPicker';
import { HardDrive, X, Check, FileText } from 'lucide-react';

interface QuickGDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  documentNo?: string;
  subjectName?: string;
  initialUrl?: string;
  initialFolderId?: string;
  category?: DriveFolder['category'];
  store: ARMSStore;
  currentUser?: User;
  onUpdateStore?: (newStore: ARMSStore) => void;
  onSave: (url: string, folderId?: string, folderUrl?: string) => void;
}

export const QuickGDriveModal: React.FC<QuickGDriveModalProps> = ({
  isOpen,
  onClose,
  title = 'Tautkan Berkas Google Drive',
  documentNo = '',
  subjectName = '',
  initialUrl = '',
  initialFolderId = '',
  category = 'SK',
  store,
  currentUser,
  onUpdateStore,
  onSave,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [folderId, setFolderId] = useState(initialFolderId);
  const [folderUrl, setFolderUrl] = useState('');

  useEffect(() => {
    setUrl(initialUrl || '');
    setFolderId(initialFolderId || '');
  }, [initialUrl, initialFolderId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(url.trim(), folderId || undefined, folderUrl || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{title}</h3>
              <p className="text-xs text-slate-400">Pilih folder penyimpanan Google Drive & tautkan link scan dokumen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reference Info Card */}
        {(documentNo || subjectName) && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
            {documentNo && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nomor Berkas / Dokumen:</span>
                <span className="font-bold text-indigo-300 font-mono">{documentNo}</span>
              </div>
            )}
            {subjectName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Subjek / Debitur / Klien:</span>
                <span className="font-semibold text-white truncate max-w-[280px]">{subjectName}</span>
              </div>
            )}
          </div>
        )}

        {/* Google Drive Folder & File Selector */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <GoogleDriveFolderPicker
            store={store}
            currentUser={currentUser}
            onUpdateStore={onUpdateStore}
            selectedFolderId={folderId}
            onSelectFolder={(id, fUrl) => {
              setFolderId(id);
              setFolderUrl(fUrl);
            }}
            valueUrl={url}
            onChangeUrl={setUrl}
            defaultCategory={category}
            label="Folder & Link Dokumen Google Drive"
            helperText="Pilih folder di GDrive, unggah file, dan salin tautan URL berkas."
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-950 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan Tautan Google Drive</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
