/**
 * Writing samples (PNG data URLs) in IndexedDB.
 *
 * They are far too big for localStorage, so they get their own store. The
 * newest `MAX_SAMPLES` are kept and older ones are pruned on write, which
 * keeps the database small enough to stay well inside browser quotas.
 *
 * Every function resolves rather than rejects when IndexedDB is unavailable
 * (private browsing, blocked storage) so the rest of the app keeps working —
 * practice without a saved picture is still practice.
 */

import type { WritingSample } from './types';

const DB_NAME = 'smart-writing-pad';
const DB_VERSION = 1;
const STORE = 'samples';

export const MAX_SAMPLES = 60;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function putSample(sample: WritingSample): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  const stored = await new Promise<boolean>((resolve) => {
    const request = tx(db, 'readwrite').put(sample);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
  if (stored) await pruneSamples();
  return stored;
}

export async function listSamples(): Promise<WritingSample[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const request = tx(db, 'readonly').getAll();
    request.onsuccess = () => {
      const all = (request.result as WritingSample[]) ?? [];
      resolve(all.sort((a, b) => b.createdAt - a.createdAt));
    };
    request.onerror = () => resolve([]);
  });
}

export async function getSample(id: string): Promise<WritingSample | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = tx(db, 'readonly').get(id);
    request.onsuccess = () => resolve((request.result as WritingSample) ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function deleteSample(id: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const request = tx(db, 'readwrite').delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
}

export async function clearSamples(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const request = tx(db, 'readwrite').clear();
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

/** Drop the oldest samples beyond the cap. */
async function pruneSamples(): Promise<void> {
  const all = await listSamples();
  if (all.length <= MAX_SAMPLES) return;
  for (const sample of all.slice(MAX_SAMPLES)) await deleteSample(sample.id);
}

/** Only used by tests, to get a fresh handle after swapping in a fake. */
export function resetDbForTests(): void {
  dbPromise = null;
}
