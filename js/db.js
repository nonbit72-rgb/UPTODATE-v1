/* db.js — single local data layer for UPTODATE.
   Everything lives in ONE IndexedDB database ('uptodateDB') on the device.
   No network is ever used to read/write this data — it works fully offline,
   and stays on the phone until you clear browser data or delete it in-app.

   ── ADDING A NEW MODULE / STORE IN FUTURE ──
   Just add one line to STORE_CONFIG below (name + keyPath). Bump DB_VERSION
   by 1 whenever you add/change a store, so onupgradeneeded runs again.
   Everything else (put/get/getAll/delete/query) already works generically.
*/
const DB_NAME = 'uptodateDB';
const DB_VERSION = 1;

// Single source of truth for every store in the app.
const STORE_CONFIG = [
  { name: 'transactions', keyPath: 'id' },
  { name: 'attendance', keyPath: 'id' },
  { name: 'lectures', keyPath: 'nameKey' },   // shared subject list — used by Attendance AND Study
  { name: 'teachers', keyPath: 'nameKey' },
  { name: 'study', keyPath: 'id' }
];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORE_CONFIG.forEach(({ name, keyPath }) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath });
        }
      });
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
  // ---- Generic CRUD (works for every store) ----
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

  // Get every record in a store whose field matches a value (case-insensitive
  // for strings). Used to link records across modules, e.g. all Study items
  // or Attendance entries that belong to the same lecture.
  async queryBy(storeName, field, value) {
    const all = await DB.getAll(storeName);
    if (value == null || value === '') return all;
    const target = String(value).trim().toLowerCase();
    return all.filter(r => String(r[field] || '').trim().toLowerCase() === target);
  },

  // ---- Name-memory helpers (shared "lectures"/"teachers" lists) ----
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
  },

  // Fills a <select> with Choose / remembered names / Custom..., reusable by
  // any module that needs the shared lecture or teacher list (Attendance,
  // Study, and anything added later).
  async populateNameSelect(selectEl, storeName, currentValue) {
    const items = (await DB.getAll(storeName)).sort((a, b) => a.name.localeCompare(b.name));
    const keep = currentValue !== undefined ? currentValue : selectEl.value;
    selectEl.innerHTML = '<option value="">Choose</option>' +
      items.map(i => `<option value="${i.nameKey.replace(/"/g, '&quot;')}">${i.name.replace(/</g, '&lt;')}</option>`).join('') +
      '<option value="__custom__">Custom...</option>';
    if (keep) selectEl.value = keep;
  }
};
