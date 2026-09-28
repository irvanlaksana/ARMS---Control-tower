import { ARMSStore } from './armsDataService';
import { getActiveDatabaseConfigs, getDatabaseTabMap } from '../data/databaseConfig';
import { callGasFunction } from '../lib/gasApi';

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

// Get spreadsheetId from settings or environment
function getSpreadsheetId(store: ARMSStore): string {
  return store?.settings?.googleSheetId?.trim() || 'arms-control-tower';
}

/**
 * 🛠️ Periksa & Buat Struktur 30 Sheet & Kolom di Spreadsheet
 * Membuat seluruh sheet dan header kolom yang dibutuhkan jika belum ada.
 */
export async function checkAndPrepareSpreadsheet(store: ARMSStore): Promise<{
  success: boolean;
  totalSheets: number;
  createdSheets: string[];
  existingSheets: string[];
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  isSimulation?: boolean;
}> {
  const spreadsheetId = getSpreadsheetId(store);
  const tabs = getDatabaseTabMap(store.settings);

  try {
    const res = await callGasFunction('checkAndPrepareSheets', spreadsheetId, tabs);
    return res;
  } catch (err: any) {
    console.error("Gagal memeriksa struktur spreadsheet:", err);
    throw err;
  }
}

/**
 * 📥 Mengambil data dari Google Sheets (dibagi per kolom & tab)
 */
export async function fetchStoreFromFirebase(currentStore: ARMSStore): Promise<ARMSStore> {
  const spreadsheetId = getSpreadsheetId(currentStore);
  if (!spreadsheetId) {
    console.warn("Spreadsheet ID belum tersedia.");
    return currentStore;
  }
  
  try {
    const tabs = getDatabaseTabMap(currentStore.settings);
    const json = await callGasFunction('fetchSheets', spreadsheetId, tabs);

    if (json.success && json.data) {
      return { ...currentStore, ...json.data };
    }
  } catch (e) {
    console.warn("Failed to fetch data from Google Sheets", e);
  }
  
  return currentStore;
}

/**
 * 🚀 Push seluruh data ke Google Sheets
 * Data dipetakan ke dalam kolom masing-masing dan dibatasi agar tidak melampaui limit 50k karakter.
 */
export async function pushFullStoreToFirebase(store: ARMSStore): Promise<{
  totalItems: number;
  collectionsCount: number;
  syncedAt: string;
  message?: string;
  isSimulation?: boolean;
}> {
  const spreadsheetId = getSpreadsheetId(store);

  // Pastikan struktur sheet dan kolom sudah siap terlebih dahulu
  try {
    const tabs = getDatabaseTabMap(store.settings);
    await callGasFunction('checkAndPrepareSheets', spreadsheetId, tabs);
  } catch (prepErr) {
    console.warn("Peringatan saat penyiapan struktur sheet:", prepErr);
  }

  const activeConfigs = getActiveDatabaseConfigs(store.settings);
  const activeSet = new Set(activeConfigs.map((c) => c.collection));
  const dataToSync: any = {};
  let totalItems = 0;
  let collectionsCount = 0;
  const keys = Object.keys(store) as (keyof ARMSStore)[];
  
  for (const key of keys) {
    if (key === 'settings') {
      if (activeSet.has(key)) {
        // Bersihkan objek settings agar tidak mengirim base64 berukuran raksasa
        const cleanSettings = { ...store.settings };
        if (cleanSettings.companyLogo && cleanSettings.companyLogo.length > 40000) {
          // Jika logo berupa base64 panjang, jangan taruh di string besar
          cleanSettings.companyLogo = cleanSettings.companyLogo.slice(0, 500) + '...';
        }
        dataToSync[key] = cleanSettings;
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
    const tabs = getDatabaseTabMap(store.settings);
    const json = await callGasFunction('syncSheets', spreadsheetId, dataToSync, tabs);

    return {
      totalItems,
      collectionsCount,
      syncedAt: json.syncedAt || new Date().toISOString(),
      message: json.message,
      isSimulation: json.isSimulation,
    };
  } catch (e) {
    console.error("Spreadsheet sync error", e);
    throw e;
  }
}

/**
 * Sinkronisasi bertahap / incremental
 */
export async function syncStoreToFirebase(oldStore: ARMSStore, newStore: ARMSStore) {
  const spreadsheetId = getSpreadsheetId(newStore);
  if (!spreadsheetId) return;

  const activeConfigs = getActiveDatabaseConfigs(newStore.settings);
  const activeSet = new Set(activeConfigs.map((c) => c.collection));
  const dataToSync: any = {};
  const keys = Object.keys(newStore) as (keyof ARMSStore)[];
  let hasChanges = false;
  
  for (const key of keys) {
    if (!activeSet.has(key)) continue;
    if (key === 'settings') {
      if (JSON.stringify(oldStore.settings) !== JSON.stringify(newStore.settings)) {
        dataToSync[key] = newStore.settings;
        hasChanges = true;
      }
      continue;
    }
    if (JSON.stringify(oldStore[key]) !== JSON.stringify(newStore[key])) {
      dataToSync[key] = (newStore[key] as any[]).map(cleanData);
      hasChanges = true;
    }
  }
  
  if (!hasChanges) return;
  
  try {
    const tabs = getDatabaseTabMap(newStore.settings);
    await callGasFunction('syncSheets', spreadsheetId, dataToSync, tabs);
  } catch (e) {
    console.error("Sheets incremental sync error", e);
  }
}
