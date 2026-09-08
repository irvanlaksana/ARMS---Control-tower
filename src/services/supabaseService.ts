import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ARMSStore } from './armsDataService';
import {
  toCamelCaseRecord,
  toSupabaseRow,
  ORDERED_COLLECTIONS,
  STORE_TO_SUPABASE_TABLE,
  SUPABASE_TABLE_TO_STORE,
} from '../utils/supabaseAdapter';
import { SUPABASE_FOREIGN_KEYS } from '../utils/supabaseSchemaColumns';

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
  /** Catatan non-fatal: kolom yang dibuang, FK menggantung yang dinolkan, dsb. */
  warnings?: string[];
}

const CHUNK_SIZE = 100;

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
 * Bersihkan foreign key menggantung.
 *
 * Penyebab error "insert or update on table X violates foreign key constraint":
 * baris anak menunjuk id induk yang tidak ada di Postgres (biasanya karena push
 * tabel induk gagal lebih dulu, atau data lokal menyimpan id yatim).
 *
 * @param tableName tabel tujuan
 * @param row payload snake_case
 * @param savedIds id yang benar-benar sudah tersimpan pada tabel induk di run ini
 * @param warnings penampung catatan
 * @returns true bila baris aman di-upsert
 */
function sanitizeForeignKeys(
  tableName: string,
  row: Record<string, any>,
  savedIds: Record<string, Set<string>>,
  warnings: string[]
): boolean {
  const fks = SUPABASE_FOREIGN_KEYS[tableName];
  if (!fks) return true;

  for (const [column, fk] of Object.entries(fks)) {
    const value = row[column];
    if (value === null || value === undefined || value === '') {
      // kolom kosong: pastikan benar-benar null agar tidak dianggap id ''
      if (value === '') row[column] = null;
      continue;
    }
    const parentIds = savedIds[fk.table];
    // Tabel induk tidak ikut di-push pada run ini -> biarkan Postgres yang menilai.
    if (!parentIds) continue;
    if (parentIds.has(String(value))) continue;

    if (fk.nullable) {
      warnings.push(
        `${tableName}.${column}: id '${value}' tidak ada di tabel ${fk.table}, dikosongkan (row id: ${row.id ?? '-'})`
      );
      row[column] = null;
    } else {
      warnings.push(
        `${tableName}: row '${row.id ?? '-'}' dilewati karena ${column}='${value}' tidak ada di ${fk.table}`
      );
      return false;
    }
  }
  return true;
}

/**
 * Jaga nilai kolom ber-CHECK CONSTRAINT tetap valid sebelum di-upsert.
 *
 * Latar belakang: tabel `collections` hanya menerima payment_method
 * ('TRANSFER','CASH_RECEIPT','MEDIATION_ESCROW'), sedangkan UI lama (dan
 * dropdown yang salah menyalin nilai dari tabel `payments`) sempat menyimpan
 * 'CASH' yang hanya valid di tabel `payments` ('TRANSFER','CASH'). Record
 * semacam itu gagal di-check constraint collections_payment_method_check dan
 * terus gagal pada tiap push. Baris yatim yang sudah tersimpan di storage
 * lokal tidak bisa diperbaiki lewat perubahan UI saja, jadi di sini nilai
 * legacy dipetakan ulang sebelum dikirim agar push pulih otomatis.
 */
function normalizeConstraintValues(
  tableName: string,
  rows: Record<string, any>[],
  warnings: string[]
): Record<string, any>[] {
  if (tableName !== 'collections') return rows;

  const collectionsAllowed = new Set(['TRANSFER', 'CASH_RECEIPT', 'MEDIATION_ESCROW']);
  const mapped = rows.map((row) => {
    const val = row.payment_method;
    if (val == null || collectionsAllowed.has(val)) return row;

    const corrected =
      String(val).toUpperCase() === 'CASH' ? 'CASH_RECEIPT' : 'TRANSFER';
    warnings.push(
      `${tableName} (id: ${row.id ?? '-'}): payment_method '${val}' tidak valid untuk tabel collections, dipetakan ke '${corrected}'`
    );
    return { ...row, payment_method: corrected };
  });
  return mapped;
}

/** Buang duplikat id dalam satu batch (ON CONFLICT tidak boleh kena baris yang sama 2x). */
function dedupeById(rows: Record<string, any>[], tableName: string, warnings: string[]) {
  const map = new Map<string, Record<string, any>>();
  let duplicates = 0;
  for (const row of rows) {
    const id = String(row.id ?? '');
    if (!id) continue;
    if (map.has(id)) duplicates++;
    map.set(id, row);
  }
  if (duplicates > 0) {
    warnings.push(`${tableName}: ${duplicates} baris duplikat id digabung (dipakai data terakhir)`);
  }
  return [...map.values()];
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
      error: 'VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum tersedia di environment Vercel.',
    };
  }

  let totalItems = 0;
  let collectionsCount = 0;
  const details: Record<string, number> = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  /** id yang sukses tersimpan per tabel, dipakai untuk validasi FK tabel anak. */
  const savedIds: Record<string, Set<string>> = {};

  /** Upsert satu batch; bila gagal, ulangi per baris supaya baris valid tetap masuk. */
  const upsertChunk = async (tableName: string, chunk: Record<string, any>[]): Promise<number> => {
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
    if (!error) {
      for (const row of chunk) savedIds[tableName]?.add(String(row.id));
      return chunk.length;
    }

    if (chunk.length === 1) {
      errors.push(`${tableName} (id: ${chunk[0].id ?? '-'}): ${error.message}`);
      return 0;
    }

    // Isolasi baris bermasalah agar satu record rusak tidak menggagalkan 100 record.
    let saved = 0;
    for (const row of chunk) {
      saved += await upsertChunk(tableName, [row]);
    }
    return saved;
  };

  const saveRows = async (tableName: string, rows: Record<string, any>[]): Promise<number> => {
    let saved = 0;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      saved += await upsertChunk(tableName, rows.slice(i, i + CHUNK_SIZE));
    }
    return saved;
  };

  for (const key of ORDERED_COLLECTIONS) {
    const tableName = STORE_TO_SUPABASE_TABLE[key];
    if (!tableName) continue;
    savedIds[tableName] = savedIds[tableName] || new Set<string>();

    // --- settings: satu baris tetap ---
    if (key === 'settings') {
      const { row, droppedKeys } = toSupabaseRow(tableName, store.settings || {});
      if (droppedKeys.length) {
        warnings.push(`${tableName}: kolom tidak dikenal diabaikan -> ${droppedKeys.join(', ')}`);
      }
      row.id = 'app_settings';
      row.updated_at = new Date().toISOString();
      const { error } = await supabase.from(tableName).upsert(row, { onConflict: 'id' });
      if (error) {
        errors.push(`${tableName}: ${error.message}`);
      } else {
        savedIds[tableName].add('app_settings');
        totalItems++;
        collectionsCount++;
        details[tableName] = 1;
      }
      continue;
    }

    const items = (store as any)[key] as any[];
    if (!Array.isArray(items) || items.length === 0) continue;

    // 1. camelCase -> snake_case + buang kolom yang tidak ada di Postgres
    const droppedAll = new Set<string>();
    let rows = items.map((item) => {
      const { row, droppedKeys } = toSupabaseRow(tableName, item);
      droppedKeys.forEach((d) => droppedAll.add(d));
      return row;
    });
    if (droppedAll.size) {
      warnings.push(`${tableName}: kolom tidak dikenal diabaikan -> ${[...droppedAll].join(', ')}`);
    }

    // 2. Baris tanpa id tidak bisa di-upsert dengan onConflict id
    const withoutId = rows.filter((r) => !r.id).length;
    if (withoutId) {
      warnings.push(`${tableName}: ${withoutId} baris tanpa 'id' dilewati`);
      rows = rows.filter((r) => r.id);
    }

    // 3. Normalisasi nilai ber-check-constraint + dedupe + bersihkan foreign key
    rows = dedupeById(rows, tableName, warnings);
    rows = normalizeConstraintValues(tableName, rows, warnings);
    rows = rows.filter((row) => sanitizeForeignKeys(tableName, row, savedIds, warnings));
    if (rows.length === 0) continue;

    // 4. Kirim
    const saved = await saveRows(tableName, rows);
    totalItems += saved;
    if (saved > 0) {
      collectionsCount++;
      details[tableName] = saved;
    }
  }

  const syncedAt = new Date().toISOString();
  return {
    success: errors.length === 0,
    totalItems,
    collectionsCount,
    syncedAt,
    details,
    errors: errors.length ? errors : undefined,
    warnings: warnings.length ? warnings : undefined,
    error: errors.length ? errors.join(' | ') : undefined,
  };
}

/**
 * Incrementally sync modified collections to Supabase
 */
export async function syncStoreToSupabase(oldStore: ARMSStore, newStore: ARMSStore): Promise<void> {
  if (!isSupabaseConfigured) return;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Id yang diketahui ada berdasarkan state aplikasi saat ini (untuk validasi FK).
  const knownIds: Record<string, Set<string>> = {};
  for (const [tableName, collection] of Object.entries(SUPABASE_TABLE_TO_STORE)) {
    const items = (newStore as any)[collection];
    if (Array.isArray(items)) {
      knownIds[tableName] = new Set(items.map((i: any) => String(i?.id)).filter(Boolean));
    }
  }

  for (const key of ORDERED_COLLECTIONS) {
    const tableName = STORE_TO_SUPABASE_TABLE[key];
    if (!tableName) continue;
    try {
      if (key === 'settings') {
        if (JSON.stringify(oldStore.settings) === JSON.stringify(newStore.settings)) continue;
        const { row } = toSupabaseRow(tableName, newStore.settings || {});
        row.id = 'app_settings';
        row.updated_at = new Date().toISOString();
        const { error } = await supabase.from(tableName).upsert(row, { onConflict: 'id' });
        if (error) errors.push(`${tableName}: ${error.message}`);
        continue;
      }

      const oldItems = (oldStore as any)[key];
      const newItems = (newStore as any)[key];
      if (
        JSON.stringify(oldItems) === JSON.stringify(newItems) ||
        !Array.isArray(newItems) ||
        newItems.length === 0
      ) {
        continue;
      }

      let rows = newItems.map((item: any) => toSupabaseRow(tableName, item).row).filter((r: any) => r.id);
      rows = dedupeById(rows, tableName, warnings);
      rows = normalizeConstraintValues(tableName, rows, warnings);
      rows = rows.filter((row) => sanitizeForeignKeys(tableName, row, knownIds, warnings));
      if (!rows.length) continue;

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const { error } = await supabase
          .from(tableName)
          .upsert(rows.slice(i, i + CHUNK_SIZE), { onConflict: 'id' });
        if (error) errors.push(`${tableName}: ${error.message}`);
      }
    } catch (error: any) {
      errors.push(`${tableName}: ${error?.message || String(error)}`);
    }
  }

  if (warnings.length) console.warn('[Supabase sync]', warnings);
  if (errors.length) throw new Error(`Sinkronisasi Supabase gagal: ${errors.join(' | ')}`);
}
