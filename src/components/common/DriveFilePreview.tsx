import React from 'react';
import { ExternalLink, Check, Copy, X, CloudUpload } from 'lucide-react';

interface DriveFilePreviewProps {
  open: boolean;
  onClose: () => void;
  fileUrl?: string; // data: or drive link
  fileName?: string;
  isUploading?: boolean;
  driveFileId?: string;
  webViewLink?: string;
  onUpload?: () => Promise<void> | void;
}

export const DriveFilePreview: React.FC<DriveFilePreviewProps> = ({
  open,
  onClose,
  fileUrl,
  fileName,
  isUploading,
  driveFileId,
  webViewLink,
  onUpload,
}) => {
  if (!open) return null;

  const isDataUrl = typeof fileUrl === 'string' && fileUrl.startsWith('data:');
  const canOpen = !!webViewLink || (!!fileUrl && !isDataUrl);
  const linkToCopy = webViewLink || fileUrl || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkToCopy);
      // small visual feedback could be added by caller
      console.debug('Copied to clipboard', linkToCopy);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
          title="Tutup Preview"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <CloudUpload className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-bold text-white text-base">Preview Dokumen</h3>
            <p className="text-xs text-slate-400">{fileName || 'File'}</p>
          </div>
        </div>

        <div className="bg-slate-950 p-2 border border-slate-800 rounded-lg flex items-center justify-center min-h-[220px]">
          {isDataUrl ? (
            <img src={fileUrl} alt={fileName || 'preview'} className="max-h-[420px] w-auto object-contain rounded border border-slate-800" />
          ) : (
            <div className="text-slate-300 text-sm text-center">
              {fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline">
                  Buka file di tab baru
                </a>
              ) : (
                <div className="text-slate-500">Tidak ada preview. Gunakan tombol Upload jika ini berkas lokal.</div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 font-mono text-slate-300">
          <div>
            <span className="text-slate-500">Drive File ID:</span> {driveFileId || '-'}
          </div>
          <div>
            <span className="text-slate-500">Link / Tautan:</span>
            <div className="break-words text-sm mt-1">{linkToCopy || '-'}</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
          <div className="flex items-center gap-2">
            {onUpload && isDataUrl && (
              <button
                onClick={() => onUpload()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
                title="Upload ke Google Drive"
              >
                <CloudUpload className="w-4 h-4" />
                <span>{isUploading ? 'Mengunggah...' : 'Upload ke Drive'}</span>
              </button>
            )}

            {canOpen && (
              <a
                href={webViewLink || fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka di Google Drive</span>
              </a>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition"
              title="Salin tautan ke clipboard"
            >
              <Copy className="w-4 h-4" />
              <span>Salin Tautan</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriveFilePreview;
