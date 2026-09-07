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

const CACHE_TIMESTAMP_KEY = 'ARMS_FIREBASE_CACHE_TIMESTAMP_V1';
const CACHE_TTL_MS = 5 * 60 * 1000;

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
      const cachedAt = Number(localStorage.getItem(CACHE_TIMESTAMP_KEY) || 0);
      if (!force && cachedAt > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
        if (mounted) setIsInitializing(false);
        return;
      }

      try {
        let updatedStore = store;
        
        // 1. Fetch from Firebase / Sheets
        try {
          updatedStore = await fetchStoreFromFirebase(updatedStore);
        } catch (fbErr) {
          console.warn('Firebase sync note:', fbErr);
        }

        // 2. Fetch from Supabase if configured
        if (isSupabaseConfigured) {
          try {
            updatedStore = await fetchStoreFromSupabase(updatedStore);
          } catch (sbErr) {
            console.warn('Supabase fetch note:', sbErr);
          }
        }

        if (mounted) {
          setStore(updatedStore);
          saveStore(updatedStore);
          localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
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

    // Auto-sync every 30 seconds
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
    
    // 2. Debounced push to Remote Databases (Firebase & Supabase)
    setIsSyncing(true);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        // Sync to Firebase / Sheets
        await syncStoreToFirebase(lastSyncedStoreRef.current, newStore);
        
        // Sync to Supabase
        if (isSupabaseConfigured) {
          await syncStoreToSupabase(lastSyncedStoreRef.current, newStore);
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
      let refreshedStore = await fetchStoreFromFirebase(store);
      if (isSupabaseConfigured) {
        refreshedStore = await fetchStoreFromSupabase(refreshedStore);
      }
      
      setStore(refreshedStore);
      saveStore(refreshedStore);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
      
      await syncStoreToFirebase(store, refreshedStore);
      if (isSupabaseConfigured) {
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
      
      // Also push to Supabase if configured
      let sbResult: SupabaseSyncResult | null = null;
      if (isSupabaseConfigured) {
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
