export interface FaceEmbedding {
  filePath: string;
  fileName: string;
  file: File;
  /** One embedding per detected face in the image */
  embeddings: Float32Array[];
}

export interface EmbeddingCacheEntry {
  filePath: string;
  fileSize: number;
  fileLastModified: number;
  /** Serialized as number[][] for IndexedDB storage */
  embeddings: number[][];
  timestamp: number;
}

export type AppState =
  | 'idle'
  | 'loading-models'
  | 'models-ready'
  | 'scanning'
  | 'complete'
  | 'error';

export interface ScanProgress {
  current: number;
  total: number;
  currentFileName: string;
}
