import React, { useState, useEffect } from 'react';
import { ARMSStore, createAuditEntry, resetStoreToInitial} from '../../services/armsDataService';
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
  ExternalLink,
  Network
} from 'lucide-react';
import { DEFAULT_MJ_LOGO } from '../../assets/mjLogo';
import { SettingsWorkflowTab } from './SettingsWorkflowTab';
import { SettingsBankBalancesTab } from './SettingsBankBalancesTab';
import { SettingsGDriveDatabaseTab } from './SettingsGDriveDatabaseTab';
import { SettingsDatabaseTab } from './SettingsDatabaseTab';
import { getDatabaseConfigs, markDatabaseSynced } from '../../data/databaseConfig';
import { pushFullStoreToFirebase } from '../../services/firebaseSyncService';
import { pushFullStoreToSupabase } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { DatabaseTabConfig } from '../../types/arms';
import { Landmark, Table2, Link2, PlugZap, FileSpreadsheet } from 'lucide-react';
import {
  resolveActiveSheet,
  saveSettingsToActiveSheet,
  loadSettingsFromActiveSheet,
  extractSpreadsheetId,
  spreadsheetUrlFromId,
  ActiveSpreadsheetInfo,
} from '../../services/settingsSheetService';
import { checkDriveStatus, DriveStatusResult } from '../../lib/drive';
import { getApiMode, isGasBackendActive, setGasWebAppUrl } from '../../lib/gasBridge';

interface SettingsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
  onOpenSheetsModal: () => void;
  onOpenGASModal: () => void;
  onPushFullFirebase?: () => Promise<{ totalItems: number; collectionsCount: number }>;
  onSyncData?: () => Promise<void>;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
  onOpenSheetsModal,
  onOpenGASModal,
  onPushFullFirebase,
  onSyncData,
}) => {
  const [settings, setSettings] = useState<AppSettings>(store.settings);
  const [savedMsg, setSavedMsg] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'GDRIVE_DATABASE' | 'DATABASE' | 'SYSTEM' | 'BANK_BALANCES' | 'WORKFLOW'>('GDRIVE_DATABASE');

  // ---- Target penyimpanan: spreadsheet aktif yang dipakai deploy saat ini ----
  const [activeSheet, setActiveSheet] = useState<ActiveSpreadsheetInfo | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatusResult | null>(null);
  const [sheetMsg, setSheetMsg] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const apiMode = getApiMode();
  const isGasSpreadsheetMode = apiMode !== 'SERVER';

  const refreshActiveSheet = async (nextSettings?: AppSettings) => {
    const [info, drive] = await Promise.all([
      resolveActiveSheet(nextSettings || settings).catch(() => null),
      checkDriveStatus().catch(() => null),
    ]);
    if (info) setActiveSheet(info);
    if (drive) setDriveStatus(drive);
    return info;
  };

  useEffect(() => {
    void refreshActiveSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMode]);

  /** Simpan seluruh pengaturan ke tab Settings pada spreadsheet aktif. */
  const persistSettingsToActiveSheet = async (nextSettings: AppSettings): Promise<boolean> => {
    setIsSavingSettings(true);
    setSheetMsg('Menyimpan pengaturan ke spreadsheet aktif…');
    try {
      const result = await saveSettingsToActiveSheet(nextSettings);
      if (result.spreadsheet) setActiveSheet(result.spreadsheet);
      setSheetMsg(result.ok ? `✅ ${result.message}` : `⚠️ Pengaturan dipakai di sesi ini, tetapi gagal disimpan ke spreadsheet: ${result.message}`);
      return result.ok;
    } catch (err: any) {
      setSheetMsg(`⚠️ Gagal menyimpan ke spreadsheet aktif: ${err?.message || String(err)}`);
      return false;
    } finally {
      setIsSavingSettings(false);
    }
  };

  /** Muat pengaturan dari tab Settings spreadsheet aktif. */
  const handleLoadSettingsFromSheet = async () => {
    if (!canEdit) return;
    setIsLoadingSettings(true);
    setSheetMsg('Membaca pengaturan dari spreadsheet aktif…');
    try {
      const result = await loadSettingsFromActiveSheet(settings);
      if (!result.ok) {
        setSheetMsg(`❌ ${result.message}`);
        return;
      }
      const fromSheet = result.settings || {};
      if (!Object.keys(fromSheet).length) {
        setSheetMsg(`ℹ️ ${result.message}`);
        return;
      }
      const merged: AppSettings = { ...settings, ...fromSheet };
      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Settings',
        'APP_SETTINGS_LOAD',
        `Muat ${Object.keys(fromSheet).length} key pengaturan dari spreadsheet aktif (${result.spreadsheet?.name || ''})`
      );
      setSettings(merged);
      onUpdateStore({ ...store, settings: merged, auditLogs: [audit, ...store.auditLogs] });
      if (result.spreadsheet) setActiveSheet(result.spreadsheet);
      setSheetMsg(`✅ ${result.message}`);
    } catch (err: any) {
      setSheetMsg(`❌ Gagal memuat pengaturan: ${err?.message || String(err)}`);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  /** Uji koneksi ke backend penyimpanan (Apps Script / server). */
  const handleTestConnection = async () => {
    setSheetMsg('Menguji koneksi ke spreadsheet aktif & Google Drive…');
    try {
      const info = await refreshActiveSheet(settings);
      const health = await fetch('/api/health').then((r) => r.json()).catch(() => null);
      const drive = driveStatus?.configured ? 'Drive siap' : 'Drive belum siap';
      setSheetMsg(
        `✅ Koneksi OK — mode ${info?.mode || apiMode}, spreadsheet "${info?.name || '-'}" (${info?.id || '-'}) • ${drive}` +
        (health?.provider ? ` • backend ${health.provider}` : '')
      );
    } catch (err: any) {
      setSheetMsg(`❌ Uji koneksi gagal: ${err?.message || String(err)}`);
    }
  };

  const handlePushFullFirebase = async () => {
    // Spreadsheet aktif tempat deploy ini menyimpan data (otomatis pada mode Apps Script).
    const sheetId = extractSpreadsheetId(activeSheet?.id || settings.googleSheetId || 'arms-control-tower');
    setIsPushing(true);
    setPushStatusMsg(`Sedang menginisialisasi tab dan memicu Push Data Otomatis ke spreadsheet aktif${activeSheet?.name ? ` "${activeSheet.name}"` : ''}...`);
    try {
      // Pakai settings yang baru diketik (ID spreadsheet + kolom database) agar push sesuai kolom terbaru
      const pushStore: ARMSStore = {
        ...store,
        settings: { ...settings, googleSheetId: sheetId, databaseConfig: dbColumns },
      };
      const res = await pushFullStoreToFirebase(pushStore);
      // Supabase hanya dipakai bila backend Apps Script tidak aktif (spreadsheet aktif = sumber utama).
      const supabaseResult = isSupabaseConfigured && !isGasBackendActive() ? await pushFullStoreToSupabase(pushStore) : null;
      if (supabaseResult && !supabaseResult.success) {
        throw new Error(`Supabase: ${supabaseResult.error || 'sinkronisasi gagal'}`);
      }
      const counts: Record<string, number> = {};
      for (const cfg of getDatabaseConfigs(pushStore.settings)) {
        if (cfg.collection === 'settings') continue;
        const items = (pushStore as any)[cfg.collection];
        counts[cfg.collection] = Array.isArray(items) ? items.length : 0;
      }
      const syncedSettings = markDatabaseSynced(pushStore.settings, counts, res.syncedAt || new Date().toISOString());
      onUpdateStore({ ...pushStore, settings: syncedSettings });
      setSettings(syncedSettings);
      setPushStatusMsg(`✅ Sukses! ${res.totalItems} dokumen tersimpan di spreadsheet aktif${supabaseResult ? ' dan Supabase' : ''}.`);
    } catch (err: any) {
      setPushStatusMsg(`❌ Gagal Push Data: ${err.message || String(err)}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Konfigurasi kolom spreadsheet untuk membuat database (sheet column configuration)
  const [dbColumns, setDbColumns] = useState<DatabaseTabConfig[]>(() => getDatabaseConfigs(store.settings));
  const [createColumnMsg, setCreateColumnMsg] = useState('');
  const [isCreatingColumns, setIsCreatingColumns] = useState(false);

  useEffect(() => {
    setDbColumns(getDatabaseConfigs(store.settings));
  }, [store.settings]);

  const updateDbColumn = (collection: string, patch: Partial<DatabaseTabConfig>) => {
    setDbColumns((prev) => prev.map((c) => (c.collection === collection ? { ...c, ...patch } : c)));
  };

  const handleSaveDbColumns = () => {
    if (!canEdit) return;
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Settings',
      'APP_SETTINGS_DB_COLUMNS',
      `Update konfigurasi kolom spreadsheet untuk ${dbColumns.length} database ARMS`
    );
    onUpdateStore({
      ...store,
      settings: { ...settings, databaseConfig: dbColumns },
      auditLogs: [audit, ...store.auditLogs],
    });
    setSettings((prev) => ({ ...prev, databaseConfig: dbColumns }));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleCreateDatabaseColumns = async () => {
    if (!canEdit) return;
    const id = (activeSheet?.id || settings.googleSheetId || 'arms-control-tower').trim();
    setIsCreatingColumns(true);
    setCreateColumnMsg('Membuat seluruh kolom/tab database di spreadsheet aktif...');
    try {
      const resp = await fetch('/api/sheets/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: id,
          tabs: Object.fromEntries(dbColumns.map((c) => [c.collection, c.tabName])),
        }),
      });
      const json = await resp.json();
      if (!json?.success) throw new Error(json?.error || 'Gagal membuat kolom database');
      setCreateColumnMsg(`✅ Berhasil! ${json.sheets?.length || 0} kolom/tab database dibuat & dipastikan tersedia di spreadsheet.`);
      handleSaveDbColumns();
    } catch (err: any) {
      setCreateColumnMsg(`❌ Gagal membuat kolom database: ${err.message || String(err)}`);
    } finally {
      setIsCreatingColumns(false);
    }
  };

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

  /**
   * Simpan "ARMS System Settings & Branding Profile".
   * Seluruh key (profil perusahaan, logo, konfigurasi Google Drive, fee default,
   * konfigurasi tab database, URL Web App Apps Script) ditulis ke tab Settings
   * pada SPREADSHEET AKTIF yang dipakai deploy saat ini.
   */
  const handleSave = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const nextSettings: AppSettings = {
      ...settings,
      googleSheetId: (settings.googleSheetId || activeSheet?.id || '').trim(),
      lastSyncedAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Settings',
      'APP_SETTINGS',
      `Updated ARMS System Settings & Branding Profile (${nextSettings.companyName}) → spreadsheet aktif ${activeSheet?.name || nextSettings.googleSheetId || '-'}`
    );

    const updatedStore: ARMSStore = {
      ...store,
      settings: nextSettings,
      auditLogs: [audit, ...store.auditLogs],
    };

    setSettings(nextSettings);
    onUpdateStore(updatedStore);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 4000);

    // Simpan ke spreadsheet aktif (sumber kebenaran), bukan hanya cache lokal.
    await persistSettingsToActiveSheet(updatedStore.settings);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <SettingsIcon className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">ARMS System Settings & Branding Profile</h2>
          </div>
          <p className="text-xs text-slate-400">
            Seluruh pengaturan &amp; tampilan disimpan pada <b className="text-indigo-300">spreadsheet aktif</b> yang dipakai deploy saat ini
            {activeSheet ? (
              <>
                {' '}— <code className="text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-800">{activeSheet.name}</code>
              </>
            ) : null}
            . Penyimpanan berkas Google Drive tetap aktif (DriveApp / Service Account).
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('GDRIVE_DATABASE')}
          className={`px-3 py-2 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'GDRIVE_DATABASE'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            <span>📁 Direktori GDrive & Database Karyawan / Multifinance</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DATABASE')}
          className={`px-3 py-2 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'DATABASE'
              ? 'border-violet-500 text-violet-400 bg-violet-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Table2 className="w-3.5 h-3.5 text-violet-400" />
            <span>Database & Sheet</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SYSTEM')}
          className={`px-3 py-2 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'SYSTEM'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Pengaturan Sistem & Google Sheets</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BANK_BALANCES')}
          className={`px-3 py-2 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'BANK_BALANCES'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5" />
            <span>Saldo Bank & Modal Kerja</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('WORKFLOW')}
          className={`px-3 py-2 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'WORKFLOW'
              ? 'border-purple-500 text-purple-400 bg-purple-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Network className="w-3.5 h-3.5" />
            <span>Alur Kerja (Workflow)</span>
          </div>
        </button>
      </div>

      {activeTab === 'GDRIVE_DATABASE' && (
        <SettingsGDriveDatabaseTab
          store={store}
          currentUser={currentUser}
          onUpdateStore={onUpdateStore}
        />
      )}

      {activeTab === 'DATABASE' && (
        <SettingsDatabaseTab
          store={store}
          currentUser={currentUser}
          onUpdateStore={onUpdateStore}
          onPushFullFirebase={onPushFullFirebase}
        />
      )}

      <div className={activeTab === 'SYSTEM' ? 'space-y-4' : 'hidden'}>
      {/* ===== Spreadsheet Aktif & Deployment Google Apps Script ===== */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-950 border border-indigo-800/70 rounded-xl p-3.5 space-y-2.5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <div className="p-2.5 bg-indigo-900/60 rounded-xl border border-indigo-700/60 text-indigo-300 shrink-0 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-white text-base">Spreadsheet Aktif — Sumber Penyimpanan Deploy Ini</h3>
                <span
                  className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${
                    apiMode === 'GAS_HTML'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : apiMode === 'GAS_URL'
                      ? 'bg-teal-950 text-teal-300 border-teal-700'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {apiMode === 'GAS_HTML'
                    ? 'GOOGLE APPS SCRIPT (TERIKAT)'
                    : apiMode === 'GAS_URL'
                    ? 'GOOGLE APPS SCRIPT (WEB APP URL)'
                    : 'SERVER API'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-normal">
                Semua pengaturan pada halaman ini (Branding Profile, logo, konfigurasi Google Drive, kolom database,
                fee default) disimpan sebagai baris <code className="text-indigo-300">key/value</code> pada tab{' '}
                <b className="text-white">{activeSheet?.settingsTab || 'Settings'}</b> di spreadsheet aktif.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={activeSheet?.url || spreadsheetUrlFromId(settings.googleSheetId || '')}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                activeSheet?.url || settings.googleSheetId
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'pointer-events-none bg-slate-900 text-slate-600 border-slate-800'
              }`}
            >
              <ExternalLink className="w-3 h-3 text-indigo-400" />
              Buka Spreadsheet
            </a>
            <button
              type="button"
              disabled={!canEdit || isLoadingSettings}
              onClick={handleLoadSettingsFromSheet}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition"
            >
              <Download className={`w-3 h-3 ${isLoadingSettings ? 'animate-bounce' : ''}`} />
              {isLoadingSettings ? 'Memuat…' : 'Muat dari Spreadsheet'}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition"
            >
              <PlugZap className="w-3 h-3 text-amber-400" />
              Uji Koneksi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: 'Nama Spreadsheet', value: activeSheet?.name || settings.googleSheetId || '—' },
            { label: 'Spreadsheet ID', value: activeSheet?.id || settings.googleSheetId || '—', mono: true },
            { label: 'Tab Pengaturan', value: activeSheet?.settingsTab || 'Settings', mono: true },
            {
              label: apiMode === 'SERVER' ? 'Akun Service Account' : 'Akun Deploy / Drive',
              value: activeSheet?.driveUser || activeSheet?.ownerEmail || driveStatus?.driveUser || driveStatus?.serviceAccountEmail || '—',
              mono: true,
            },
          ].map((item) => (
            <div key={item.label} className="bg-slate-950/70 border border-slate-800 rounded-lg p-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{item.label}</div>
              <div className={`text-[11px] text-slate-200 break-all ${item.mono ? 'font-mono' : 'font-semibold'}`}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* URL Web App Apps Script (dipakai bila aplikasi di-host terpisah) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Link2 className="w-3 h-3 text-indigo-400" />
            URL Web App Google Apps Script (opsional — wajib bila aplikasi di-host di luar Apps Script):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              disabled={!canEdit}
              value={settings.appsScriptWebAppUrl || ''}
              onChange={(e) => setSettings({ ...settings, appsScriptWebAppUrl: e.target.value.trim() })}
              onBlur={() => setGasWebAppUrl(settings.appsScriptWebAppUrl || '')}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            {canEdit && (
              <button
                type="button"
                disabled={isSavingSettings}
                onClick={() => {
                  setGasWebAppUrl(settings.appsScriptWebAppUrl || '');
                  void handleSave();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
              >
                <Save className="w-3 h-3" />
                Simpan URL
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            {apiMode === 'GAS_HTML'
              ? 'Aplikasi sedang berjalan di dalam Web App Apps Script — semua penyimpanan otomatis mengarah ke spreadsheet aktif, URL ini tidak diperlukan.'
              : 'Isi URL deployment berakhiran /exec (Execute as: Me • Who has access: Anyone) agar aplikasi yang di-host terpisah menyimpan data ke spreadsheet aktif Apps Script.'}
          </p>
        </div>

        {sheetMsg && (
          <div
            className={`p-2.5 rounded-lg border text-xs font-semibold ${
              sheetMsg.startsWith('✅')
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
                : sheetMsg.startsWith('❌')
                ? 'bg-rose-950/90 text-rose-200 border-rose-700'
                : 'bg-indigo-950/90 text-indigo-200 border-indigo-700'
            }`}
          >
            {sheetMsg}
          </div>
        )}
      </div>

      {/* Firebase Database Push & Auto-Table Creation Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-800/80 rounded-xl p-3.5 shadow-lg space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <div className="p-2.5 bg-emerald-900/60 rounded-xl border border-emerald-700/60 text-emerald-300 shrink-0 shadow-inner">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Spreadsheet Aktif &amp; Push Data Otomatis</h3>
                <span className="px-2 py-0.5 bg-emerald-900/80 text-emerald-200 border border-emerald-700 text-[10px] font-bold rounded-full animate-pulse">
                  ONLINE LIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-normal">
                Database Target:{' '}
                <code className="text-emerald-300 bg-slate-950 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-800">
                  {activeSheet?.name || settings.googleSheetId || 'spreadsheet aktif (otomatis)'}
                </code>
                {activeSheet?.source ? (
                  <span className="ml-1.5 text-[10px] text-slate-500">sumber: {activeSheet.source}</span>
                ) : null}
              </p>
              <div className="mt-1.5 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Spreadsheet Aktif (ID / URL Google Sheets):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    disabled={!canEdit}
                    readOnly={apiMode === 'GAS_HTML'}
                    title={apiMode === 'GAS_HTML' ? 'Otomatis terikat pada spreadsheet tempat Apps Script ini di-deploy' : undefined}
                    value={apiMode === 'GAS_HTML' && activeSheet?.id ? activeSheet.id : settings.googleSheetId || ''}
                    onChange={(e) => setSettings({ ...settings, googleSheetId: extractSpreadsheetId(e.target.value) })}
                    placeholder="1AbCdefGhIjKlMnOpQrStUvWxYz0123456789 atau https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 read-only:opacity-70"
                  />
                  <div className="flex items-center gap-2">
                    <a
                      href={activeSheet?.url || spreadsheetUrlFromId(settings.googleSheetId || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        activeSheet?.url || spreadsheetUrlFromId(settings.googleSheetId || '')
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'pointer-events-none bg-slate-900 text-slate-600 border border-slate-800'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                      Buka
                    </a>
                    {canEdit && (
                      <button
                        type="button"
                        disabled={isSavingSettings}
                        onClick={() => {
                          const conf = window.confirm('Simpan spreadsheet ini sebagai database aktif ARMS (semua pengaturan ikut tersimpan di tab Settings)?');
                          if (!conf) return;
                          void handleSave();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                      >
                        <Save className="w-3 h-3" />
                        Simpan
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  {apiMode === 'GAS_HTML'
                    ? 'Otomatis terikat pada spreadsheet tempat Apps Script ini di-deploy — tidak perlu diisi manual.'
                    : 'Tempel ID atau URL spreadsheet tujuan. Simpan, lalu klik '}
                  {apiMode === 'GAS_HTML' ? null : <b>Push Data Otomatis</b>}
                  {apiMode === 'GAS_HTML' ? null : ' untuk membuat dan mengisi seluruh tab database pada spreadsheet aktif.'}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Klik tombol di bawah untuk membuat seluruh tab dan memicu push data penuh ke spreadsheet aktif.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isPushing}
              onClick={handlePushFullFirebase}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-950/50 border border-emerald-400/30 transition transform active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin text-amber-300' : 'text-emerald-200'}`} />
              <span>{isPushing ? 'Mengirim & Membuat Tab...' : '🚀 Push Data Otomatis & Buat Tab'}</span>
            </button>
          </div>
        </div>

        {pushStatusMsg && (
          <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
            pushStatusMsg.startsWith('✅')
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
              : pushStatusMsg.startsWith('❌')
              ? 'bg-rose-950/90 text-rose-200 border-rose-700'
              : 'bg-indigo-950/90 text-indigo-200 border-indigo-700 animate-pulse'
          }`}>
            <span>{pushStatusMsg}</span>
          </div>
        )}

        {/* Kolom Spreadsheet untuk Membuat Database (sheet column configuration) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Table2 className="w-3.5 h-3.5 text-emerald-400" />
                Kolom Spreadsheet untuk Membuat Database
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Atur nama tab/sheet tiap database ARMS. Kolom ini dipakai otomatis oleh <b>Push Data Otomatis</b> dan
                tombol <b>Buat Kolom Database</b> di bawah.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canEdit}
                onClick={handleSaveDbColumns}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
              >
                <Save className="w-3 h-3" />
                Simpan Kolom
              </button>
              <button
                type="button"
                disabled={!canEdit || isCreatingColumns}
                onClick={handleCreateDatabaseColumns}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
              >
                <Database className={`w-3 h-3 ${isCreatingColumns ? 'animate-pulse' : ''}`} />
                {isCreatingColumns ? 'Membuat...' : 'Buat Kolom Database'}
              </button>
            </div>
          </div>

          {createColumnMsg && (
            <div className={`p-2 rounded-lg border text-[11px] font-semibold ${
              createColumnMsg.startsWith('✅')
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700'
                : createColumnMsg.startsWith('❌')
                ? 'bg-rose-950/80 text-rose-200 border-rose-700'
                : 'bg-indigo-950/80 text-indigo-200 border-indigo-700'
            }`}>
              {createColumnMsg}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto thin-scroll rounded-lg border border-slate-800">
            <table className="w-full text-left text-[11px] text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold sticky top-0">
                <tr>
                  <th className="p-2 w-6">No</th>
                  <th className="p-2">Database</th>
                  <th className="p-2">Nama Kolom / Tab di Spreadsheet</th>
                  <th className="p-2 text-center">Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dbColumns.map((cfg, idx) => {
                  const isSettings = cfg.collection === 'settings';
                  return (
                    <tr key={cfg.collection} className="bg-slate-950/40 hover:bg-slate-900/40">
                      <td className="p-2 text-slate-500 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="p-2">
                        <div className="font-semibold text-slate-200">{cfg.label}</div>
                        <div className="text-[10px] text-slate-500 font-mono">collection: {cfg.collection}</div>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          disabled={!canEdit || isSettings}
                          value={cfg.tabName}
                          onChange={(e) => updateDbColumn(cfg.collection, { tabName: e.target.value })}
                          className="w-full min-w-[130px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {isSettings ? (
                          <span className="text-[10px] text-slate-500">Selalu</span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => updateDbColumn(cfg.collection, { enabled: !cfg.enabled })}
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border transition disabled:opacity-40 ${
                              cfg.enabled
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {cfg.enabled ? 'ON' : 'OFF'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Google Drive Storage Status Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-800/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-start sm:items-center gap-2">
          <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700/50 text-blue-300 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Google Drive Storage Integration</span>
              <span
                className={`px-2 py-0.5 border text-[10px] font-semibold rounded-full flex items-center gap-1 ${
                  driveStatus?.configured
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}
              >
                <CheckCircle2 className={`w-3 h-3 ${driveStatus?.configured ? 'text-emerald-400' : 'text-amber-400'}`} />
                {driveStatus?.configured ? 'Connected' : 'Perlu Dicek'}
              </span>
              {driveStatus?.mode ? (
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold rounded-full">
                  {driveStatus.mode}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Folder Drive Terkonfigurasi: <code className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px]">{defaultDriveFolderId}</code>
              {driveStatus?.rootFolderName ? <span className="ml-1.5 text-slate-400">({driveStatus.rootFolderName})</span> : null}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Konfigurasi folder ini disimpan pada tab <b className="text-slate-300">{activeSheet?.settingsTab || 'Settings'}</b> spreadsheet aktif
              {driveStatus?.driveUser ? <> • akses Drive sebagai <code className="text-slate-300 font-mono">{driveStatus.driveUser}</code></> : null}
            </p>
          </div>
        </div>

        <a
          href={defaultDriveFolderLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0"
        >
          <ExternalLink className="w-3 h-3 text-blue-400" />
          <span>Buka Folder Google Drive</span>
        </a>
      </div>

      {/* Database Summary Folder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Semua Database</div>
              <div className="text-[11px] text-slate-400">Folder Gabungan</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 text-indigo-300">
            {personnelList.length}
          </span>
        </div>

        <div className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Folder Karyawan Internal</div>
              <div className="text-[11px] text-slate-400">SPV, Staf, & Desk Officer</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 text-blue-300">
            {karyawanList.length}
          </span>
        </div>

        <div className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-600 text-white">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Folder Mitra DC (Freelance)</div>
              <div className="text-[11px] text-slate-400">Eksekutor Lapangan & Desk DC</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-300">
            {mitraList.length}
          </span>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="font-semibold">
            Pengaturan Sistem &amp; Profil Perusahaan berhasil diperbarui, disimpan ke tab {activeSheet?.settingsTab || 'Settings'} spreadsheet aktif,
            dan direfleksikan ke Dashboard!
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-lg">
        {/* Company Logo & Branding Section */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-1.5 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>1. Logo Perusahaan & Brand Visual (Top Left Header & Sidebar)</span>
          </h3>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-24 h-24 rounded-xl bg-slate-900 border-2 border-amber-500/40 p-2 flex items-center justify-center shadow-inner overflow-hidden">
                <img
                  src={settings.companyLogo || DEFAULT_MJ_LOGO}
                  alt="Company Logo Preview"
                  data-no-media-preview
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Pratinjau Logo</span>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                  Upload Foto / Gambar Logo Perusahaan Baru:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition">
                    <Upload className="w-3 h-3" />
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium rounded-lg transition"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    <span>Gunakan Logo MJ Shield</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
                  Format yang didukung: PNG, JPG, SVG, WebP. Logo yang diunggah akan langsung muncul di pojok kiri atas Dashboard Header dan Sidebar.
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">URL Gambar Logo (Opsional)</label>
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
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-1.5">
            2. Enterprise Company Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Company Name (Nama Perusahaan)</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="e.g. PT MJ Agency Recovery Indonesia"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Company Phone / Call Center</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyPhone || ''}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Company Official Email</label>
              <input
                type="email"
                disabled={!canEdit}
                value={settings.companyEmail || ''}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Headquarters Address</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyAddress || ''}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Google Drive Storage Settings */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-1.5 flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>3. Google Drive Cloud Storage &amp; KTP Database Configuration</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
              Fitur tidak berubah — hanya cara simpannya: konfigurasi Drive disimpan di spreadsheet aktif, berkas fisik tetap di Google Drive.
            </span>
            <button
              type="button"
              onClick={async () => {
                setSheetMsg('Memeriksa akses Google Drive…');
                const status = await checkDriveStatus();
                setDriveStatus(status);
                setSheetMsg(
                  status.configured
                    ? `✅ Google Drive siap (${status.mode || 'DriveApp'}) sebagai ${status.driveUser || status.serviceAccountEmail || 'akun deploy'}.`
                    : '⚠️ Google Drive belum siap. Periksa izin folder master atau isi Folder ID di bawah.'
                );
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold transition"
            >
              <PlugZap className="w-3 h-3 text-blue-400" />
              Uji Akses GDrive
            </button>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                  Google Drive Storage Folder ID:
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.googleDriveFolderId || ''}
                  onChange={(e) => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
                  placeholder="e.g. 1A2b3C4d_ARMS_KTP_DATABASE_FOLDER"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ID Folder unik Google Drive untuk menyimpan berkas KTP & KYC personel.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                  Direct Folder Link / URL Google Drive:
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.googleDriveFolderUrl || ''}
                  onChange={(e) => setSettings({ ...settings, googleDriveFolderUrl: e.target.value })}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tautan langsung ke Folder Google Drive utama yang dapat dibuka oleh pengurus.
                </p>
              </div>
            </div>

            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-xs text-blue-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-blue-300">
                    Status Penyimpanan Google Drive Storage:{' '}
                    {driveStatus?.configured ? 'Terhubung & Aktif' : 'Perlu Diperiksa'}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Setiap kali pengurus mengunggah foto KTP atau SPPI pada Module Karyawan & Mitra DC, file tersebut akan tersinkronisasi secara otomatis ke Google Drive sesuai pemetaan folder di bawah.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {apiMode === 'SERVER'
                      ? 'Backend: Service Account Google Drive (GOOGLE_SERVICE_ACCOUNT_JSON).'
                      : 'Backend: Google Apps Script (DriveApp) memakai akun deploy — tanpa Service Account.'}{' '}
                    {driveStatus?.instructions ? driveStatus.instructions : ''}
                  </p>
                </div>
              </div>

              {/* Subfolder Structure Breakdown */}
              <div className="border-t border-blue-900/60 pt-2.5 space-y-1.5">
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
                  <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">📁 KARYAWAN_INTERNAL</div>
                      <div className="text-[10px] text-slate-400">Database KTP SPV & Desk Officer</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">📁 MITRA_DC_FREELANCE</div>
                      <div className="text-[10px] text-slate-400">Database KTP Eksekutor Lapangan</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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

        {/* Default Settings */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-1.5 flex items-center gap-2">
            <SettingsIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>4. Pengaturan Sistem Lainnya</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Default Agency Fee %</label>
              <input
                type="number"
                disabled={!canEdit}
                value={settings.defaultFeePercent ?? 0}
                onChange={(e) => setSettings({ ...settings, defaultFeePercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan SELURUH DATA operasional dan menyisakan 1 User Super Admin? Tindakan ini tidak dapat dibatalkan.')) {
                  const cleanStore = resetStoreToInitial();
                  onUpdateStore(cleanStore);
                  alert('Seluruh data operasional berhasil dikosongkan dan disisakan 1 akun Super Admin!');
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Kosongkan Semua Data (Sisa 1 Super Admin)</span>
            </button>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-md transition"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingSettings ? 'animate-pulse' : ''}`} />
              <span>{isSavingSettings ? 'Menyimpan ke Spreadsheet Aktif…' : 'Simpan Pengaturan ke Spreadsheet Aktif'}</span>
            </button>
          </div>
        )}
      </form>
      </div>
      
      {activeTab === 'BANK_BALANCES' && (
        <SettingsBankBalancesTab
          store={store}
          currentUser={currentUser}
          onUpdateStore={onUpdateStore}
        />
      )}

      {activeTab === 'WORKFLOW' && <SettingsWorkflowTab />}
    </div>
  );
};
