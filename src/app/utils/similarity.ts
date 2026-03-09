/** Euclidean distance between two 128-d face descriptors (lower = more similar). */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Cosine similarity (0–1, higher = more similar). */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Converts euclidean distance to a 0–1 similarity score.
 * face-api descriptors are L2-normalised so distance ∈ [0, ~2].
 */
export function distanceToSimilarity(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance / 2));
}

/**
 * Returns the best (lowest) euclidean distance between a query embedding
 * and any face in the target image.
 */
export function bestDistance(query: Float32Array, targets: Float32Array[]): number {
  return targets.reduce((best, t) => Math.min(best, euclideanDistance(query, t)), Infinity);
}

/**
 * Default euclidean distance threshold.
 * Faces with distance ≤ this value are considered a match.
 * Lower = stricter (fewer false positives). Typical range: 0.4 – 0.6.
 */
export const DISTANCE_THRESHOLD = 0.5;
export const THRESHOLD_MIN = 0.3;
export const THRESHOLD_MAX = 0.7;
