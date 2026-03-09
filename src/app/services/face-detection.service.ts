import { Injectable, signal } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

@Injectable({ providedIn: 'root' })
export class FaceDetectionService {
  readonly modelsLoaded = signal(false);
  readonly modelsLoading = signal(false);
  readonly modelLoadError = signal<string | null>(null);

  async loadModels(): Promise<void> {
    if (this.modelsLoaded()) return;
    if (this.modelsLoading()) return;

    this.modelsLoading.set(true);
    this.modelLoadError.set(null);

    try {
      const modelPath = '/assets/models';
      // SSD MobileNet v1 — trained on the WIDER FACE dataset which contains group/crowd
      // photos with many faces at small scales. Significantly more accurate than
      // TinyFaceDetector for multi-person images, small faces, and non-frontal poses.
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
      this.modelsLoaded.set(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.modelLoadError.set(`Failed to load face detection models: ${message}`);
      throw error;
    } finally {
      this.modelsLoading.set(false);
    }
  }

  /**
   * Detect all faces in an image and return their 128-d descriptors.
   *
   * @param minConfidence Detection confidence threshold (0–1).
   *   Lower → more faces found, but more false positives.
   *   0.4 is a good balance for group photos.
   */
  async detectFaces(
    image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    minConfidence = 0.4,
  ): Promise<
    faceapi.WithFaceDescriptor<
      faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
    >[]
  > {
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 100 });
    return faceapi.detectAllFaces(image, options).withFaceLandmarks().withFaceDescriptors();
  }

  /** Detect at most one face — used for query image validation. */
  async detectSingleFace(
    image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    minConfidence = 0.5,
  ): Promise<
    | faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
      >
    | undefined
  > {
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 10 });
    return faceapi.detectSingleFace(image, options).withFaceLandmarks().withFaceDescriptor();
  }
}
