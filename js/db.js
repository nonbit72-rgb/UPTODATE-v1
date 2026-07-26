/* db.js — IndexedDB wrapper for UPTODATE
   Stores: transactions, attendance, lectures, teachers, study
*/
const DB_NAME = 'uptodateDB';
const DB_VERSION = 1;
let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('attendance')) {
        db.createObjectStore('attendance', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('lectures')) {
        db.createObjectStore('lectures', { keyPath: 'nameKey' });
      }
      if (!db.objectStoreNames.contains('teachers')) {
        db.createObjectStore('teachers', { keyPath: 'nameKey' });
      }
      if (!db.objectStoreNames.contains('study')) {
        db.createObjectStore('study', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

const DB = {
  // Generic CRUD
  async put(storeName, record) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.put(record);
      r.onsuccess = () => resolve(record);
      r.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(storeName, key) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.delete(key);
      r.onsuccess = () => resolve(true);
      r.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll(storeName) {
    const store = await tx(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = (e) => reject(e.target.error);
    });
  },

  async get(storeName, key) {
    const store = await tx(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = (e) => reject(e.target.error);
    });
  },

  // Name-memory helpers (lectures / teachers)
  normalizeName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  },

  async addNameIfNew(storeName, rawName) {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!name) return null;
    const nameKey = DB.normalizeName(name);
    const existing = await DB.get(storeName, nameKey);
    if (existing) return existing;
    const record = { nameKey, name };
    await DB.put(storeName, record);
    return record;
  },

  async removeName(storeName, nameKey) {
    return DB.delete(storeName, nameKey);
  }
};
