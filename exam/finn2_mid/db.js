/* ========================================
   IndexedDB Session Storage
   Database: "finn2_exam", Store: "sessions"
======================================== */

const DB_NAME = "finn2_exam";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

let _db = null;

/**
 * Opens or creates the IndexedDB database.
 * Initializes the "sessions" object store if needed.
 */
async function openDB() {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    };

    req.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    req.onerror = (event) => {
      reject(new Error(`Failed to open IndexedDB: ${event.target.error}`));
    };
  });
}

/**
 * Saves or updates a session in the database.
 * @param {Object} session - The session object to save
 */
async function saveSession(session) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const req = store.put(session);

    req.onsuccess = () => resolve(session);
    req.onerror = () => reject(new Error(`Failed to save session: ${req.error}`));
  });
}

/**
 * Retrieves a single session by ID.
 * @param {string} id - The session UUID
 * @returns {Object|undefined} The session object or undefined if not found
 */
async function getSession(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error(`Failed to get session: ${req.error}`));
  });
}

/**
 * Retrieves all sessions, sorted by createdAt (newest first).
 * @returns {Array} Array of session objects
 */
async function getAllSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const req = index.getAll();

    req.onsuccess = () => {
      const sessions = req.result || [];
      // Sort by createdAt descending (newest first)
      sessions.sort((a, b) => b.createdAt - a.createdAt);
      resolve(sessions);
    };

    req.onerror = () => reject(new Error(`Failed to get all sessions: ${req.error}`));
  });
}

/**
 * Deletes a session by ID.
 * @param {string} id - The session UUID
 */
async function deleteSession(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to delete session: ${req.error}`));
  });
}
