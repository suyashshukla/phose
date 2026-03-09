import { Injectable } from '@angular/core';
import { EmbeddingCacheEntry } from '../models/face-embedding.model';

const DB_NAME = 'phose-face-cache';
const STORE_NAME = 'embeddings';
const DB_VERSION = 1;
/** Cache entries older than 7 days are considered stale. */
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class CacheService {
  private db: IDBDatabase | null = null;

  private async openDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'filePath' });
        }
      };

      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      req.onerror = () => reject(req.error);
    });
  }

  async get(filePath: string, file: File): Promise<Float32Array[] | null> {
    try {
      const db = await this.openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(filePath);

        req.onsuccess = () => {
          const entry = req.result as EmbeddingCacheEntry | undefined;
          if (
            !entry ||
            entry.fileSize !== file.size ||
            entry.fileLastModified !== file.lastModified ||
            Date.now() - entry.timestamp > MAX_CACHE_AGE_MS
          ) {
            resolve(null);
            return;
          }
          resolve(entry.embeddings.map((e) => new Float32Array(e)));
        };

        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async set(filePath: string, file: File, embeddings: Float32Array[]): Promise<void> {
    try {
      const db = await this.openDb();
      const entry: EmbeddingCacheEntry = {
        filePath,
        fileSize: file.size,
        fileLastModified: file.lastModified,
        embeddings: embeddings.map((e) => Array.from(e)),
        timestamp: Date.now(),
      };

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); // non-fatal
      });
    } catch {
      // Cache writes are best-effort; ignore failures
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
}
