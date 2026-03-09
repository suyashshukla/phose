export interface SearchResult {
  file: File;
  filePath: string;
  fileName: string;
  /** Object URL created via URL.createObjectURL — must be revoked on cleanup */
  thumbnailUrl: string;
  /** Cosine similarity 0–1, higher = better match */
  similarity: number;
  /** Euclidean distance, lower = better match */
  distance: number;
  faceCount: number;
}
