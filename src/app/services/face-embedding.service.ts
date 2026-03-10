import { Injectable, inject } from '@angular/core';
import { FaceDetectionService } from './face-detection.service';
import { fileToImageElement } from '../utils/image-utils';

@Injectable({ providedIn: 'root' })
export class FaceEmbeddingService {
  private readonly detection = inject(FaceDetectionService);

  /**
   * Returns all face embeddings found in a file.
   * Returns an empty array when no faces are detected.
   * Always revokes the object URL when done.
   */
  async getEmbeddingsForFile(file: File): Promise<Float32Array[]> {
    const { image, objectUrl } = await fileToImageElement(file);
    try {
      return await this.detection.detectFaces(image);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Returns the single face embedding for a query image.
   * Throws if there are 0 or more than 1 face detected.
   */
  async getQueryEmbedding(
    image: HTMLImageElement | HTMLCanvasElement,
  ): Promise<Float32Array> {
    const embeddings = await this.detection.detectFaces(image);

    if (embeddings.length === 0) {
      throw new Error('No face detected. Please use an image with exactly one face.');
    }
    if (embeddings.length > 1) {
      throw new Error(
        `${embeddings.length} faces detected. Please upload an image containing exactly one face.`,
      );
    }

    return embeddings[0];
  }
}
