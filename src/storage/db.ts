import { TaikoChart } from '../types/chart';

const DB_NAME = 'TaikoEditorDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('charts')) {
          db.createObjectStore('charts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio', { keyPath: 'chartId' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function saveChartToDb(chart: TaikoChart): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('charts', 'readwrite');
    const store = tx.objectStore('charts');
    const req = store.put({ ...chart, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadChartFromDb(id: string): Promise<TaikoChart | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('charts', 'readonly');
    const store = tx.objectStore('charts');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllChartsFromDb(): Promise<TaikoChart[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('charts', 'readonly');
    const store = tx.objectStore('charts');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteChartFromDb(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['charts', 'audio'], 'readwrite');
    tx.objectStore('charts').delete(id);
    tx.objectStore('audio').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveAudioToDb(chartId: string, blob: Blob, fileName: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audio', 'readwrite');
    const store = tx.objectStore('audio');
    const req = store.put({ chartId, blob, fileName, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioFromDb(chartId: string): Promise<{ blob: Blob; fileName: string } | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audio', 'readonly');
    const store = tx.objectStore('audio');
    const req = store.get(chartId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getActiveProjectId(): Promise<string | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('activeProjectId');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function setActiveProjectId(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put(id, 'activeProjectId');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
