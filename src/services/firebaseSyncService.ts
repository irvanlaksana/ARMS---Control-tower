import { ARMSStore } from './armsDataService';
import { AppSettings } from '../types/arms';
import { getActiveDatabaseConfigs, getDatabaseTabMap } from '../data/databaseConfig';
import { mergeSettingsFromSheet, parseSettingsFromSheet } from '../lib/settingsCodec';
import { resolveActiveSheetId } from './settingsSheetService';

/**
 * Sinkronisasi data ARMS ↔ SPREADSHEET AKTIF.
 *
 * Perilaku & seluruh fungsinya sama seperti sebelumnya (push penuh, push
 * inkremental, pull), yang berubah hanya target penyimpanannya: spreadsheet
 * aktif yang dipakai deploy saat ini (Google Apps Script) — bukan workbook CSV
 * lokal maupun Service Account Google Sheets.
 */

// Function to clean undefined values and prepare data for API
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

/**
 * Spreadsheet tujuan sync. Pada mode Apps Script nilai ini otomatis diisi dari
 * spreadsheet tempat script di-deploy; bila tidak tersedia, pakai ID/nama yang
 * diisi di Pengaturan (fallback: `arms-control-tower`).
 */
async function getSpreadsheetId(store: ARMSStore): Promise<string> {
  try {
    return await resolveActiveSheetId(store?.settings);
  } catch {
    return store?.settings?.googleSheetId || 'arms-control-tower';
  }
}

/** Settings dikirim sebagai baris key/value (nilai object -> JSON string). */
function serializeSettings(settings: AppSettings): Record<string, string> {
  const rows: Record<string, string> = {};
  Object.keys(settings || {}).forEach((key) => {
    const value = (settings as any)[key];
    if (value === undefined) return;
    if (value === null) {
      rows[key] = '';
      return;
    }
    if (typeof value === 'object') {
      try {
        rows[key] = JSON.stringify(value);
      } catch {
        rows[key] = String(value);
      }
      return;
    }
    rows[key] = String(value);
  });
  return rows;
}

export async function fetchStoreFromFirebase(currentStore: ARMSStore): Promise<ARMSStore> {
  const spreadsheetId = await getSpreadsheetId(currentStore);
  if (!spreadsheetId) {
    console.warn('Spreadsheet aktif belum tersedia; memakai data lokal dan akan dibuat saat push pertama.');
    return currentStore;
  }

  try {
    const response = await fetch('/api/sheets/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId,
        tabs: getDatabaseTabMap(currentStore.settings),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch spreadsheet aktif');
    }

    const json = await response.json();
    if (json.success && json.data) {
      const data = json.data as Record<string, any>;
      const nextStore: any = { ...currentStore };

      Object.keys(data).forEach((key) => {
        if (key === 'settings') return;
        const value = data[key];
        // Tab kosong dilewati agar data lokal tidak tertimpa array kosong.
        if (Array.isArray(value) && value.length === 0) return;
        nextStore[key] = value;
      });

      if (data.settings) {
        const fromSheet = parseSettingsFromSheet(data.settings);
        if (fromSheet && Object.keys(fromSheet).length) {
          nextStore.settings = mergeSettingsFromSheet(currentStore.settings, fromSheet);
        }
      }

      return nextStore as ARMSStore;
    }
  } catch (e) {
    console.warn('Failed to fetch data from active spreadsheet', e);
  }

  return currentStore;
}

export async function pushFullStoreToFirebase(
  store: ARMSStore
): Promise<{ totalItems: number; collectionsCount: number; syncedAt: string }> {
  const spreadsheetId = await getSpreadsheetId(store);
  if (!spreadsheetId) {
    console.warn('Spreadsheet aktif belum tersedia; memakai nama default arms-control-tower.');
    return { totalItems: 0, collectionsCount: 0, syncedAt: new Date().toISOString() };
  }

  // Hanya push database yang diaktifkan pada Pengaturan Database
  const activeConfigs = getActiveDatabaseConfigs(store.settings);
  const activeSet = new Set(activeConfigs.map((c) => c.collection));

  const dataToSync: any = {};
  let totalItems = 0;
  let collectionsCount = 0;

  const keys = Object.keys(store) as (keyof ARMSStore)[];
  for (const key of keys) {
    if (key === 'settings') {
      if (activeSet.has(key)) {
        dataToSync[key] = serializeSettings(store.settings);
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

  try {
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
      throw new Error('Failed to sync spreadsheet aktif');
    }

    const json = await response.json();
    if (json?.success === false) {
      throw new Error(json.error || 'Gagal menyimpan ke spreadsheet aktif');
    }

    return {
      totalItems,
      collectionsCount,
      syncedAt: json.syncedAt || new Date().toISOString(),
    };
  } catch (e) {
    console.error('Active spreadsheet sync error', e);
    throw e;
  }
}

export async function syncStoreToFirebase(oldStore: ARMSStore, newStore: ARMSStore) {
  // For the active spreadsheet we push the whole changed tab(s).
  // Let's optimize by sending only the changed tabs.
  const spreadsheetId = await getSpreadsheetId(newStore);
  if (!spreadsheetId) {
    return;
  }

  const activeConfigs = getActiveDatabaseConfigs(newStore.settings);
  const activeSet = new Set(activeConfigs.map((c) => c.collection));

  const dataToSync: any = {};
  const keys = Object.keys(newStore) as (keyof ARMSStore)[];
  let hasChanges = false;

  for (const key of keys) {
    if (!activeSet.has(key)) continue;

    if (key === 'settings') {
      if (JSON.stringify(oldStore.settings) !== JSON.stringify(newStore.settings)) {
        dataToSync[key] = serializeSettings(newStore.settings);
        hasChanges = true;
      }
      continue;
    }

    if (JSON.stringify(oldStore[key]) !== JSON.stringify(newStore[key])) {
      dataToSync[key] = (newStore[key] as any[]).map(cleanData);
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return;
  }

  try {
    await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId,
        data: dataToSync,
        tabs: getDatabaseTabMap(newStore.settings),
      }),
    });
  } catch (e) {
    console.error('Active spreadsheet incremental sync error', e);
  }
}
