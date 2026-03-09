import { Injectable } from '@angular/core';
import { FaceEmbedding } from '../models/face-embedding.model';
import { SearchResult } from '../models/search-result.model';
import { bestDistance, distanceToSimilarity, DISTANCE_THRESHOLD } from '../utils/similarity';

@Injectable({ providedIn: 'root' })
export class FaceSearchService {
  /**
   * Compares the query embedding against every face in the dataset.
   * Returns results for images where at least one face is within threshold,
   * sorted by ascending distance (best match first).
   */
  search(
    queryEmbedding: Float32Array,
    dataset: FaceEmbedding[],
    threshold = DISTANCE_THRESHOLD,
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const entry of dataset) {
      if (entry.embeddings.length === 0) continue;

      const distance = bestDistance(queryEmbedding, entry.embeddings);
      if (distance <= threshold) {
        const thumbnailUrl = URL.createObjectURL(entry.file);
        results.push({
          file: entry.file,
          filePath: entry.filePath,
          fileName: entry.fileName,
          thumbnailUrl,
          similarity: distanceToSimilarity(distance),
          distance,
          faceCount: entry.embeddings.length,
        });
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  /** Revoke all object URLs in a results array to free memory. */
  revokeResults(results: SearchResult[]): void {
    for (const result of results) {
      URL.revokeObjectURL(result.thumbnailUrl);
    }
  }
}
