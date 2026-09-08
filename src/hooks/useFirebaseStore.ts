import { useState, useEffect, useCallback, useRef } from 'react';
import { ARMSStore, getStoredStore, initializeARMSStore, saveStore } from '../services/armsDataService';
import {
  fetchStoreFromFirestore,
  syncStoreToFirestore,
  pushFullStoreToFirestore,
  FirestoreSyncResult,
} from '../services/firestoreService';
import { pushToGoogleSheets } from '../services/googleSheetsService';

const CACHE_TIMESTAMP_KEY = 'ARMS_FIRESTORE_CACHE_TIMESTAMP_V1';
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface PushFullResult {
  totalItems: number;
  collectionsCount: number;
  syncedAt: string;
  /** Hasil push ke database utama (Firestore). */
  firestoreResult: FirestoreSyncResult;
  /** Hasil ekspor opsional ke Google Sheets (null bila Spreadsheet ID belum diisi). */
  sheetsResult: { totalItems: number; collectionsCount: number; syncedAt: string } | null;
  /** Error non-fatal dari ekspor Google Sheets (database utama tetap sukses). */
  sheetsError?: string;
}

/**
 * Hook store ARMS — Google Firestore sebagai database UTAMA & SATU-SATUNYA
 * sumber cloud. localStorage hanya cache cepat (offline-first).
 *
 *  - Saat mount: tarik seluruh 30 koleksi dari Firestore (jika cache masih
 *    segar < 5 menit, langsung pakai cache).
 *  - Setiap perubahan store: optimistic update + push inkremental (debounce
 *    500ms) ke Firestore, termasuk DELETE dokumen yang dihapus.
 *  - `pushFullData`: push penuh ke Firestore (+ ekspor Google Sheets bila
 *    Spreadsheet ID terisi — ekspor opsional, bukan database).
 */
export function useFirebaseStore() {
  const [store, setStore] = useState<ARMSStore>(() => {
    return getStoredStore() || initializeARMSStore();
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // We keep a reference to the latest synced store to properly diff new changes
  const lastSyncedStoreRef = useRef<ARMSStore>(store);

  // Initial Fetch from Firestore
  useEffect(() => {
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval>;

    const performSync = async (force = false) => {
      const cachedAt = Number(localStorage.getItem(CACHE_TIMESTAMP_KEY) || 0);
      if (!force && cachedAt > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
        if (mounted) setIsInitializing(false);
        return;
      }

      try {
        const updatedStore = await fetchStoreFromFirestore(store);
        if (mounted) {
          setStore(updatedStore);
          saveStore(updatedStore);
          localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
          lastSyncedStoreRef.current = updatedStore;
          setIsInitializing(false);
        }
      } catch (err) {
        console.warn('Initial Firestore sync failed, memakai data lokal:', err);
        if (mounted) {
          setError(err as Error);
          setIsInitializing(false);
        }
      }
    };

    performSync();

    // Auto-sync berkala (refresh data dari Firestore)
    intervalId = setInterval(() => {
      if (mounted && !isSyncing) {
        performSync();
      }
    }, CACHE_TTL_MS);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStore = useCallback((newStore: ARMSStore) => {
    // 1. Optimistic Local Update
    setStore(newStore);
    saveStore(newStore);

    // 2. Debounced push inkremental ke Firestore (database utama)
    setIsSyncing(true);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await syncStoreToFirestore(lastSyncedStoreRef.current, newStore);
        lastSyncedStoreRef.current = newStore;
      } catch (e: any) {
        console.error('Firestore sync error:', e);
        setError(e);
      } finally {
        setIsSyncing(false);
      }
    }, 500);
  }, []);

  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const refreshedStore = await fetchStoreFromFirestore(store);

      setStore(refreshedStore);
      saveStore(refreshedStore);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));

      // Pastikan perubahan lokal (jika ada) ikut terkirim ke Firestore
      await syncStoreToFirestore(store, refreshedStore);

      lastSyncedStoreRef.current = refreshedStore;
      setError(null);
    } catch (e: any) {
      console.error('Manual Firestore sync failed:', e);
      setError(e);
    } finally {
      setIsSyncing(false);
    }
  }, [store]);

  /**
   * Push penuh ke Firestore (database utama) + ekspor Google Sheets bila
   * Spreadsheet ID terisi di settings (opsional, error-nya non-fatal).
   */
  const pushFullData = useCallback(async (): Promise<PushFullResult> => {
    setIsSyncing(true);
    try {
      const firestoreResult = await pushFullStoreToFirestore(store);
      if (!firestoreResult.success) {
        throw new Error(firestoreResult.error || 'Sinkronisasi Firestore gagal');
      }

      // Ekspor opsional ke Google Sheets (bukan database utama)
      let sheetsResult: PushFullResult['sheetsResult'] = null;
      let sheetsError: string | undefined;
      const hasSheetId = Boolean(store.settings?.googleSheetId?.trim());
      if (hasSheetId) {
        try {
          sheetsResult = await pushToGoogleSheets(store);
        } catch (sheetErr: any) {
          sheetsError = sheetErr?.message || String(sheetErr);
          console.warn('Ekspor Google Sheets gagal (non-fatal):', sheetsError);
        }
      }

      lastSyncedStoreRef.current = store;
      setError(null);
      return {
        totalItems: firestoreResult.totalItems,
        collectionsCount: firestoreResult.collectionsCount,
        syncedAt: firestoreResult.syncedAt,
        firestoreResult,
        sheetsResult,
        sheetsError,
      };
    } catch (e: any) {
      console.error('Push full data failed:', e);
      setError(e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  }, [store]);

  /** Push penuh khusus Firestore (tanpa ekspor Sheets). */
  const pushFullFirestore = useCallback(async (): Promise<FirestoreSyncResult> => {
    setIsSyncing(true);
    try {
      const result = await pushFullStoreToFirestore(store);
      lastSyncedStoreRef.current = store;
      setError(null);
      return result;
    } catch (e: any) {
      console.error('Push full data to Firestore failed:', e);
      setError(e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  }, [store]);

  return {
    store,
    updateStore,
    forceSync,
    pushFullData,
    pushFullFirestore,
    isInitializing,
    isSyncing,
    error,
  };
}
