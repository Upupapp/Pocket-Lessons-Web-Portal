/**
 * Browser storage.
 * - Pilot preview: small records (users, learners, lessons, assessments) live in localStorage as JSON.
 * - Recorded audio and pictures are binary, so they live in IndexedDB; with the API they are uploaded too.
 * The services are the only code that touches it.
 */
import { api, apiMode } from './api';

const PREFIX = 'pl.v1.';

export const local = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.error('Could not save to browser storage', err);
      alert('This browser could not save your work. Free some space or leave private browsing.');
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
  clearAll(): void {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  },
};

export const session = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(PREFIX + key, value);
    } catch {
      /* ignore */
    }
  },
};

const DB_NAME = 'pocket-lessons-media';
const STORE = 'blobs';
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

/** The recordings and pictures kept in this browser (IndexedDB). */
const cache = {
  put: (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id)),
  get: (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id)),
  delete: (id: string) => tx<undefined>('readwrite', (s) => s.delete(id)),
  clear: () => tx<undefined>('readwrite', (s) => s.clear()),
};

/**
 * Recorded voices and pictures.
 * With the API, the server holds them and this browser keeps a cache; put() fails if the upload fails,
 * so a lesson never points at a recording the server does not have.
 */
export const media = {
  async put(id: string, blob: Blob): Promise<void> {
    if (apiMode) await api.upload(`/media/${encodeURIComponent(id)}`, blob);
    await cache.put(id, blob).catch((err) => {
      if (!apiMode) throw err;
    });
  },
  async get(id: string): Promise<Blob | undefined> {
    const cached = await cache.get(id).catch(() => undefined);
    if (cached || !apiMode) return cached;
    try {
      const blob = await api.download(`/media/${encodeURIComponent(id)}`);
      await cache.put(id, blob).catch(() => undefined);
      return blob;
    } catch {
      return undefined;
    }
  },
  async delete(id: string): Promise<void> {
    if (apiMode) await api.delete(`/media/${encodeURIComponent(id)}`);
    await cache.delete(id);
  },
  /** Removes this browser's copies only. */
  clearCache(): Promise<undefined> {
    return cache.clear();
  },
};
