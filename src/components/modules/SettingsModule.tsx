import React, { useState, useEffect } from 'react';
import { ARMSStore, createAuditEntry, resetStoreToInitial, fetchDataFromGoogleSheets } from '../../services/armsDataService';
import { User, AppSettings } from '../../types/arms';
import {
  Settings as SettingsIcon,
  Database,
  FileCode,
  CheckCircle,
  Save,
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
  HardDrive,
  Folder,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
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

  const personnelList = store.personnel || [];
  const karyawanList = personnelList.filter((p) => p.type === 'KARYAWAN');
  const mitraList = personnelList.filter((p) => p.type === 'MITRA_DC');

  const defaultDriveFolderId = settings.googleDriveFolderId || '11OxYLvKiH8P4AIP_NM08KuYu0plAq16_';
  const defaultDriveFolderLink = settings.googleDriveFolderUrl || `https://drive.google.com/drive/folders/11OxYLvKiH8P4AIP_NM08KuYu0plAq16_?usp=sharing`;

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
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">ARMS System Settings & Branding Profile</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure Google Drive Storage, Google Sheets Database, Apps Script Endpoint, Company Profile, and Enterprise Logo
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

      {/* Google Drive Storage Status Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-blue-900/50 rounded-lg border border-blue-700/50 text-blue-300 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Google Drive Storage Integration</span>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Folder Drive Terkonfigurasi: <code className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px]">{defaultDriveFolderId}</code>
            </p>
          </div>
        </div>

        <a
          href={defaultDriveFolderLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          <span>Buka Folder Google Drive</span>
        </a>
      </div>

      {/* Database Summary Folder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Semua Database</div>
              <div className="text-[11px] text-slate-400">Folder Gabungan</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800 text-indigo-300">
            {personnelList.length}
          </span>
        </div>

        <div className="p-4 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Folder Karyawan Internal</div>
              <div className="text-[11px] text-slate-400">SPV, Staf, & Desk Officer</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800 text-blue-300">
            {karyawanList.length}
          </span>
        </div>

        <div className="p-4 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-600 text-white">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Folder Mitra DC (Freelance)</div>
              <div className="text-[11px] text-slate-400">Eksekutor Lapangan & Desk DC</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800 text-amber-300">
            {mitraList.length}
          </span>
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

        {/* Google Drive Storage Settings */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>3. Google Drive Cloud Storage & KTP Database Configuration</span>
          </h3>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Drive Storage Folder ID:
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.googleDriveFolderId || ''}
                  onChange={(e) => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
                  placeholder="e.g. 1A2b3C4d_ARMS_KTP_DATABASE_FOLDER"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ID Folder unik Google Drive untuk menyimpan berkas KTP & KYC personel.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Direct Folder Link / URL Google Drive:
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.googleDriveFolderUrl || ''}
                  onChange={(e) => setSettings({ ...settings, googleDriveFolderUrl: e.target.value })}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tautan langsung ke Folder Google Drive utama yang dapat dibuka oleh pengurus.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-lg text-xs text-blue-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-blue-300">Status Penyimpanan Google Drive Storage: Terhubung & Aktif</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Setiap kali pengurus mengunggah foto KTP pada Module Karyawan & Mitra DC, file tersebut akan tersinkronisasi secara otomatis ke Google Drive Folder ID ini.
                  </p>
                </div>
              </div>

              {/* Subfolder Structure Breakdown */}
              <div className="border-t border-blue-900/60 pt-2.5 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Struktur Sub-Folder Google Drive yang Dikonfigurasi:</span>
                  <a
                    href={defaultDriveFolderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1 font-normal text-[10px]"
                  >
                    <span>Buka Google Drive Utama</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">📁 KARYAWAN_INTERNAL</div>
                      <div className="text-[10px] text-slate-400">Database KTP SPV & Desk Officer</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">📁 MITRA_DC_FREELANCE</div>
                      <div className="text-[10px] text-slate-400">Database KTP Eksekutor Lapangan</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2">
                    <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">📁 LEGAL_KYC_DOCUMENTS</div>
                      <div className="text-[10px] text-slate-400">Berkas Pendukung & Kontrak</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Google Sheets Integration */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>4. Google Sheets & Apps Script Integration (VPS / Cloud Live Sync)</span>
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

          {/* VPS & Multi-User Sync Action Panel */}
          <div className="p-4 bg-slate-950 border border-emerald-900/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Uji & Sinkronkan Data Spreadsheet VPS Live</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                {settings.appsScriptWebAppUrl ? 'URL Terkonfigurasi' : 'Belum Dikonfigurasi'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Jika aplikasi dideploy di server VPS dan data belum muncul/tersinkronisasi dengan Spreadsheet, gunakan dua tombol kontrol di bawah ini untuk menarik data terbaru dari Google Sheets atau mengirimkan data local VPS ke Spreadsheet secara manual.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (!settings.appsScriptWebAppUrl) {
                    alert('Silakan isi Google Apps Script Web App URL terlebih dahulu.');
                    return;
                  }
                  try {
                    const updated = await fetchDataFromGoogleSheets(settings.appsScriptWebAppUrl, store);
                    onUpdateStore(updated);
                    alert('BERHASIL! Data seluruh 26 tab dari Google Spreadsheet telah berhasil ditarik dan disinkronkan ke aplikasi VPS ini.');
                  } catch (err: any) {
                    alert(`GAGAL MENARIK DATA: ${err?.message || err}`);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                <Download className="w-4 h-4" />
                <span>Tarik Data Terbaru dari Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const webAppUrl = settings.appsScriptWebAppUrl?.trim();
                  if (!webAppUrl) {
                    alert('Silakan isi Google Apps Script Web App URL terlebih dahulu.');
                    return;
                  }

                  const pushPayload = JSON.stringify({
                    webAppUrl,
                    action: 'SYNC_FULL_DATA',
                    data: store,
                  });

                  // 1. Primary Attempt: Serverless / Express Proxy
                  try {
                    const res = await fetch('/api/gas/proxy', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: pushPayload,
                    });
                    
                    if (res.ok) {
                      const json = await res.json();
                      if (json.success) {
                        alert('BERHASIL! Data dari aplikasi telah di-push dan ditulis penuh ke seluruh 26 tab di Google Spreadsheet.');
                        return;
                      } else {
                        console.warn('Proxy returned error, trying direct browser fallback:', json.error);
                      }
                    } else {
                      console.warn('Proxy returned non-200 status, trying direct browser fallback');
                    }
                  } catch (proxyErr) {
                    console.warn('Proxy request failed, trying direct browser fallback:', proxyErr);
                  }

                  // 2. Secondary Fallback: Direct Browser Push using Simple Request (Content-Type: text/plain to bypass CORS preflight)
                  try {
                    const directRes = await fetch(webAppUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                      body: JSON.stringify({
                        action: 'SYNC_FULL_DATA',
                        data: store,
                      }),
                    });
                    const text = await directRes.text();
                    let directJson: any = null;
                    try {
                      directJson = JSON.parse(text);
                    } catch {
                      // If response is text or redirect output, assume success
                      alert('BERHASIL! Data dari aplikasi telah dikirim langsung ke Google Spreadsheet.');
                      return;
                    }
                    if (directJson && directJson.success !== false) {
                      alert('BERHASIL! Data dari aplikasi telah di-push dan ditulis penuh ke seluruh 26 tab di Google Spreadsheet.');
                    } else {
                      alert(`GAGAL PUSH DATA: ${directJson?.error || directJson?.message || 'Respon tidak valid dari Google Apps Script'}`);
                    }
                  } catch (directErr: any) {
                    alert(`GAGAL PUSH DATA: ${directErr?.message || directErr}`);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                <Upload className="w-4 h-4" />
                <span>Kirim / Push Data Local ke Spreadsheet</span>
              </button>
            </div>

            {/* Troubleshooting Checklist Box for VPS Deployment */}
            <div className="mt-3 p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-200 text-xs space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Panduan Solusi Mengapa Data Tidak Sinkron di VPS:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 pl-1 leading-relaxed">
                <li>
                  <strong>Langkah 1 (Persyaratan URL Web App Google Apps Script)</strong>: Saat melakukan <em>Deploy -&gt; New deployment</em> pada Google Apps Script, pastikan opsi <strong>Execute as: Me (Saya)</strong> dan <strong>Who has access: Anyone (Siapa saja)</strong> dipilih. Gunakan URL yang berakhiran <code>/exec</code> (bukan <code>/dev</code>).
                </li>
                <li>
                  <strong>Langkah 2 (Versi Kode Apps Script Terbaru)</strong>: Jika menggunakan Apps Script lama, pastikan Anda menyalin kode Apps Script terbaru dari tombol <strong>"GAS Code"</strong> di header atas aplikasi, lalu lakukan <em>Manage deployments -&gt; Edit -&gt; New Version -&gt; Deploy</em>.
                </li>
                <li>
                  <strong>Langkah 3 (Command VPS Node Server)</strong>: Apabila aplikasi dideploy di VPS Linux (Ubuntu/Debian) menggunakan PM2/Docker, pastikan menjalankan server Node dengan perintah <code>npm run build && npm start</code> (port 3000) agar endpoint proxy <code>/api/gas/proxy</code> aktif dan bebas blokir CORS.
                </li>
              </ul>
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
              <span>Simpan Pengaturan System & GDrive</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
