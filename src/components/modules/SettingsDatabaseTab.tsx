import React, { useEffect, useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, DatabaseTabConfig } from '../../types/arms';
import { getDatabaseConfigs, markDatabaseSynced } from '../../data/databaseConfig';
import { pushFullStoreToFirebase } from '../../services/firebaseSyncService';
import { pushFullStoreToSupabase, fetchStoreFromSupabase, SupabaseSyncResult } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../lib/supabase';
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
  Cloud,
  CheckCircle,
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
}) => {
  const canEdit = canEditFn(currentUser);
  const [configs, setConfigs] = useState<DatabaseTabConfig[]>(() => getDatabaseConfigs(store.settings));
  const [sheetId, setSheetId] = useState(store.settings?.googleSheetId || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [setupMsg, setSetupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // Supabase states
  const [isPushingSupabase, setIsPushingSupabase] = useState(false);
  const [isFetchingSupabase, setIsFetchingSupabase] = useState(false);
  const [supabaseMsg, setSupabaseMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

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

  // Push to Supabase
  const handlePushSupabase = async () => {
    setIsPushingSupabase(true);
    setSupabaseMsg({ ok: true, text: 'Sedang mengirim & menyinkronkan seluruh 30 tabel ke database Supabase...' });
    try {
      const res: SupabaseSyncResult = await pushFullStoreToSupabase(store);
      if (res.warnings?.length) {
        // Catatan non-fatal (kolom diabaikan, FK menggantung dinolkan, duplikat id).
        console.warn('[Supabase push] warnings:', res.warnings);
      }
      if (res.success) {
        const warnNote = res.warnings?.length
          ? ` (${res.warnings.length} catatan penyesuaian data, lihat console browser)`
          : '';
        setSupabaseMsg({
          ok: true,
          text: `✅ Sukses! ${res.totalItems} dokumen di ${res.collectionsCount} tabel berhasil dikirim dan dibuat otomatis di database Supabase.${warnNote}`,
        });
        const audit = createAuditEntry(
          currentUser.username,
          currentUser.role,
          'UPDATE',
          'Supabase_Sync',
          'ALL_TABLES',
          `Push penuh ${res.totalItems} dokumen ke ${res.collectionsCount} tabel Supabase`
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
        console.error('[Supabase push] errors:', res.errors);
        const list = res.errors || [];
        const preview = list.slice(0, 3).join(' | ');
        const more = list.length > 3 ? ` (+${list.length - 3} error lain, lihat console browser)` : '';
        setSupabaseMsg({
          ok: false,
          text:
            `❌ Gagal push ke Supabase: ${preview || res.error || 'Terjadi kesalahan tidak diketahui.'}${more}` +
            (res.totalItems > 0 ? ` — ${res.totalItems} dokumen lain tetap berhasil tersimpan.` : ''),
        });
      }
    } catch (err: any) {
      setSupabaseMsg({ ok: false, text: `❌ Gagal push ke Supabase: ${err.message || String(err)}` });
    } finally {
      setIsPushingSupabase(false);
    }
  };

  // Fetch from Supabase
  const handleFetchSupabase = async () => {
    setIsFetchingSupabase(true);
    setSupabaseMsg({ ok: true, text: 'Sedang mengambil data terbaru dari database Supabase...' });
    try {
      const refreshed = await fetchStoreFromSupabase(store);
      onUpdateStore(refreshed);
      setSupabaseMsg({
        ok: true,
        text: '✅ Sukses mengambil data terbaru dari database Supabase!',
      });
    } catch (err: any) {
      setSupabaseMsg({ ok: false, text: `❌ Gagal mengambil data: ${err.message || String(err)}` });
    } finally {
      setIsFetchingSupabase(false);
    }
  };

  const handleSetupSheets = async () => {
    if (!canEdit) return;
    const id = (sheetId || 'arms-control-tower').trim();
    setIsSettingUp(true);
    setSetupMsg({ ok: true, text: 'Sedang membuat/memverifikasi seluruh tab database di workbook CSV lokal...' });
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
        text: `✅ Berhasil! ${json.sheets?.length || 0} tab/sheet database tersedia di workbook CSV lokal.`,
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
      setSetupMsg({ ok: false, text: 'Masukkan nama workbook lokal terlebih dahulu sebelum push.' });
      return;
    }
    setIsPushing(true);
    setSetupMsg({ ok: true, text: 'Sedang mengirim data seluruh database aktif ke Google Sheets...' });
    try {
      const pushStore: ARMSStore = {
        ...store,
        settings: {
          ...store.settings,
          googleSheetId: id,
          databaseConfig: configs,
        },
      };
      const res = await pushFullStoreToFirebase(pushStore);
      const supabaseResult = isSupabaseConfigured ? await pushFullStoreToSupabase(pushStore) : null;
      if (supabaseResult && !supabaseResult.success) {
        throw new Error(`Supabase: ${supabaseResult.error || 'sinkronisasi gagal'}`);
      }
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
        text: `✅ Sukses! ${res.totalItems} dokumen tersimpan di CSV lokal${supabaseResult ? ' dan Supabase' : ''}.`,
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

  // Calculate total items in store
  const totalStoreItems = Object.keys(store).reduce((acc, key) => {
    if (key === 'settings') return acc + 1;
    const val = (store as any)[key];
    return acc + (Array.isArray(val) ? val.length : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* 1. SUPABASE CLOUD DATABASE CONTROL BANNER */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/80 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-xl shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base">Supabase PostgreSQL Cloud Database Control</h3>
                <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold rounded-full animate-pulse">
                  ONLINE LIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-normal">
                Sinkronkan seluruh 30 tabel database sistem ARMS (Cases, Personnel, Payments, SK, Assets, Ledger, DLL) secara otomatis ke Supabase.
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
                <span>Target Supabase URL:</span>
                <span className="font-mono text-emerald-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {supabaseUrl || 'https://your-project.supabase.co (set di .env)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isSupabaseConfigured
                  ? '✅ Kredensial Supabase terdeteksi aktif di environment.'
                  : '⚠️ Variabel VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY belum terisi di .env.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isFetchingSupabase}
                onClick={handleFetchSupabase}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingSupabase ? 'animate-spin' : ''}`} />
                <span>{isFetchingSupabase ? 'Menarik...' : 'Tarik dari Supabase'}</span>
              </button>

              <button
                type="button"
                disabled={isPushingSupabase}
                onClick={handlePushSupabase}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/30"
              >
                <Zap className={`w-3.5 h-3.5 ${isPushingSupabase ? 'animate-bounce' : ''}`} />
                <span>{isPushingSupabase ? 'Mengirim ke Supabase...' : '🚀 Push Data Otomatis ke Supabase'}</span>
              </button>
            </div>
          </div>

          {supabaseMsg && (
            <div
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                supabaseMsg.ok
                  ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
                  : 'bg-rose-950/90 text-rose-200 border-rose-700'
              }`}
            >
              {supabaseMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              <span>{supabaseMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. GOOGLE SHEETS / DRIVE SYNC CONTROL */}
      <div className="bg-gradient-to-r from-violet-950/70 via-slate-900 to-indigo-950/70 border border-violet-800/70 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <div className="p-2.5 bg-violet-600/15 border border-violet-500/30 text-violet-300 rounded-xl shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Local CSV Backup & Sync Control</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                Atur nama tab/sheet, status aktif, dan jumlah data untuk masing-masing database ARMS di workbook CSV lokal.
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
                Kolom nama workbook lokal:
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="arms-control-tower"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                ID spreadsheet tujuan dibuatnya database. Diambil dari URL:
                <span className="text-slate-400 font-mono"> docs.google.com/spreadsheets/d/&lt;ID&gt;/edit</span>
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
                {isPushing ? 'Mengirim...' : 'Push ke Sheets'}
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
          Konfigurasi database tersimpan & akan disinkronkan otomatis.
        </div>
      )}

      {/* 3. TABLE OF ALL DATABASES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderTree className="w-3.5 h-3.5 text-violet-400" />
            <h4 className="text-sm font-bold text-white">Daftar Kolom Database ARMS (30 Tabel)</h4>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
              {configs.length} tabel
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
                <th className="p-3">Tabel Supabase</th>
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
                return (
                  <tr key={cfg.collection} className={`hover:bg-slate-800/30 transition ${!cfg.enabled && !isSettings ? 'opacity-60' : ''}`}>
                    <td className="p-3 text-slate-500 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <FileSpreadsheet className="w-3 h-3 text-violet-400 shrink-0" />
                        {cfg.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">collection: {cfg.collection}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                        public.{cfg.collection === 'danaTalangan' ? 'dana_talangan' : cfg.collection === 'commLogs' ? 'comm_logs' : cfg.collection === 'cashAccounts' ? 'cash_accounts' : cfg.collection === 'pettyCash' ? 'petty_cash' : cfg.collection === 'workingCapital' ? 'working_capital' : cfg.collection === 'lawyerNotices' ? 'lawyer_notices' : cfg.collection === 'assetRecoveries' ? 'asset_recoveries' : cfg.collection === 'auditLogs' ? 'audit_logs' : cfg.collection === 'driveFolders' ? 'drive_folders' : cfg.collection}
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
            Data tersinkronkan otomatis ke database Supabase PostgreSQL &amp; workbook CSV lokal.
          </span>
          <span>
            Total data aktif: <b className="text-emerald-300">{totalStoreItems}</b>
          </span>
        </div>
      </div>
    </div>
  );
};
