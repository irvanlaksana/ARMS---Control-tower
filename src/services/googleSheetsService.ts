/**
 * Google Sheets Service (pengganti "local CSV sync" lama)
 * ---------------------------------------------------------------------------
 * Google Sheets kini menjadi EKSPORT LAPORAN OPSIONAL dari database utama
 * (Firestore), bukan database itu sendiri.
 *
 * Alur:
 *  - POST /api/sheets/setup  -> buat/verifikasi tab database di spreadsheet
 *    Google (via Netlify Function + Service Account).
 *  - POST /api/sheets/sync   -> tulis data seluruh koleksi aktif ke tab
 *    spreadsheet Google.
 *
 * Prasyarat: spreadsheet Google dibuat & di-share (akses Editor) dengan email
 * Service Account yang sama dengan Google Drive (GOOGLE_SERVICE_ACCOUNT_JSON
 * di Netlify).
 */

import { ARMSStore } from './armsDataService';
import { getActiveDatabaseConfigs, getDatabaseTabMap } from '../data/databaseConfig';

/** Bersihkan nilai undefined agar JSON payload rapi. */
function cleanData(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanData);
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = cleanData(val);
    }
  }
  return result;
}

/** Ambil Google Spreadsheet ID dari settings (ID asli, bukan nama workbook). */
function getSpreadsheetId(store: ARMSStore): string | null {
  const raw = store?.settings?.googleSheetId || '';
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Allow user to paste a full URL: extract the ID.
  const m = trimmed.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : trimmed;
}

/**
 * Buat/verifikasi seluruh tab database di spreadsheet Google.
 */
export async function setupGoogleSheets(
  spreadsheetId: string,
  tabs: Record<string, string>
): Promise<{ success: boolean; sheets?: string[]; error?: string }> {
  const response = await fetch('/api/sheets/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId, tabs }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok && !json.success) {
    throw new Error(json.error || `Google Sheets setup gagal (HTTP ${response.status})`);
  }
  return json;
}

/**
 * Push data seluruh koleksi AKTIF ke Google Sheets (ekspor laporan).
 */
export async function pushToGoogleSheets(
  store: ARMSStore
): Promise<{ totalItems: number; collectionsCount: number; syncedAt: string }> {
  const spreadsheetId = getSpreadsheetId(store);
  if (!spreadsheetId) {
    throw new Error('Google Spreadsheet ID belum diisi di Pengaturan → Database & Sheet.');
  }

  // Hanya push database yang diaktifkan pada Pengaturan Database
  const activeConfigs = getActiveDatabaseConfigs(store.settings);
  const activeSet = new Set(activeConfigs.map((c) => c.collection));

  const dataToSync: Record<string, any> = {};
  let totalItems = 0;
  let collectionsCount = 0;

  const keys = Object.keys(store) as (keyof ARMSStore)[];
  for (const key of keys) {
    if (key === 'settings') {
      if (activeSet.has(key)) {
        dataToSync[key] = store.settings;
        collectionsCount++;
        totalItems++;
      }
      continue;
    }

    if (!activeSet.has(key)) continue;

    const items = store[key] as any[];
    if (items && items.length > 0) {
      dataToSync[key] = items.map(cleanData);
      collectionsCount++;
      totalItems += items.length;
    } else {
      dataToSync[key] = [];
    }
  }

  const response = await fetch('/api/sheets/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spreadsheetId,
      data: dataToSync,
      tabs: getDatabaseTabMap(store.settings),
    }),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error || `Gagal sinkronisasi ke Google Sheets (HTTP ${response.status})`);
  }

  const json = await response.json();
  return {
    totalItems,
    collectionsCount,
    syncedAt: json.syncedAt || new Date().toISOString(),
  };
}
