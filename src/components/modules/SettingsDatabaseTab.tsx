import React, { useEffect, useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, DatabaseTabConfig } from '../../types/arms';
import { getDatabaseConfigs, markDatabaseSynced } from '../../data/databaseConfig';
import { pushFullStoreToFirebase } from '../../services/firebaseSyncService';
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
} from 'lucide-react';

interface SettingsDatabaseTabProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
  onPushFullFirebase?: () => Promise<{ totalItems: number; collectionsCount: number }>;
}

const canEditFn = (currentUser: User) => currentUser.role === 'SUPER_ADMIN_OPS';

export const SettingsDatabaseTab: React.FC<SettingsDatabaseTabProps> = ({
  store,
  currentUser,
  onUpdateStore,
  onPushFullFirebase,
}) => {
  const canEdit = canEditFn(currentUser);
  const [configs, setConfigs] = useState<DatabaseTabConfig[]>(() => getDatabaseConfigs(store.settings));
  const [sheetId, setSheetId] = useState(store.settings?.googleSheetId || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [setupMsg, setSetupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

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
      `Update konfigurasi sheet untuk ${configs.length} database ARMS`
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

  const handleSetupSheets = async () => {
    if (!canEdit) return;
    const id = sheetId.trim();
    if (!id) {
      setSetupMsg({ ok: false, text: 'Masukkan Google Spreadsheet ID terlebih dahulu.' });
      return;
    }
    setIsSettingUp(true);
    setSetupMsg({ ok: true, text: 'Sedang membuat/memverifikasi seluruh tab database di Google Spreadsheet...' });
    try {
      const resp = await fetch('/api/sheets/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: id,
          tabs: Object.fromEntries(configs.map((c) => [c.collection, c.tabName])),
        }),
      });
      const json = await resp.json();
      if (!json?.success) {
        throw new Error(json?.error || 'Gagal membuat sheet database');
      }
      setSetupMsg({
        ok: true,
        text: `✅ Berhasil! ${json.sheets?.length || 0} tab/sheet database tersedia di Google Spreadsheet.`,
      });
      saveConfig(id);
    } catch (err: any) {
      setSetupMsg({ ok: false, text: `❌ Gagal membuat sheet: ${err.message || String(err)}` });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handlePushAll = async () => {
    const id = (sheetId || '').trim();
    if (!id) {
      setSetupMsg({ ok: false, text: 'Masukkan Google Spreadsheet ID / URL terlebih dahulu sebelum push.' });
      return;
    }
    setIsPushing(true);
    setSetupMsg({ ok: true, text: 'Sedang mengirim data seluruh database aktif ke Google Sheets...' });
    try {
      // Pakai settings termutakhir (ID spreadsheet + konfigurasi tab) agar push langsung memakai kolom yang diset
      const pushStore: ARMSStore = {
        ...store,
        settings: {
          ...store.settings,
          googleSheetId: id,
          databaseConfig: configs,
        },
      };
      // Selalu pakai settings termutakhir (ID spreadsheet + konfigurasi tab) di tab ini,
      // sehingga push memakai kolom sheet yang baru diset tanpa menunggu render ulang.
      const res = await pushFullStoreToFirebase(pushStore);
      const counts: Record<string, number> = {};
      for (const cfg of getDatabaseConfigs(pushStore.settings)) {
        if (cfg.collection === 'settings') continue;
        const items = (pushStore as any)[cfg.collection];
        counts[cfg.collection] = Array.isArray(items) ? items.length : 0;
      }
      if (canEdit) {
        const syncedSettings = markDatabaseSynced(pushStore.settings, counts, res.syncedAt || new Date().toISOString());
        onUpdateStore({ ...pushStore, settings: syncedSettings });
      }
      setSetupMsg({
        ok: true,
        text: `✅ Sukses! ${res.totalItems} dokumen di ${res.collectionsCount} sheet/database berhasil di-push.`,
      });
    } catch (err: any) {
      setSetupMsg({ ok: false, text: `❌ Gagal push: ${err.message || String(err)}` });
    } finally {
      setIsPushing(false);
    }
  };

  const connectedCount = configs.filter((c) => c.enabled || c.collection === 'settings').length;
  const spreadsheetUrl = sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId.trim()}/edit?usp=sharing`
    : '';

  return (
    <div className="space-y-6">
      {/* Header & spreadsheet column */}
      <div className="bg-gradient-to-r from-violet-950/70 via-slate-900 to-indigo-950/70 border border-violet-800/70 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-violet-600/15 border border-violet-500/30 text-violet-300 rounded-xl shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Kolom Pengaturan Semua Database (Google Sheets)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Atur nama tab/sheet, status aktif, dan jumlah data untuk masing-masing database ARMS. Konfigurasi dipakai
                oleh Push Otomatis &amp; Fetch ke Google Spreadsheet.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 bg-violet-950/80 border border-violet-700 text-violet-200 text-[11px] font-bold rounded-full">
              {connectedCount}/{configs.length} Database Aktif
            </span>
            <a
              href={spreadsheetUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                spreadsheetUrl
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'pointer-events-none bg-slate-900 text-slate-600 border border-slate-800'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
              Buka Spreadsheet
            </a>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kolom Google Spreadsheet ID / URL:
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="e.g. 1AbCdefGhIjKlMnOpQrStUvWxYz0123456789"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                ID spreadsheet tujuan dibuatnya database. Bisa diambil dari URL Google Sheets:
                <span className="text-slate-400 font-mono"> docs.google.com/spreadsheets/d/&lt;ID&gt;/edit</span>
              </p>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                disabled={!canEdit || isSettingUp}
                onClick={handleSetupSheets}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-lg"
              >
                {isSettingUp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                {isSettingUp ? 'Membuat Sheet...' : 'Buat Sheet Database'}
              </button>
              <button
                type="button"
                disabled={!canEdit || isPushing}
                onClick={handlePushAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} />
                {isPushing ? 'Mengirim...' : 'Push Semua Data'}
              </button>
            </div>
          </div>

          {setupMsg && (
            <div
              className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                setupMsg.ok
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700'
                  : 'bg-rose-950/80 text-rose-200 border-rose-700'
              }`}
            >
              {setupMsg.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{setupMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Konfigurasi database tersimpan & akan disinkronkan otomatis.
        </div>
      )}

      {/* Table of all databases */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-violet-400" />
            <h4 className="text-sm font-bold text-white">Daftar Kolom Database ARMS</h4>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
              {configs.length} database
            </span>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => saveConfig()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Konfigurasi
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-8">No</th>
                <th className="p-3.5">Database</th>
                <th className="p-3.5">Kolom Sheet di Spreadsheet</th>
                <th className="p-3.5 text-center">Jumlah Data</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Sync Terakhir</th>
                <th className="p-3.5 text-center">Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {configs.map((cfg, idx) => {
                const isSettings = cfg.collection === 'settings';
                const items = (store as any)[cfg.collection];
                const recordCount = isSettings ? 1 : Array.isArray(items) ? items.length : 0;
                const isDisabled = isSettings || !canEdit;
                return (
                  <tr key={cfg.collection} className={`hover:bg-slate-800/30 transition ${!cfg.enabled && !isSettings ? 'opacity-60' : ''}`}>
                    <td className="p-3.5 text-slate-500 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        {cfg.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">collection: {cfg.collection}</div>
                    </td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        disabled={isDisabled}
                        value={cfg.tabName}
                        onChange={(e) => updateConfig(cfg.collection, { tabName: e.target.value })}
                        className="w-full min-w-[140px] bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-violet-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-emerald-300 font-bold">
                        {recordCount}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
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
                    <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                      {cfg.lastSyncedAt ? new Date(cfg.lastSyncedAt).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      {isSettings ? (
                        <span className="text-[10px] text-slate-500">Selalu</span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => updateConfig(cfg.collection, { enabled: !cfg.enabled })}
                          title={cfg.enabled ? 'Nonaktifkan sinkronisasi database ini' : 'Aktifkan sinkronisasi database ini'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition disabled:opacity-40 ${
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

        <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Table2 className="w-3.5 h-3.5 text-violet-400" />
            Ubah nama kolom sheet untuk mengganti lokasi database di Google Spreadsheet.
          </span>
          <span>
            Total data aktif: <b className="text-emerald-300">{configs.filter((c) => c.enabled || c.collection === 'settings').reduce((acc, c) => acc + (Array.isArray((store as any)[c.collection]) ? (store as any)[c.collection].length : 0), 0)}</b>
          </span>
        </div>
      </div>
    </div>
  );
};
