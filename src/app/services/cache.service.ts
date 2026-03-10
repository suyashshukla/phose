import { Injectable } from '@angular/core';
import { EmbeddingCacheEntry } from '../models/face-embedding.model';

const DB_NAME = 'phose-face-cache';
const STORE_NAME = 'embeddings';
// Bump version when cache schema or key format changes to clear stale entries.
const DB_VERSION = 2;
/** Cache entries older than 7 days are considered stale. */
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class CacheService {
  private database: IDBDatabase | null = null;

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.database) return this.database;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'filePath' });
        }
      };

      request.onsuccess = (event) => {
        this.database = (event.target as IDBOpenDBRequest).result;
        resolve(this.database);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async get(filePath: string, file: File): Promise<Float32Array[] | null> {
    try {
      const database = await this.openDatabase();
      return new Promise((resolve) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(filePath);

        request.onsuccess = () => {
          const entry = request.result as EmbeddingCacheEntry | undefined;
          if (
            !entry ||
            entry.fileSize !== file.size ||
            entry.fileLastModified !== file.lastModified ||
            Date.now() - entry.timestamp > MAX_CACHE_AGE_MS
          ) {
            resolve(null);
            return;
          }
          resolve(entry.embeddings.map((embedding) => new Float32Array(embedding)));
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async set(filePath: string, file: File, embeddings: Float32Array[]): Promise<void> {
    try {
      const database = await this.openDatabase();
      const entry: EmbeddingCacheEntry = {
        filePath,
        fileSize: file.size,
        fileLastModified: file.lastModified,
        embeddings: embeddings.map((embedding) => Array.from(embedding)),
        timestamp: Date.now(),
      };

      return new Promise((resolve) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(entry);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve(); // non-fatal
      });
    } catch {
      // Cache writes are best-effort; ignore failures
    }
  }

  async clear(): Promise<void> {
    try {
      const database = await this.openDatabase();
      return new Promise((resolve) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
}
