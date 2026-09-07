import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ARMSStore } from './armsDataService';
import {
  toCamelCaseRecord,
  toSnakeCaseRecord,
  ORDERED_COLLECTIONS,
  STORE_TO_SUPABASE_TABLE,
} from '../utils/supabaseAdapter';

/**
 * Result of Supabase Push operation
 */
export interface SupabaseSyncResult {
  success: boolean;
  totalItems: number;
  collectionsCount: number;
  syncedAt: string;
  error?: string;
  details?: Record<string, number>;
  errors?: string[];
}

/**
 * Fetch all store data from Supabase tables
 */
export async function fetchStoreFromSupabase(currentStore: ARMSStore): Promise<ARMSStore> {
  if (!isSupabaseConfigured) {
    return currentStore;
  }

  try {
    const newStore: any = { ...currentStore };

    for (const key of ORDERED_COLLECTIONS) {
      const tableName = STORE_TO_SUPABASE_TABLE[key];
      if (!tableName) continue;

      if (key === 'settings') {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', 'app_settings').maybeSingle();
        if (!error && data) {
          newStore.settings = {
            ...currentStore.settings,
            ...toCamelCaseRecord(data),
          };
        }
        continue;
      }

      const { data, error } = await supabase.from(tableName).select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        newStore[key] = data.map((row) => toCamelCaseRecord(row));
      }
    }

    return newStore as ARMSStore;
  } catch (err: any) {
    console.error('Error fetching from Supabase:', err);
    return currentStore;
  }
}

/**
 * Sync / Push full store data to Supabase in proper dependency order
 */
export async function pushFullStoreToSupabase(store: ARMSStore): Promise<SupabaseSyncResult> {
  if (!isSupabaseConfigured) {
    return { success: false, totalItems: 0, collectionsCount: 0, syncedAt: new Date().toISOString(),
      error: 'VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum tersedia di environment Vercel.' };
  }
  let totalItems = 0;
  let collectionsCount = 0;
  const details: Record<string, number> = {};
  const errors: string[] = [];
  const saveRows = async (tableName: string, rows: any[]) => {
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from(tableName).upsert(rows.slice(i, i + 100), { onConflict: 'id' });
      if (error) errors.push(`${tableName}: ${error.message}`);
      else totalItems += Math.min(100, rows.length - i);
    }
  };
  for (const key of ORDERED_COLLECTIONS) {
    const tableName = STORE_TO_SUPABASE_TABLE[key];
    if (!tableName) continue;
    if (key === 'settings') {
      const row = toSnakeCaseRecord(store.settings);
      row.id = 'app_settings'; row.updated_at = new Date().toISOString();
      const { error } = await supabase.from(tableName).upsert(row, { onConflict: 'id' });
      if (error) errors.push(`${tableName}: ${error.message}`);
      else { totalItems++; collectionsCount++; details[tableName] = 1; }
      continue;
    }
    const items = (store as any)[key] as any[];
    if (!Array.isArray(items)) continue;
    const before = totalItems;
    await saveRows(tableName, items.map(toSnakeCaseRecord));
    const saved = totalItems - before;
    if (saved > 0) { collectionsCount++; details[tableName] = saved; }
  }
  const syncedAt = new Date().toISOString();
  return { success: errors.length === 0, totalItems, collectionsCount, syncedAt, details,
    errors: errors.length ? errors : undefined, error: errors.length ? errors.join(' | ') : undefined };
}

/**
 * Incrementally sync modified collections to Supabase
 */
export async function syncStoreToSupabase(oldStore: ARMSStore, newStore: ARMSStore): Promise<void> {
  if (!isSupabaseConfigured) return;
  const errors: string[] = [];
  for (const key of ORDERED_COLLECTIONS) {
    const tableName = STORE_TO_SUPABASE_TABLE[key];
    if (!tableName) continue;
    try {
      if (key === 'settings') {
        if (JSON.stringify(oldStore.settings) === JSON.stringify(newStore.settings)) continue;
        const row = toSnakeCaseRecord(newStore.settings);
        row.id = 'app_settings'; row.updated_at = new Date().toISOString();
        const { error } = await supabase.from(tableName).upsert(row, { onConflict: 'id' });
        if (error) errors.push(`${tableName}: ${error.message}`);
        continue;
      }
      const oldItems = (oldStore as any)[key], newItems = (newStore as any)[key];
      if (JSON.stringify(oldItems) === JSON.stringify(newItems) || !Array.isArray(newItems) || newItems.length === 0) continue;
      const { error } = await supabase.from(tableName).upsert(newItems.map(toSnakeCaseRecord), { onConflict: 'id' });
      if (error) errors.push(`${tableName}: ${error.message}`);
    } catch (error: any) { errors.push(`${tableName}: ${error?.message || String(error)}`); }
  }
  if (errors.length) throw new Error(`Sinkronisasi Supabase gagal: ${errors.join(' | ')}`);
}
