/**
 * Browser storage for the pilot preview.
 * - Small records (users, learners, lessons, assessments) live in localStorage as JSON.
 * - Recorded audio and pictures are binary and too big for localStorage, so they live in IndexedDB.
 * This is a stand-in until the Node API on Linode exists; the services are the only code that touches it.
 */

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

export const media = {
  put(id: string, blob: Blob): Promise<IDBValidKey> {
    return tx('readwrite', (s) => s.put(blob, id));
  },
  get(id: string): Promise<Blob | undefined> {
    return tx<Blob | undefined>('readonly', (s) => s.get(id));
  },
  delete(id: string): Promise<undefined> {
    return tx<undefined>('readwrite', (s) => s.delete(id));
  },
  clear(): Promise<undefined> {
    return tx<undefined>('readwrite', (s) => s.clear());
  },
};
