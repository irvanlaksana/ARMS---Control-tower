import React, { useEffect, useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, DatabaseTabConfig } from '../../types/arms';
import { getDatabaseConfigs, markDatabaseSynced } from '../../data/databaseConfig';
import {
  pushFullStoreToFirestore,
  fetchStoreFromFirestore,
  firestoreProjectId,
  FirestoreSyncResult,
} from '../../services/firestoreService';
import { setupGoogleSheets, pushToGoogleSheets } from '../../services/googleSheetsService';
import { STORE_TO_FIRESTORE_COLLECTION } from '../../utils/firestoreAdapter';
import {
  Database,
  Table2,
  CheckCircle2,
  Save,
  RefreshCw,
  ExternalLink,
  FolderTree,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  Power,
  PowerOff,
  Zap,
  Server,
} from 'lucide-react';

interface SettingsDatabaseTabProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
  onPushFullFirebase?: () => Promise<{ totalItems: number; collectionsCount: number }>;
}

const canEditFn = (currentUser: User) => currentUser.role === 'SUPER_ADMIN_OPS';

/** Ambil Google Spreadsheet ID (mendukung tempelan URL penuh). */
function normalizeSheetId(raw: string): string {
  const trimmed = (raw || '').trim();
  const m = trimmed.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : trimmed;
}

export const SettingsDatabaseTab: React.FC<SettingsDatabaseTabProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const canEdit = canEditFn(currentUser);
  const [configs, setConfigs] = useState<DatabaseTabConfig[]>(() => getDatabaseConfigs(store.settings));
  const [sheetId, setSheetId] = useState(store.settings?.googleSheetId || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [setupMsg, setSetupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // Firestore states
  const [isPushingFirestore, setIsPushingFirestore] = useState(false);
  const [isFetchingFirestore, setIsFetchingFirestore] = useState(false);
  const [firestoreMsg, setFirestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setConfigs(getDatabaseConfigs(store.settings));
    setSheetId(store.settings?.googleSheetId || '');
  }, [store.settings]);

  const updateConfig = (collection: string, patch: Partial<DatabaseTabConfig>) => {
    setConfigs((prev) => prev.map((c) => (c.collection === collection ? { ...c, ...patch } : c)));
  };

  const saveConfig = (extraSheetId?: string) => {
    if (!canEdit) return;
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Database_Config',
      'APP_SETTINGS_DATABASE',
      `Update konfigurasi database untuk ${configs.length} koleksi ARMS`
    );
    onUpdateStore({
      ...store,
      settings: {
        ...store.settings,
        googleSheetId: (extraSheetId ?? sheetId).trim(),
        databaseConfig: configs,
      },
      auditLogs: [audit, ...store.auditLogs],
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  // Push to Firestore (database utama)
  const handlePushFirestore = async () => {
    setIsPushingFirestore(true);
    setFirestoreMsg({ ok: true, text: 'Sedang mengirim & menyinkronkan seluruh 30 koleksi ke database Google Firestore...' });
    try {
      const res: FirestoreSyncResult = await pushFullStoreToFirestore(store);
      if (res.warnings?.length) {
        console.warn('[Firestore push] warnings:', res.warnings);
      }
      if (res.success) {
        const warnNote = res.warnings?.length
          ? ` (${res.warnings.length} catatan penyesuaian data, lihat console browser)`
          : '';
        setFirestoreMsg({
          ok: true,
          text: `✅ Sukses! ${res.totalItems} dokumen di ${res.collectionsCount} koleksi berhasil dikirim ke Google Firestore (project ${firestoreProjectId}).${warnNote}`,
        });
        const audit = createAuditEntry(
          currentUser.username,
          currentUser.role,
          'UPDATE',
          'Firestore_Sync',
          'ALL_COLLECTIONS',
          `Push penuh ${res.totalItems} dokumen ke ${res.collectionsCount} koleksi Firestore`
        );
        onUpdateStore({
          ...store,
          settings: {
            ...store.settings,
            lastSyncedAt: res.syncedAt,
          },
          auditLogs: [audit, ...store.auditLogs],
        });
      } else {
        console.error('[Firestore push] errors:', res.errors);
        const list = res.errors || [];
        const preview = list.slice(0, 3).join(' | ');
        const more = list.length > 3 ? ` (+${list.length - 3} error lain, lihat console browser)` : '';
        setFirestoreMsg({
          ok: false,
          text:
            `❌ Gagal push ke Firestore: ${preview || res.error || 'Terjadi kesalahan tidak diketahui.'}${more}` +
            (res.totalItems > 0 ? ` — ${res.totalItems} dokumen lain tetap berhasil tersimpan.` : ''),
        });
      }
    } catch (err: any) {
      setFirestoreMsg({ ok: false, text: `❌ Gagal push ke Firestore: ${err.message || String(err)}` });
    } finally {
      setIsPushingFirestore(false);
    }
  };

  // Fetch from Firestore (database utama)
  const handleFetchFirestore = async () => {
    setIsFetchingFirestore(true);
    setFirestoreMsg({ ok: true, text: 'Sedang mengambil data terbaru dari database Google Firestore...' });
    try {
      const refreshed = await fetchStoreFromFirestore(store);
      onUpdateStore(refreshed);
      setFirestoreMsg({
        ok: true,
        text: '✅ Sukses mengambil data terbaru dari Google Firestore!',
      });
    } catch (err: any) {
      setFirestoreMsg({ ok: false, text: `❌ Gagal mengambil data: ${err.message || String(err)}` });
    } finally {
      setIsFetchingFirestore(false);
    }
  };

  const handleSetupSheets = async () => {
    if (!canEdit) return;
    const id = normalizeSheetId(sheetId);
    if (!id) {
      setSetupMsg({ ok: false, text: 'Masukkan Google Spreadsheet ID terlebih dahulu.' });
      return;
    }
    setIsSettingUp(true);
    setSetupMsg({ ok: true, text: 'Sedang membuat/memverifikasi seluruh tab database di Google Sheets...' });
    try {
      const result = await setupGoogleSheets(id, Object.fromEntries(configs.map((c) => [c.collection, c.tabName])));
      if (!result?.success) {
        throw new Error(result?.error || 'Gagal membuat sheet database');
      }
      setSetupMsg({
        ok: true,
        text: `✅ Berhasil! ${result.sheets?.length || 0} tab/sheet database tersedia di Google Sheets.`,
      });
      saveConfig(id);
    } catch (err: any) {
      setSetupMsg({ ok: false, text: `❌ Gagal membuat sheet: ${err.message || String(err)}` });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handlePushAll = async () => {
    const id = normalizeSheetId(sheetId);
    if (!id) {
      setSetupMsg({ ok: false, text: 'Masukkan Google Spreadsheet ID terlebih dahulu sebelum push (database utama tetap Google Firestore).' });
      return;
    }
    setIsPushing(true);
    setSetupMsg({ ok: true, text: 'Sedang mengirim data seluruh database aktif: Google Firestore (utama) + Google Sheets (ekspor)...' });
    try {
      const pushStore: ARMSStore = {
        ...store,
        settings: {
          ...store.settings,
          googleSheetId: id,
          databaseConfig: configs,
        },
      };
      // 1. Database UTAMA: Google Firestore
      const firestoreResult = await pushFullStoreToFirestore(pushStore);
      if (!firestoreResult.success) {
        throw new Error(`Firestore: ${firestoreResult.error || 'sinkronisasi gagal'}`);
      }
      // 2. Ekspor opsional: Google Sheets
      let sheetsTotal = 0;
      try {
        const sheetsResult = await pushToGoogleSheets(pushStore);
        sheetsTotal = sheetsResult.totalItems;
      } catch (sheetErr: any) {
        console.warn('Ekspor Google Sheets gagal (non-fatal):', sheetErr?.message || sheetErr);
      }
      const counts: Record<string, number> = {};
      for (const cfg of getDatabaseConfigs(pushStore.settings)) {
        if (cfg.collection === 'settings') continue;
        const items = (pushStore as any)[cfg.collection];
        counts[cfg.collection] = Array.isArray(items) ? items.length : 0;
      }
      if (canEdit) {
        const syncedSettings = markDatabaseSynced(pushStore.settings, counts, firestoreResult.syncedAt);
        onUpdateStore({ ...pushStore, settings: syncedSettings });
      }
      setSetupMsg({
        ok: true,
        text: `✅ Sukses! ${firestoreResult.totalItems} dokumen tersimpan di Google Firestore${sheetsTotal ? ` dan ${sheetsTotal} dokumen diekspor ke Google Sheets` : ''}.`,
      });
    } catch (err: any) {
      setSetupMsg({ ok: false, text: `❌ Gagal push: ${err.message || String(err)}` });
    } finally {
      setIsPushing(false);
    }
  };

  const connectedCount = configs.filter((c) => c.enabled || c.collection === 'settings').length;
  const spreadsheetUrl = normalizeSheetId(sheetId)
    ? `https://docs.google.com/spreadsheets/d/${normalizeSheetId(sheetId)}/edit?usp=sharing`
    : '';

  // Calculate total items in store
  const totalStoreItems = Object.keys(store).reduce((acc, key) => {
    if (key === 'settings') return acc + 1;
    const val = (store as any)[key];
    return acc + (Array.isArray(val) ? val.length : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* 1. FIRESTORE (GOOGLE) CLOUD DATABASE CONTROL BANNER */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/80 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-xl shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base">Google Firestore Cloud Database Control</h3>
                <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold rounded-full animate-pulse">
                  ONLINE LIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-normal">
                Database utama ARMS. Seluruh 30 koleksi (Cases, Personnel, Payments, SK, Assets, Ledger, DLL) tersimpan &amp; tersinkron otomatis di Google Cloud Firestore.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1.5 bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-[11px] font-bold rounded-full font-mono">
              {totalStoreItems} Total Dokumen Siap Push
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Project Firebase:</span>
                <span className="font-mono text-emerald-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {firestoreProjectId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ✅ Konfigurasi Firebase tertanam di aplikasi — database &amp; auth Google aktif otomatis.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isFetchingFirestore}
                onClick={handleFetchFirestore}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingFirestore ? 'animate-spin' : ''}`} />
                <span>{isFetchingFirestore ? 'Menarik...' : 'Tarik dari Firestore'}</span>
              </button>

              <button
                type="button"
                disabled={isPushingFirestore}
                onClick={handlePushFirestore}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/30"
              >
                <Zap className={`w-3.5 h-3.5 ${isPushingFirestore ? 'animate-bounce' : ''}`} />
                <span>{isPushingFirestore ? 'Mengirim ke Firestore...' : '🚀 Push Data Otomatis ke Firestore'}</span>
              </button>
            </div>
          </div>

          {firestoreMsg && (
            <div
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                firestoreMsg.ok
                  ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
                  : 'bg-rose-950/90 text-rose-200 border-rose-700'
              }`}
            >
              {firestoreMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              <span>{firestoreMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. GOOGLE SHEETS EXPORT CONTROL (opsional) */}
      <div className="bg-gradient-to-r from-violet-950/70 via-slate-900 to-indigo-950/70 border border-violet-800/70 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <div className="p-2.5 bg-violet-600/15 border border-violet-500/30 text-violet-300 rounded-xl shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Google Sheets Export &amp; Database Control <span className="text-[10px] font-bold text-violet-300 bg-violet-950 border border-violet-700 px-1.5 py-0.5 rounded-full ml-1">OPSIONAL</span></h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                Ekspor laporan ke Google Sheets (via Service Account) &amp; atur status aktif tiap database. Database utama tetap Google Firestore.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1.5 bg-violet-950/80 border border-violet-700 text-violet-200 text-[11px] font-bold rounded-full">
              {connectedCount}/{configs.length} Database Aktif
            </span>
            <a
              href={spreadsheetUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                spreadsheetUrl
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'pointer-events-none bg-slate-900 text-slate-600 border border-slate-800'
              }`}
            >
              <ExternalLink className="w-3 h-3 text-violet-400" />
              Buka Spreadsheet
            </a>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                Google Spreadsheet ID (tujuan ekspor laporan):
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="1AbCdefGhIjKlMnOpQrStUvWxYz0123456789"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Diambil dari URL: <span className="text-slate-400 font-mono">docs.google.com/spreadsheets/d/&lt;ID&gt;/edit</span> — spreadsheet harus di-share (Editor) dengan email Service Account Google.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                disabled={!canEdit || isSettingUp}
                onClick={handleSetupSheets}
                className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-lg"
              >
                {isSettingUp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                {isSettingUp ? 'Membuat Sheet...' : 'Buat Sheet Database'}
              </button>
              <button
                type="button"
                disabled={!canEdit || isPushing}
                onClick={handlePushAll}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                {isPushing ? 'Mengirim...' : 'Push ke Firestore + Sheets'}
              </button>
            </div>
          </div>

          {setupMsg && (
            <div
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                setupMsg.ok
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700'
                  : 'bg-rose-950/80 text-rose-200 border-rose-700'
              }`}
            >
              {setupMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
              <span>{setupMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {savedMsg && (
        <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Konfigurasi database tersimpan &amp; akan disinkronkan otomatis.
        </div>
      )}

      {/* 3. TABLE OF ALL DATABASES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderTree className="w-3.5 h-3.5 text-violet-400" />
            <h4 className="text-sm font-bold text-white">Daftar Koleksi Database ARMS (30 Koleksi)</h4>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
              {configs.length} koleksi
            </span>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => saveConfig()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
            >
              <Save className="w-3 h-3" />
              Simpan Konfigurasi
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3 w-6">No</th>
                <th className="p-3">Database</th>
                <th className="p-3">Koleksi Firestore</th>
                <th className="p-3">Tab di Spreadsheet</th>
                <th className="p-3 text-center">Jumlah Data</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Sync Terakhir</th>
                <th className="p-3 text-center">Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {configs.map((cfg, idx) => {
                const isSettings = cfg.collection === 'settings';
                const items = (store as any)[cfg.collection];
                const recordCount = isSettings ? 1 : Array.isArray(items) ? items.length : 0;
                const isDisabled = isSettings || !canEdit;
                const collectionName = STORE_TO_FIRESTORE_COLLECTION[cfg.collection] || cfg.collection;
                return (
                  <tr key={cfg.collection} className={`hover:bg-slate-800/30 transition ${!cfg.enabled && !isSettings ? 'opacity-60' : ''}`}>
                    <td className="p-3 text-slate-500 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <FileSpreadsheet className="w-3 h-3 text-violet-400 shrink-0" />
                        {cfg.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">store: {cfg.collection}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                        {collectionName}
                      </span>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        disabled={isDisabled}
                        value={cfg.tabName}
                        onChange={(e) => updateConfig(cfg.collection, { tabName: e.target.value })}
                        className="w-full min-w-[140px] bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-violet-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-emerald-300 font-bold">
                        {recordCount}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          cfg.enabled || isSettings
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {cfg.enabled || isSettings ? 'TERHUBUNG' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px] font-mono">
                      {cfg.lastSyncedAt ? new Date(cfg.lastSyncedAt).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {isSettings ? (
                        <span className="text-[10px] text-slate-500">Selalu</span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => updateConfig(cfg.collection, { enabled: !cfg.enabled })}
                          title={cfg.enabled ? 'Nonaktifkan sinkronisasi database ini' : 'Aktifkan sinkronisasi database ini'}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition disabled:opacity-40 ${
                            cfg.enabled
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {cfg.enabled ? <Power className="w-3 h-3 text-emerald-400" /> : <PowerOff className="w-3 h-3" />}
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

        <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Table2 className="w-3 h-3 text-violet-400" />
            Data tersinkronkan otomatis ke database utama Google Cloud Firestore &amp; ekspor opsional Google Sheets.
          </span>
          <span>
            Total data aktif: <b className="text-emerald-300">{totalStoreItems}</b>
          </span>
        </div>
      </div>
    </div>
  );
};
