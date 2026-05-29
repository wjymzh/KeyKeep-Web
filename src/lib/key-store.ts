/**
 * Secure CryptoKey storage using IndexedDB.
 *
 * CryptoKey objects with `extractable: false` can be stored in IndexedDB
 * via structured cloning. JavaScript cannot read the raw key bytes —
 * it can only use the key for encrypt/decrypt through the Web Crypto API.
 *
 * This is fundamentally more secure than storing a plaintext master password
 * in sessionStorage/localStorage, because even XSS cannot exfiltrate the key material.
 */

const DB_NAME = 'keykeep_keystore';
const STORE_NAME = 'keys';
const ENC_KEY_ID = 'enc_key';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeEncryptionKey(key: CryptoKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(key, ENC_KEY_ID);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadEncryptionKey(): Promise<CryptoKey | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(ENC_KEY_ID);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return null;
  }
}

export async function clearEncryptionKey(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // ignore — DB might not exist yet
  }
}

export async function hasEncryptionKey(): Promise<boolean> {
  const key = await loadEncryptionKey();
  return key !== null;
}
