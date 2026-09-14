import { useState, useEffect, useCallback, useRef } from 'react';
import { ARMSStore, getStoredStore, initializeARMSStore, saveStore } from '../services/armsDataService';
import { fetchStoreFromFirebase, syncStoreToFirebase, pushFullStoreToFirebase } from '../services/firebaseSyncService';
import {
  fetchStoreFromSupabase,
  syncStoreToSupabase,
  pushFullStoreToSupabase,
  SupabaseSyncResult,
} from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { isGasBackendActive } from '../lib/gasBridge';

const CACHE_TIMESTAMP_KEY = 'ARMS_FIREBASE_CACHE_TIMESTAMP_V1';
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Cache waktu sync terakhir. localStorage hanya cache — sumber kebenaran adalah
 * spreadsheet aktif — sehingga kegagalan storage (kuota penuh / diblokir runtime
 * Web App Apps Script) tidak boleh menghentikan aplikasi.
 */
function readCacheTimestamp(): number {
  try {
    return Number(localStorage.getItem(CACHE_TIMESTAMP_KEY) || 0);
  } catch {
    return 0;
  }
}

function writeCacheTimestamp(value: number): void {
  try {
    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(value));
  } catch {
    /* abaikan: cache tidak kritikal */
  }
}

export function useFirebaseStore() {
  const [store, setStore] = useState<ARMSStore>(() => {
    return getStoredStore() || initializeARMSStore();
  });
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // We keep a reference to the latest synced store to properly diff new changes
  const lastSyncedStoreRef = useRef<ARMSStore>(store);

  // Initial Fetch from Remote
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const performSync = async (force = false) => {
      const cachedAt = readCacheTimestamp();
      if (!force && cachedAt > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
        if (mounted) setIsInitializing(false);
        return;
      }

      try {
        let updatedStore = store;
        
        // 1. Supabase as PRIMARY database if configured
        //    (dinonaktifkan otomatis bila backend Google Apps Script aktif —
        //     sumber penyimpanan utama adalah spreadsheet aktif tempat deploy)
        if (isSupabaseConfigured && !isGasBackendActive()) {
          try {
            updatedStore = await fetchStoreFromSupabase(updatedStore);
          } catch (sbErr) {
            console.warn('Supabase fetch note:', sbErr);
          }
        } else {
          // 2. Fallback to local workbook / Sheets cache
          try {
            updatedStore = await fetchStoreFromFirebase(updatedStore);
          } catch (fbErr) {
            console.warn('Local workbook fetch note:', fbErr);
          }
        }

        if (mounted) {
          setStore(updatedStore);
          saveStore(updatedStore);
          writeCacheTimestamp(Date.now());
          lastSyncedStoreRef.current = updatedStore;
          setIsInitializing(false);
        }
      } catch (err) {
        console.warn('Initial store sync failed:', err);
        if (mounted) {
          setError(err as Error);
          setIsInitializing(false);
        }
      }
    };

    performSync();

    // Auto-sync periodically
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
    
    // 2. Debounced push to Remote Database (Supabase as primary)
    setIsSyncing(true);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        // Sync to Supabase as primary database (spreadsheet aktif saat mode Apps Script)
        if (isSupabaseConfigured && !isGasBackendActive()) {
          await syncStoreToSupabase(lastSyncedStoreRef.current, newStore);
        } else {
          // Local Sheets fallback
          try {
            await syncStoreToFirebase(lastSyncedStoreRef.current, newStore);
          } catch {
            // ignore local sheet sync error
          }
        }
        
        lastSyncedStoreRef.current = newStore;
      } catch (e: any) {
        console.error('Remote sync error:', e);
        setError(e);
      } finally {
        setIsSyncing(false);
      }
    }, 500);
  }, []);

  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      let refreshedStore = store;
      if (isSupabaseConfigured && !isGasBackendActive()) {
        refreshedStore = await fetchStoreFromSupabase(refreshedStore);
      } else {
        try {
          refreshedStore = await fetchStoreFromFirebase(refreshedStore);
        } catch {
          // ignore
        }
      }
      
      setStore(refreshedStore);
      saveStore(refreshedStore);
      writeCacheTimestamp(Date.now());
      
      if (isSupabaseConfigured && !isGasBackendActive()) {
        await syncStoreToSupabase(store, refreshedStore);
      }
      
      lastSyncedStoreRef.current = refreshedStore;
      setError(null);
    } catch (e: any) {
      console.error('Manual sync failed:', e);
      setError(e);
    } finally {
      setIsSyncing(false);
    }
  }, [store]);

  const pushFullData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const fbResult = await pushFullStoreToFirebase(store);
      
      // Also push to Supabase if configured (skip saat spreadsheet aktif jadi sumber utama)
      let sbResult: SupabaseSyncResult | null = null;
      if (isSupabaseConfigured && !isGasBackendActive()) {
        sbResult = await pushFullStoreToSupabase(store);
      }
      
      if (sbResult && !sbResult.success) {
        throw new Error(sbResult.error || 'Sinkronisasi Supabase gagal');
      }
      lastSyncedStoreRef.current = store;
      setError(null);
      return {
        ...fbResult,
        supabaseResult: sbResult,
      };
    } catch (e: any) {
      console.error('Push full data failed:', e);
      setError(e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  }, [store]);

  const pushFullSupabase = useCallback(async (): Promise<SupabaseSyncResult> => {
    setIsSyncing(true);
    try {
      const result = await pushFullStoreToSupabase(store);
      lastSyncedStoreRef.current = store;
      setError(null);
      return result;
    } catch (e: any) {
      console.error('Push full data to Supabase failed:', e);
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
    pushFullSupabase,
    isInitializing,
    isSyncing,
    error
  };
}
