/**
 * ============================================================================
 *  ARMS — Control Tower :: PENYIMPANAN PENGATURAN KE SPREADSHEET AKTIF
 * ============================================================================
 *  Semua pengaturan pada "ARMS System Settings & Branding Profile" — profil
 *  perusahaan, logo, konfigurasi Google Drive (Folder ID / URL / struktur
 *  sub-folder), konfigurasi tab database, fee default, URL Web App Apps Script
 *  — disimpan sebagai baris key/value pada tab **Settings** di spreadsheet
 *  aktif yang dipakai deploy saat ini.
 *
 *  Fitur yang ada tidak dihapus; hanya media penyimpanannya yang dipindah dari
 *  localStorage/env server ke spreadsheet aktif (localStorage tetap jadi cache).
 * ============================================================================
 */

import { AppSettings } from '../types/arms';
import { getDatabaseTabMap } from '../data/databaseConfig';
import { parseSettingsFromSheet, serializeSettingsForSheet, SETTINGS_TAB_NAME } from '../lib/settingsCodec';
import { fetchRuntimeInfo, getApiMode, isGasBackendActive, setGasWebAppUrl } from '../lib/gasBridge';

export interface ActiveSpreadsheetInfo {
  id: string;
  name: string;
  url: string;
  source: string;
  mode: string;
  provider: string;
  settingsTab: string;
  ownerEmail?: string;
  driveUser?: string;
  error?: string;
}

export interface SettingsSheetResult {
  ok: boolean;
  message: string;
  spreadsheet?: ActiveSpreadsheetInfo;
  settings?: Partial<AppSettings>;
  savedAt?: string;
  provider?: string;
}

const FALLBACK_WORKBOOK = 'arms-control-tower';

/** Ambil ID spreadsheet dari ID mentah atau URL Google Sheets. */
export function extractSpreadsheetId(raw?: string | null): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  const m = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const m2 = text.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  return text;
}

export function spreadsheetUrlFromId(id: string): string {
  const clean = String(id || '').trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(clean)) return `https://docs.google.com/spreadsheets/d/${clean}/edit`;
  return '';
}

/**
 * Spreadsheet yang dipakai menyimpan data & pengaturan saat ini.
 * Pada mode Apps Script, ID diambil otomatis dari spreadsheet tempat script
 * di-deploy (tidak perlu diisi manual).
 */
export async function resolveActiveSheet(settings?: AppSettings): Promise<ActiveSpreadsheetInfo> {
  const runtime = await fetchRuntimeInfo();
  const configuredId = String(settings?.googleSheetId || '').trim();
  const mode = getApiMode();

  if (isGasBackendActive() && runtime?.spreadsheetId) {
    return {
      id: runtime.spreadsheetId,
      name: runtime.spreadsheetName || 'Spreadsheet Aktif',
      url: runtime.spreadsheetUrl || spreadsheetUrlFromId(runtime.spreadsheetId),
      source: runtime.spreadsheetSource || 'google-apps-script',
      mode,
      provider: runtime.provider || 'google-apps-script',
      settingsTab: runtime.settingsTab || SETTINGS_TAB_NAME,
      ownerEmail: runtime.ownerEmail,
      driveUser: runtime.effectiveUser || runtime.driveUser,
      error: runtime.error,
    };
  }

  return {
    id: configuredId || FALLBACK_WORKBOOK,
    name: configuredId || FALLBACK_WORKBOOK,
    url: spreadsheetUrlFromId(configuredId),
    source: configuredId ? 'settings' : 'default',
    mode,
    provider: runtime?.provider || (mode === 'SERVER' ? 'server-api' : 'google-apps-script'),
    settingsTab: SETTINGS_TAB_NAME,
    ownerEmail: runtime?.ownerEmail,
    driveUser: runtime?.effectiveUser || runtime?.driveUser,
    error: runtime?.error,
  };
}

/** ID spreadsheet yang dikirim ke endpoint sync/fetch. */
export async function resolveActiveSheetId(settings?: AppSettings): Promise<string> {
  const active = await resolveActiveSheet(settings);
  return active.id || FALLBACK_WORKBOOK;
}

/**
 * Simpan seluruh pengaturan ke tab Settings pada spreadsheet aktif.
 */
export async function saveSettingsToActiveSheet(settings: AppSettings): Promise<SettingsSheetResult> {
  const active = await resolveActiveSheet(settings);

  // URL Web App Apps Script ikut disimpan sebagai konfigurasi runtime browser.
  if (typeof settings.appsScriptWebAppUrl === 'string') {
    setGasWebAppUrl(settings.appsScriptWebAppUrl.trim());
  }

  const payloadSettings = { ...settings, googleSheetId: settings.googleSheetId || active.id };
  const tabs = { ...getDatabaseTabMap(settings), settings: active.settingsTab || SETTINGS_TAB_NAME };

  try {
    let json: any;

    if (isGasBackendActive()) {
      // Apps Script: merge dengan key lain yang sudah ada di tab Settings.
      const resp = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: active.id, settings: payloadSettings, tabs }),
      });
      json = await resp.json();
    } else {
      // Server bawaan: pakai endpoint sync yang sudah ada (settings -> baris key/value).
      const resp = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: active.id,
          data: { settings: serializeSettingsForSheet(payloadSettings) },
          tabs,
        }),
      });
      json = await resp.json();
    }

    if (!json?.success) {
      throw new Error(json?.error || 'Gagal menyimpan pengaturan ke spreadsheet aktif');
    }

    const savedAt = json.savedAt || json.syncedAt || new Date().toISOString();
    const sheetInfo: ActiveSpreadsheetInfo = {
      ...active,
      id: json.spreadsheetId || active.id,
      name: json.spreadsheetName || active.name,
      url: json.spreadsheetUrl || active.url || spreadsheetUrlFromId(json.spreadsheetId || active.id),
    };

    return {
      ok: true,
      message: `Pengaturan tersimpan di spreadsheet aktif "${sheetInfo.name}" (tab ${sheetInfo.settingsTab}).`,
      spreadsheet: sheetInfo,
      settings: json.settings ? parseSettingsFromSheet(json.settings) : undefined,
      savedAt,
      provider: json.provider,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || String(err),
      spreadsheet: active,
    };
  }
}

/**
 * Muat pengaturan dari tab Settings pada spreadsheet aktif.
 */
export async function loadSettingsFromActiveSheet(settings: AppSettings): Promise<SettingsSheetResult> {
  const active = await resolveActiveSheet(settings);
  const tabs = { ...getDatabaseTabMap(settings), settings: active.settingsTab || SETTINGS_TAB_NAME };

  try {
    const resp = await fetch('/api/sheets/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId: active.id, tabs, only: ['settings'] }),
    });
    const json = await resp.json();
    if (!json?.success) throw new Error(json?.error || 'Gagal membaca pengaturan dari spreadsheet aktif');

    const rawSettings = json.data?.settings;
    if (!rawSettings || (typeof rawSettings === 'object' && !Object.keys(rawSettings).length)) {
      return {
        ok: true,
        message: `Tab ${active.settingsTab} pada spreadsheet aktif "${active.name}" masih kosong.`,
        spreadsheet: {
          ...active,
          id: json.spreadsheetId || active.id,
          name: json.spreadsheetName || active.name,
          url: json.spreadsheetUrl || active.url,
        },
        settings: {},
      };
    }

    return {
      ok: true,
      message: `Pengaturan dimuat dari spreadsheet aktif "${json.spreadsheetName || active.name}" (tab ${active.settingsTab}).`,
      spreadsheet: {
        ...active,
        id: json.spreadsheetId || active.id,
        name: json.spreadsheetName || active.name,
        url: json.spreadsheetUrl || active.url,
      },
      settings: parseSettingsFromSheet(rawSettings),
      savedAt: json.fetchedAt,
      provider: json.provider,
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || String(err), spreadsheet: active };
  }
}
