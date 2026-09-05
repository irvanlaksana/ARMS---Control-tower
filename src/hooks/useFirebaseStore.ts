import { useState, useEffect, useCallback, useRef } from 'react';
import { ARMSStore, getStoredStore, initializeARMSStore, saveStore } from '../services/armsDataService';
import { fetchStoreFromFirebase, syncStoreToFirebase, pushFullStoreToFirebase } from '../services/firebaseSyncService';

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
  
  // We keep a reference to the latest synced store to properly diff new changes against
  // what's actually in Firebase, preventing stale closures in the debounced timeout.
  const lastSyncedStoreRef = useRef<ARMSStore>(store);

  // Initial Fetch from Firebase
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
        const updatedStore = await fetchStoreFromFirebase(store);
        if (mounted) {
          setStore(updatedStore);
          saveStore(updatedStore);
          localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
          lastSyncedStoreRef.current = updatedStore;
          setIsInitializing(false);
        }
      } catch (err) {
        console.warn('Firebase sync failed:', err);
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
    
    // 2. Debounced push to Firebase
    setIsSyncing(true);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncStoreToFirebase(lastSyncedStoreRef.current, newStore)
        .then(() => {
          lastSyncedStoreRef.current = newStore;
          setIsSyncing(false);
        })
        .catch(e => {
          console.error('Firebase sync error:', e);
          setError(e);
          setIsSyncing(false);
        });
    }, 500);
  }, []);

  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const refreshedStore = await fetchStoreFromFirebase(store);
      
      // Update local state with latest from Firebase
      setStore(refreshedStore);
      saveStore(refreshedStore);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
      
      // Diff and push any unsynced local changes (if they exist)
      await syncStoreToFirebase(store, refreshedStore);
      
      lastSyncedStoreRef.current = refreshedStore;
      setError(null);
    } catch (e: any) {
      console.error('Manual Firebase sync failed:', e);
      setError(e);
    } finally {
      setIsSyncing(false);
    }
  }, [store]);

  const pushFullData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await pushFullStoreToFirebase(store);
      lastSyncedStoreRef.current = store;
      setError(null);
      return result;
    } catch (e: any) {
      console.error('Push full data to Firebase failed:', e);
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
    isInitializing,
    isSyncing,
    error
  };
}
