/**
 * ============================================================================
 *  ARMS — Control Tower :: CODEC PENGATURAN ↔ SPREADSHEET AKTIF
 * ============================================================================
 *  Seluruh pengaturan (Branding Profile, logo, konfigurasi Google Drive,
 *  konfigurasi tab database, fee default, dsb.) disimpan sebagai baris
 *  key/value pada tab **Settings** di spreadsheet aktif.
 *
 *  Berkas ini adalah padanan sisi-browser dari `settingsToRows_` /
 *  `settingsObjectFromRows_` di `appsscript/Db.gs`, sehingga formatnya identik
 *  baik ketika aplikasi berjalan di dalam Apps Script, memakai URL Web App,
 *  maupun memakai server bawaan (`server.ts`).
 *
 *  Nilai panjang (mis. logo base64) dipecah otomatis menjadi beberapa baris
 *  dengan suffix `__chunkN` karena satu sel Google Sheets maksimal 50.000
 *  karakter.
 * ============================================================================
 */

import { AppSettings } from '../types/arms';

export const SETTINGS_TAB_NAME = 'Settings';
export const SETTINGS_CHUNK_SUFFIX = '__chunk';
export const SETTINGS_CHUNK_SIZE = 40000;
export const SETTINGS_HEADERS = ['key', 'value', 'updatedAt', 'note'];

/** Key yang nilainya berupa object/array (disimpan sebagai JSON). */
export const SETTINGS_JSON_KEYS = ['databaseConfig'];
/** Key boolean. */
export const SETTINGS_BOOL_KEYS = ['autoSyncWithGoogleSheets'];
/** Key numerik. */
export const SETTINGS_NUMBER_KEYS = ['defaultFeePercent', 'defaultCompanyCommissionSplitPercent'];

export type SettingsSheetRow = { key: string; value: string; updatedAt?: string; note?: string };

function stringifyValue(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Ubah satu nilai settings kembali ke tipe aslinya. */
export function parseSettingsValue(key: string, rawValue: unknown): any {
  const text = rawValue === undefined || rawValue === null ? '' : String(rawValue);
  if (SETTINGS_BOOL_KEYS.includes(key)) return text === 'true' || text === '1';
  if (SETTINGS_NUMBER_KEYS.includes(key)) {
    const num = Number(text);
    return Number.isNaN(num) ? 0 : num;
  }
  if (SETTINGS_JSON_KEYS.includes(key) || /^[[{]/.test(text.trim())) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

/**
 * Ubah object settings menjadi baris key/value siap tulis ke tab Settings.
 * Nilai panjang dipecah menjadi beberapa baris `key`, `key__chunk2`, dst.
 */
export function settingsToSheetRows(settings: Record<string, any>, updatedAt = new Date().toISOString()): SettingsSheetRow[] {
  const rows: SettingsSheetRow[] = [];
  Object.keys(settings || {}).forEach((key) => {
    const value = settings[key];
    if (value === undefined) return;
    const text = stringifyValue(value);
    const note = value !== null && typeof value === 'object' ? 'json' : typeof value;

    if (text.length <= SETTINGS_CHUNK_SIZE) {
      rows.push({ key, value: text, updatedAt, note });
      return;
    }

    const total = Math.ceil(text.length / SETTINGS_CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      rows.push({
        key: i === 0 ? key : `${key}${SETTINGS_CHUNK_SUFFIX}${i + 1}`,
        value: text.slice(i * SETTINGS_CHUNK_SIZE, (i + 1) * SETTINGS_CHUNK_SIZE),
        updatedAt,
        note: `chunk ${i + 1}/${total} of ${key}`,
      });
    }
  });
  return rows;
}

/** Bentuk datar (tanpa chunk) untuk payload `/api/sheets/sync`. */
export function serializeSettingsForSheet(settings: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  settingsToSheetRows(settings).forEach((row) => {
    out[row.key] = row.value;
  });
  return out;
}

/**
 * Baca pengaturan dari tab Settings.
 * Menerima bentuk object `{key: value}` (hasil `/api/sheets/fetch`) atau
 * array baris `[{key, value}]` (hasil GET_ALL_DATA Apps Script).
 */
export function parseSettingsFromSheet(raw: Record<string, any> | SettingsSheetRow[] | null | undefined): Partial<AppSettings> {
  if (!raw) return {};

  const merged: Record<string, string> = {};
  const order: string[] = [];

  const pushKeyValue = (key: string, value: unknown) => {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) return;
    const text = stringifyValue(value);
    const chunkIdx = cleanKey.indexOf(SETTINGS_CHUNK_SUFFIX);
    if (chunkIdx !== -1) {
      const base = cleanKey.slice(0, chunkIdx);
      merged[base] = String(merged[base] === undefined ? '' : merged[base]) + text;
      if (!order.includes(base)) order.push(base);
      return;
    }
    if (merged[cleanKey] === undefined) order.push(cleanKey);
    merged[cleanKey] = text;
  };

  if (Array.isArray(raw)) {
    raw.forEach((row) => pushKeyValue(row?.key, row?.value));
  } else {
    Object.keys(raw).forEach((key) => pushKeyValue(key, (raw as Record<string, any>)[key]));
  }

  const out: Record<string, any> = {};
  order.forEach((key) => {
    out[key] = parseSettingsValue(key, merged[key]);
  });
  return out as Partial<AppSettings>;
}

/** Gabungkan pengaturan hasil spreadsheet ke pengaturan lokal (spreadsheet menang). */
export function mergeSettingsFromSheet<T extends AppSettings>(current: T, fromSheet: Partial<AppSettings>): T {
  const merged: any = { ...current };
  Object.keys(fromSheet || {}).forEach((key) => {
    const value = (fromSheet as any)[key];
    if (value === undefined || value === null || value === '') return;
    merged[key] = value;
  });
  return merged as T;
}
