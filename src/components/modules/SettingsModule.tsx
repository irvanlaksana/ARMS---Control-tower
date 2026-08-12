import React, { useState, useEffect } from 'react';
import { ARMSStore, createAuditEntry, resetStoreToInitial } from '../../services/armsDataService';
import { User, AppSettings } from '../../types/arms';
import { Settings as SettingsIcon, Database, FileCode, CheckCircle, Save, Upload, RefreshCw, Image as ImageIcon, Trash2 } from 'lucide-react';
import { DEFAULT_MJ_LOGO } from '../../assets/mjLogo';

interface SettingsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
  onOpenSheetsModal: () => void;
  onOpenGASModal: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
  onOpenSheetsModal,
  onOpenGASModal,
}) => {
  const [settings, setSettings] = useState<AppSettings>(store.settings);
  const [savedMsg, setSavedMsg] = useState(false);

  // Synchronize internal state when store changes
  useEffect(() => {
    if (store.settings) {
      setSettings(store.settings);
    }
  }, [store.settings]);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setSettings((prev) => ({ ...prev, companyLogo: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Settings',
      'APP_SETTINGS',
      `Updated ARMS System Settings & Enterprise Profile (${settings.companyName})`
    );

    const updatedStore: ARMSStore = {
      ...store,
      settings: {
        ...settings,
        lastSyncedAt: new Date().toISOString(),
      },
      auditLogs: [audit, ...store.auditLogs],
    };

    onUpdateStore(updatedStore);

    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">ARMS System Settings & Branding Profile</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure Google Sheets Database, Apps Script Endpoint, Company Profile, and Enterprise Logo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGASModal}
            className="flex items-center gap-2 bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-900 transition"
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>Get GAS Code</span>
          </button>
          <button
            onClick={onOpenSheetsModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
          >
            <Database className="w-4 h-4" />
            <span>Setup Google Sheets</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="font-semibold">Pengaturan Sistem & Profil Perusahaan Berhasil Diperbarui dan Direfleksikan ke Dashboard!</div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg">
        {/* Company Logo & Branding Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>1. Logo Perusahaan & Brand Visual (Top Left Header & Sidebar)</span>
          </h3>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-24 h-24 rounded-xl bg-slate-900 border-2 border-amber-500/40 p-2 flex items-center justify-center shadow-inner overflow-hidden">
                <img
                  src={settings.companyLogo || DEFAULT_MJ_LOGO}
                  alt="Company Logo Preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Pratinjau Logo</span>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Foto / Gambar Logo Perusahaan Baru:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File Gambar Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!canEdit}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setSettings((prev) => ({ ...prev, companyLogo: DEFAULT_MJ_LOGO }))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gunakan Logo MJ Shield</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Format yang didukung: PNG, JPG, SVG, WebP. Logo yang diunggah akan langsung muncul di pojok kiri atas Dashboard Header dan Sidebar.
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">URL Gambar Logo (Opsional)</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.companyLogo || ''}
                  onChange={(e) => setSettings({ ...settings, companyLogo: e.target.value })}
                  placeholder="data:image/... atau https://..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Company Profile */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
            2. Enterprise Company Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Name (Nama Perusahaan)</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="e.g. PT MJ Agency Recovery Indonesia"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Phone / Call Center</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyPhone || ''}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Official Email</label>
              <input
                type="email"
                disabled={!canEdit}
                value={settings.companyEmail || ''}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Headquarters Address</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyAddress || ''}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Google Sheets Integration */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
            3. Google Sheets & Apps Script Integration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Spreadsheet ID</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.googleSheetId || ''}
                onChange={(e) => setSettings({ ...settings, googleSheetId: e.target.value })}
                placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Apps Script Web App URL</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.appsScriptWebAppUrl || ''}
                onChange={(e) => setSettings({ ...settings, appsScriptWebAppUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Drive Storage Folder ID</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.googleDriveFolderId || ''}
                onChange={(e) => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
                placeholder="Google Drive Folder ID for document/photo uploads"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Default Agency Fee %</label>
              <input
                type="number"
                disabled={!canEdit}
                value={settings.defaultFeePercent ?? 0}
                onChange={(e) => setSettings({ ...settings, defaultFeePercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-800 gap-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan SELURUH DATA operasional dan menyisakan 1 User Super Admin? Tindakan ini tidak dapat dibatalkan.')) {
                  const cleanStore = resetStoreToInitial();
                  onUpdateStore(cleanStore);
                  alert('Seluruh data operasional berhasil dikosongkan dan disisakan 1 akun Super Admin!');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold rounded-lg transition"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Kosongkan Semua Data (Sisa 1 Super Admin)</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan & Refleksikan Logo</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
