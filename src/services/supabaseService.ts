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
    return {
      success: false,
      totalItems: 0,
      collectionsCount: 0,
      syncedAt: new Date().toISOString(),
      error: 'Supabase URL atau Anon Key belum dikonfigurasi di file .env (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).',
    };
  }

  let totalItems = 0;
  let collectionsCount = 0;
  const details: Record<string, number> = {};

  try {
    for (const key of ORDERED_COLLECTIONS) {
      const tableName = STORE_TO_SUPABASE_TABLE[key];
      if (!tableName) continue;

      if (key === 'settings') {
        const settingsSnake = toSnakeCaseRecord(store.settings);
        settingsSnake.id = 'app_settings';
        settingsSnake.updated_at = new Date().toISOString();
        const { error } = await supabase.from(tableName).upsert(settingsSnake);
        if (error) {
          console.error(`Error syncing settings to Supabase table ${tableName}:`, error);
        } else {
          totalItems += 1;
          collectionsCount += 1;
          details[tableName] = 1;
        }
        continue;
      }

      const items = (store as any)[key] as any[];
      if (Array.isArray(items) && items.length > 0) {
        const rows = items.map((item) => toSnakeCaseRecord(item));
        
        // Upsert in batches of 100
        const batchSize = 100;
        let tableSuccessCount = 0;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const { error } = await supabase.from(tableName).upsert(batch);
          if (error) {
            console.error(`Error upserting batch into Supabase table ${tableName}:`, error);
          } else {
            tableSuccessCount += batch.length;
          }
        }

        if (tableSuccessCount > 0) {
          totalItems += tableSuccessCount;
          collectionsCount += 1;
          details[tableName] = tableSuccessCount;
        }
      }
    }

    const syncedAt = new Date().toISOString();
    return {
      success: true,
      totalItems,
      collectionsCount,
      syncedAt,
      details,
    };
  } catch (err: any) {
    console.error('Error pushing data to Supabase:', err);
    return {
      success: false,
      totalItems,
      collectionsCount,
      syncedAt: new Date().toISOString(),
      error: err.message || String(err),
    };
  }
}

/**
 * Incrementally sync modified collections to Supabase
 */
export async function syncStoreToSupabase(oldStore: ARMSStore, newStore: ARMSStore): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    for (const key of ORDERED_COLLECTIONS) {
      const tableName = STORE_TO_SUPABASE_TABLE[key];
      if (!tableName) continue;

      if (key === 'settings') {
        if (JSON.stringify(oldStore.settings) !== JSON.stringify(newStore.settings)) {
          const settingsSnake = toSnakeCaseRecord(newStore.settings);
          settingsSnake.id = 'app_settings';
          settingsSnake.updated_at = new Date().toISOString();
          await supabase.from(tableName).upsert(settingsSnake);
        }
        continue;
      }

      const oldItems = (oldStore as any)[key];
      const newItems = (newStore as any)[key];

      if (JSON.stringify(oldItems) !== JSON.stringify(newItems)) {
        if (Array.isArray(newItems) && newItems.length > 0) {
          const rows = newItems.map((item) => toSnakeCaseRecord(item));
          await supabase.from(tableName).upsert(rows);
        }
      }
    }
  } catch (e) {
    console.warn('Incremental Supabase sync warning:', e);
  }
}
