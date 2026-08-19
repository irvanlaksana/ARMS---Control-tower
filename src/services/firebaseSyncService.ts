import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ARMSStore } from './armsDataService';

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

export async function fetchStoreFromFirebase(currentStore: ARMSStore): Promise<ARMSStore> {
  const newStore = { ...currentStore };
  const keys = Object.keys(newStore) as (keyof ARMSStore)[];
  
  for (const key of keys) {
    try {
      if (key === 'settings') {
        const snap = await getDocs(collection(db, 'settings'));
        if (!snap.empty) {
          newStore.settings = { ...newStore.settings, ...snap.docs[0].data() } as any;
        }
      } else {
        const snap = await getDocs(collection(db, String(key)));
        if (!snap.empty) {
          newStore[key] = snap.docs.map(d => d.data()) as any;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch ${key} from Firebase`, e);
    }
  }
  return newStore;
}

export async function pushFullStoreToFirebase(store: ARMSStore): Promise<{ totalItems: number; collectionsCount: number }> {
  const keys = Object.keys(store) as (keyof ARMSStore)[];
  const promises: Promise<void>[] = [];
  let totalItems = 0;
  let collectionsCount = 0;

  for (const key of keys) {
    if (key === 'settings') {
      if (store.settings) {
        promises.push(setDoc(doc(db, 'settings', 'main'), cleanData(store.settings)));
        collectionsCount++;
        totalItems++;
      }
      continue;
    }

    const items = (store[key] as any[]) || [];
    if (items.length > 0) {
      collectionsCount++;
    }
    for (const item of items) {
      if (!item || !item.id) continue;
      promises.push(setDoc(doc(db, String(key), item.id), cleanData(item)));
      totalItems++;
    }
  }

  await Promise.all(promises);
  return { totalItems, collectionsCount };
}

export async function syncStoreToFirebase(oldStore: ARMSStore, newStore: ARMSStore) {
  const keys = Object.keys(newStore) as (keyof ARMSStore)[];
  const promises: Promise<void>[] = [];
  
  for (const key of keys) {
    if (key === 'settings') {
      if (JSON.stringify(oldStore.settings) !== JSON.stringify(newStore.settings)) {
        promises.push(setDoc(doc(db, 'settings', 'main'), cleanData(newStore.settings)));
      }
      continue;
    }
    
    const oldItems = (oldStore[key] as any[]) || [];
    const newItems = (newStore[key] as any[]) || [];
    
    const oldMap = new Map(oldItems.map(item => [item.id, item]));
    const newMap = new Map(newItems.map(item => [item.id, item]));
    
    for (const item of newItems) {
      if (!item.id) continue;
      const oldItem = oldMap.get(item.id);
      if (JSON.stringify(item) !== JSON.stringify(oldItem)) {
        promises.push(setDoc(doc(db, String(key), item.id), cleanData(item)));
      }
    }
    
    for (const oldItem of oldItems) {
      if (!oldItem.id) continue;
      if (!newMap.has(oldItem.id)) {
        promises.push(deleteDoc(doc(db, String(key), oldItem.id)));
      }
    }
  }
  
  try {
    await Promise.all(promises);
  } catch (e) {
    console.error('Firebase sync error', e);
  }
}
