import React, { useState } from 'react';
import { Database, CheckCircle, AlertTriangle, Loader2, X, ExternalLink, FileCode, Server } from 'lucide-react';
import { ARMSStore } from '../../services/armsDataService';

interface SetupSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: ARMSStore;
  onUpdateStore?: (newStore: ARMSStore) => void;
  onOpenGASModal?: () => void;
  currentSheetId?: string;
  onSaveSheetId?: (id: string) => Promise<void>;
  onAutoSetupSheets?: (id: string) => Promise<void>;
}

export const SetupSheetsModal: React.FC<SetupSheetsModalProps> = ({
  isOpen,
  onClose,
  store,
  onUpdateStore,
  onOpenGASModal,
  currentSheetId,
  onSaveSheetId,
  onAutoSetupSheets,
}) => {
  const initialSheetId = store?.settings?.googleSheetId || currentSheetId || '';
  const initialGasUrl = store?.settings?.appsScriptWebAppUrl || '';

  const [sheetIdInput, setSheetIdInput] = useState(initialSheetId);
  const [gasUrlInput, setGasUrlInput] = useState(initialGasUrl);
  const [activeMode, setActiveMode] = useState<'GAS' | 'DIRECT'>(initialGasUrl ? 'GAS' : 'DIRECT');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSetup = async () => {
    setStatusMsg(null);
    setLoading(true);

    try {
      // 1. Google Apps Script Web App URL Mode
      if (activeMode === 'GAS' || gasUrlInput.trim()) {
        const webAppUrl = gasUrlInput.trim();
        if (!webAppUrl) {
          throw new Error('Silakan masukkan URL Web App Google Apps Script.');
        }

        const res = await fetch('/api/gas/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webAppUrl,
            action: 'SETUP_SHEETS',
            data: store,
          }),
        });

        const json = await res.json();
        if (!json.success && json.error) {
          throw new Error(json.error);
        }

        // Also trigger full sync to push current store
        if (store) {
          await fetch('/api/gas/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              webAppUrl,
              action: 'SYNC_FULL_DATA',
              data: store,
            }),
          });
        }

        // Save settings to store
        if (store && onUpdateStore) {
          const updatedStore = {
            ...store,
            settings: {
              ...store.settings,
              appsScriptWebAppUrl: webAppUrl,
              googleSheetId: sheetIdInput.trim() || store.settings.googleSheetId,
            },
          };
          onUpdateStore(updatedStore);
        }

        if (onSaveSheetId && sheetIdInput.trim()) {
          await onSaveSheetId(sheetIdInput.trim());
        }

        setStatusMsg({
          type: 'success',
          text: 'Tersambung ke Google Sheets via Google Apps Script Web App! Seluruh 26 sheet berhasil dikonfigurasi.',
        });
      } else {
        // 2. Direct Spreadsheet ID Mode
        const id = sheetIdInput.trim();
        if (!id) {
          throw new Error('Silakan masukkan Google Spreadsheet ID.');
        }

        if (onAutoSetupSheets) {
          await onAutoSetupSheets(id);
        } else {
          const res = await fetch('/api/sheets/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spreadsheetId: id }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(
              json.error || 'Server Google Auth tidak terkonfigurasi untuk Spreadsheet ID ini. Gunakan metode Google Apps Script Web App!'
            );
          }

          if (store) {
            await fetch('/api/sheets/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ spreadsheetId: id, data: store }),
            });
          }
        }

        if (onSaveSheetId) {
          await onSaveSheetId(id);
        }

        if (store && onUpdateStore) {
          const updatedStore = {
            ...store,
            settings: {
              ...store.settings,
              googleSheetId: id,
            },
          };
          onUpdateStore(updatedStore);
        }

        setStatusMsg({
          type: 'success',
          text: 'Berhasil terhubung ke Google Spreadsheet! Seluruh 26 tab telah dikonfigurasi.',
        });
      }
    } catch (err: any) {
      console.error('Setup error:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal terhubung ke Google Sheets. Periksa URL atau ID dan hak akses.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Hubungkan Google Sheets Database</h2>
              <p className="text-xs text-slate-400">Single Source of Truth Configuration untuk ARMS System</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveMode('GAS')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium text-xs transition ${
                activeMode === 'GAS'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Google Apps Script (Rekomendasi)</span>
            </button>

            <button
              onClick={() => setActiveMode('DIRECT')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium text-xs transition ${
                activeMode === 'DIRECT'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Direct Spreadsheet ID</span>
            </button>
          </div>

          {activeMode === 'GAS' ? (
            <div className="space-y-3">
              <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-900/60 text-indigo-200">
                <p className="font-semibold text-indigo-300 mb-1">Metode Live Google Apps Script Web App:</p>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Buka Google Sheet Anda → Klik <b className="text-white">Extensions</b> → <b className="text-white">Apps Script</b> → Paste kode backend dari tombol GAS Code → Deploy sebagai Web App → Tempelkan Web App URL di bawah ini.
                </p>
                {onOpenGASModal && (
                  <button
                    onClick={onOpenGASModal}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded transition"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Buka Generator Kode Apps Script</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="text"
                  value={gasUrlInput}
                  onChange={(e) => setGasUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Google Spreadsheet ID (Opsional / Referensi)
                </label>
                <input
                  type="text"
                  value={sheetIdInput}
                  onChange={(e) => setSheetIdInput(e.target.value)}
                  placeholder="e.g. 1A2b3C4d5E6f7G8h9I0j..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <p className="font-semibold text-emerald-400 mb-1">Koneksi Langsung Google Spreadsheet ID:</p>
                <p className="text-slate-400 leading-relaxed">
                  Gunakan Google Spreadsheet ID langsung jika server Anda memiliki izin akses API Google Sheets.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Google Spreadsheet ID
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Ditemukan pada URL Google Sheet Anda:{' '}
                  <code className="text-slate-300 bg-slate-800 px-1 rounded">
                    https://docs.google.com/spreadsheets/d/<b>[SPREADSHEET_ID]</b>/edit
                  </code>
                </p>
                <input
                  type="text"
                  value={sheetIdInput}
                  onChange={(e) => setSheetIdInput(e.target.value)}
                  placeholder="e.g. 1A2b3C4d5E6f7G8h9I0j..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {statusMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <span>Buat Google Sheet Baru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium rounded-lg transition"
            >
              Batal
            </button>
            <button
              onClick={handleSetup}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-md transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghubungkan & Memproses 26 Sheet...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Hubungkan & Sinkronkan 26 Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
