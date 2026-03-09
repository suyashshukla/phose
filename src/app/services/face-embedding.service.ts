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
      const detections = await this.detection.detectFaces(image);
      return detections.map((detection) => detection.descriptor);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Returns the single face embedding for a query image.
   * Throws if there are 0 or more than 1 face.
   */
  async getQueryEmbedding(
    image: HTMLImageElement | HTMLCanvasElement,
  ): Promise<Float32Array> {
    const detections = await this.detection.detectFaces(image);

    if (detections.length === 0) {
      throw new Error('No face detected. Please use an image with exactly one face.');
    }
    if (detections.length > 1) {
      throw new Error(
        `${detections.length} faces detected. Please upload an image containing exactly one face.`,
      );
    }

    return detections[0].descriptor;
  }
}
