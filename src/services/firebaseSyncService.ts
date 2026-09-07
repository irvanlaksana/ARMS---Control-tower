import { ARMSStore } from './armsDataService';
import { getActiveDatabaseConfigs, getDatabaseTabMap } from '../data/databaseConfig';

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
function getSpreadsheetId(store: ARMSStore): string | null {
  // Nama workbook lokal. Tidak perlu Spreadsheet ID atau kredensial Google.
  return store?.settings?.googleSheetId || 'arms-control-tower';
}

export async function fetchStoreFromFirebase(currentStore: ARMSStore): Promise<ARMSStore> {
  const spreadsheetId = getSpreadsheetId(currentStore);
  if (!spreadsheetId) {
    console.warn("Workbook lokal belum tersedia; memakai data lokal dan akan dibuat saat push pertama.");
    return currentStore;
  }

  try {
    const response = await fetch('/api/sheets/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId,
        tabs: getDatabaseTabMap(currentStore.settings),
      })
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch workbook CSV lokal");
    }

    const json = await response.json();
    if (json.success && json.data) {
      return { ...currentStore, ...json.data };
    }
  } catch (e) {
    console.warn("Failed to fetch data from Google Sheets", e);
  }
  
  return currentStore;
}

export async function pushFullStoreToFirebase(store: ARMSStore): Promise<{ totalItems: number; collectionsCount: number; syncedAt: string }> {
  const spreadsheetId = getSpreadsheetId(store);
  if (!spreadsheetId) {
    console.warn("Workbook lokal belum tersedia; memakai nama default arms-control-tower.");
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

  try {
    const response = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId,
        data: dataToSync,
        tabs: getDatabaseTabMap(store.settings),
      })
    });

    if (!response.ok) {
      throw new Error("Failed to sync workbook CSV lokal");
    }

    const json = await response.json();
    return {
      totalItems,
      collectionsCount,
      syncedAt: json.syncedAt || new Date().toISOString(),
    };
  } catch (e) {
    console.error("Local spreadsheet sync error", e);
    throw e;
  }
}

export async function syncStoreToFirebase(oldStore: ARMSStore, newStore: ARMSStore) {
  // For Google Sheets, we just push the full store since it works on entire tabs, 
  // or we could optimize by only pushing changed tabs. 
  // Let's optimize by sending only the changed tabs.
  const spreadsheetId = getSpreadsheetId(newStore);
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
      })
    });
  } catch (e) {
    console.error("Firebase (Sheets) incremental sync error", e);
  }
}
