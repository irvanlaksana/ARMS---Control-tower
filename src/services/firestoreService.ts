/**
 * Firestore Data Service — DATABASE UTAMA ARMS (menggantikan Supabase)
 * ---------------------------------------------------------------------------
 * Seluruh 30 koleksi database ARMS disimpan di Google Cloud Firestore
 * (Firebase). Dokumen memakai document ID = `id` record ARMS dan field
 * camelCase identik dengan tipe TypeScript, sehingga hasil GET langsung bisa
 * dipakai sebagai state aplikasi tanpa konversi.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db, FIREBASE_PROJECT_ID } from '../lib/firebase';
import { ARMSStore } from './armsDataService';
import {
  ORDERED_COLLECTIONS,
  STORE_TO_FIRESTORE_COLLECTION,
  toFirestoreDoc,
  sanitizeForeignKeys,
  dedupeById,
} from '../utils/firestoreAdapter';

/** Hasil operasi push/sync ke Firestore. */
export interface FirestoreSyncResult {
  success: boolean;
  totalItems: number;
  collectionsCount: number;
  syncedAt: string;
  error?: string;
  details?: Record<string, number>;
  errors?: string[];
  /** Catatan non-fatal: field yang dibuang, FK menggantung yang dinolkan, dsb. */
  warnings?: string[];
}

/**
 * Firestore selalu "terkonfigurasi": web app memakai konfigurasi Firebase
 * yang tertanam (firebase-applet-config.json) — tidak perlu env var.
 */
export const isFirestoreConfigured = true;

/** Project ID Firebase untuk ditampilkan di UI. */
export const firestoreProjectId = FIREBASE_PROJECT_ID;

/** Batas aman WriteBatch Firestore (hard limit 450 writes). */
const BATCH_SIZE = 400;

/**
 * Ambil seluruh data store dari Firestore.
 * Koleksi kosong/tak ada tidak menghapus data lokal (kebijakan yang sama
 * dengan workbook lama: sumber baru yang kosong tak boleh menghapus seed).
 */
export async function fetchStoreFromFirestore(currentStore: ARMSStore): Promise<ARMSStore> {
  if (!isFirestoreConfigured) return currentStore;

  const newStore: any = { ...currentStore };
  const errors: string[] = [];

  for (const key of ORDERED_COLLECTIONS) {
    const colName = STORE_TO_FIRESTORE_COLLECTION[key];
    if (!colName) continue;

    try {
      if (key === 'settings') {
        const snap = await getDoc(doc(db, colName, 'app_settings'));
        if (snap.exists()) {
          const data = snap.data() as Record<string, any>;
          newStore.settings = {
            ...currentStore.settings,
            ...data,
          };
        }
        continue;
      }

      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        newStore[key] = snap.docs.map((d) => d.data() as DocumentData);
      }
    } catch (err: any) {
      console.warn(`Firestore fetch ${colName} gagal:`, err?.message || err);
      errors.push(`${colName}: ${err?.message || String(err)}`);
    }
  }

  if (errors.length && newStore === currentStore) {
    console.warn('Firestore tidak dapat dihubungi, memakai data lokal:', errors);
  }
  return newStore as ARMSStore;
}

/**
 * Push penuh seluruh store ke Firestore (upsert, urutan dependensi).
 * Pengganti `pushFullStoreToSupabase`.
 */
export async function pushFullStoreToFirestore(store: ARMSStore): Promise<FirestoreSyncResult> {
  let totalItems = 0;
  let collectionsCount = 0;
  const details: Record<string, number> = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  /** id yang dikenal per koleksi, untuk validasi FK logis. */
  const knownIds: Record<string, Set<string>> = {};

  for (const [storeKey, colName] of Object.entries(STORE_TO_FIRESTORE_COLLECTION)) {
    const items = (store as any)[storeKey];
    if (Array.isArray(items)) {
      knownIds[colName] = new Set(items.map((i: any) => String(i?.id)).filter(Boolean));
    }
  }

  for (const key of ORDERED_COLLECTIONS) {
    const colName = STORE_TO_FIRESTORE_COLLECTION[key];
    if (!colName) continue;

    try {
      // --- settings: satu dokumen tetap 'app_settings' ---
      if (key === 'settings') {
        const { doc: docData, droppedKeys } = toFirestoreDoc(colName, store.settings || {});
        if (droppedKeys.length) {
          warnings.push(`${colName}: field tidak dikenal diabaikan -> ${droppedKeys.join(', ')}`);
        }
        docData.id = 'app_settings';
        docData.updatedAt = new Date().toISOString();
        await setDoc(doc(db, colName, 'app_settings'), docData, { merge: true });
        totalItems++;
        collectionsCount++;
        details[colName] = 1;
        continue;
      }

      const items = (store as any)[key];
      if (!Array.isArray(items) || items.length === 0) continue;

      // 1. Sanitasi + buang field yang tidak ada di skema
      const droppedAll = new Set<string>();
      let docs = items.map((item) => {
        const result = toFirestoreDoc(colName, item);
        result.droppedKeys.forEach((d) => droppedAll.add(d));
        return result.doc;
      });
      if (droppedAll.size) {
        warnings.push(`${colName}: field tidak dikenal diabaikan -> ${[...droppedAll].join(', ')}`);
      }

      // 2. Dokumen tanpa id tidak bisa disimpan (document ID Firestore)
      const withoutId = docs.filter((d) => !d.id).length;
      if (withoutId) {
        warnings.push(`${colName}: ${withoutId} dokumen tanpa 'id' dilewati`);
        docs = docs.filter((d) => d.id);
      }

      // 3. Dedupe + bersihkan FK logis menggantung
      docs = dedupeById(docs, colName, warnings);
      docs = docs.filter((d) => sanitizeForeignKeys(colName, d, knownIds, warnings));
      if (docs.length === 0) continue;

      // 4. Tulis per batch
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const d of chunk) {
          const { id, ...data } = d;
          batch.set(doc(db, colName, String(id)), data, { merge: true });
        }
        await batch.commit();
      }

      totalItems += docs.length;
      collectionsCount++;
      details[colName] = docs.length;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`Firestore push ${colName} gagal:`, msg);
      errors.push(`${colName}: ${msg}`);
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
 * Sinkronisasi inkremental: hanya koleksi yang berubah yang dikirim.
 * Dokumen yang dihapus dari store juga dihapus dari Firestore.
 * Pengganti `syncStoreToSupabase`.
 */
export async function syncStoreToFirestore(oldStore: ARMSStore, newStore: ARMSStore): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const knownIds: Record<string, Set<string>> = {};
  for (const [storeKey, colName] of Object.entries(STORE_TO_FIRESTORE_COLLECTION)) {
    const items = (newStore as any)[storeKey];
    if (Array.isArray(items)) {
      knownIds[colName] = new Set(items.map((i: any) => String(i?.id)).filter(Boolean));
    }
  }

  for (const key of ORDERED_COLLECTIONS) {
    const colName = STORE_TO_FIRESTORE_COLLECTION[key];
    if (!colName) continue;

    try {
      if (key === 'settings') {
        if (JSON.stringify(oldStore.settings) === JSON.stringify(newStore.settings)) continue;
        const { doc: docData, droppedKeys } = toFirestoreDoc(colName, newStore.settings || {});
        if (droppedKeys.length) warnings.push(`${colName}: field diabaikan -> ${droppedKeys.join(', ')}`);
        docData.id = 'app_settings';
        docData.updatedAt = new Date().toISOString();
        await setDoc(doc(db, colName, 'app_settings'), docData, { merge: true });
        continue;
      }

      const oldItems = (oldStore as any)[key];
      const newItems = (newStore as any)[key];
      if (
        JSON.stringify(oldItems) === JSON.stringify(newItems) ||
        !Array.isArray(newItems)
      ) {
        continue;
      }

      // Hapus dokumen yang sudah dihapus dari aplikasi
      const oldIds = new Set((Array.isArray(oldItems) ? oldItems : []).map((i: any) => String(i?.id)).filter(Boolean));
      const newIds = new Set(newItems.map((i: any) => String(i?.id)).filter(Boolean));
      const deletedIds = [...oldIds].filter((id) => !newIds.has(id));
      if (deletedIds.length) {
        for (let i = 0; i < deletedIds.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          for (const id of deletedIds.slice(i, i + BATCH_SIZE)) {
            batch.delete(doc(db, colName, id));
          }
          await batch.commit();
        }
      }

      let docs = newItems.map((item: any) => toFirestoreDoc(colName, item).doc).filter((d: any) => d.id);
      docs = dedupeById(docs, colName, warnings);
      docs = docs.filter((d) => sanitizeForeignKeys(colName, d, knownIds, warnings));
      if (!docs.length) continue;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        for (const d of docs.slice(i, i + BATCH_SIZE)) {
          const { id, ...data } = d;
          batch.set(doc(db, colName, String(id)), data, { merge: true });
        }
        await batch.commit();
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`Firestore sync ${colName} gagal:`, msg);
      errors.push(`${colName}: ${msg}`);
    }
  }

  if (warnings.length) console.warn('[Firestore sync]', warnings);
  if (errors.length) throw new Error(`Sinkronisasi Firestore gagal: ${errors.join(' | ')}`);
}
