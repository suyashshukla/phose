import { Injectable, signal } from '@angular/core';
import {
  DetectionBackend,
  DetectionMethod,
  DetectionMethods,
  BACKEND_OPTIONS,
  BackendOption,
} from './detection-backend';
import { FaceApiSsdBackend } from './backends/faceapi-ssd.backend';
import { FaceApiTinyBackend } from './backends/faceapi-tiny.backend';
import { MediaPipeBackend } from './backends/mediapipe.backend';

@Injectable({ providedIn: 'root' })
export class FaceDetectionService {
  /** All available backend options — use these to populate UI controls. */
  static readonly BACKEND_OPTIONS: BackendOption[] = BACKEND_OPTIONS;

  readonly selectedMethod = signal<DetectionMethod>(DetectionMethods.FaceApiSsd);
  readonly modelsLoading = signal(false);
  readonly modelsLoaded = signal(false);
  readonly modelLoadError = signal<string | null>(null);

  private readonly backends = new Map<DetectionMethod, DetectionBackend>();

  private getBackend(method: DetectionMethod): DetectionBackend {
    if (!this.backends.has(method)) {
      switch (method) {
        case DetectionMethods.FaceApiSsd:
          this.backends.set(method, new FaceApiSsdBackend());
          break;
        case DetectionMethods.FaceApiTiny:
          this.backends.set(method, new FaceApiTinyBackend());
          break;
        case DetectionMethods.MediaPipe:
          this.backends.set(method, new MediaPipeBackend());
          break;
      }
    }
    return this.backends.get(method)!;
  }

  async loadModels(): Promise<void> {
    const backend = this.getBackend(this.selectedMethod());
    if (backend.isLoaded()) {
      this.modelsLoaded.set(true);
      return;
    }
    if (this.modelsLoading()) return;

    this.modelsLoading.set(true);
    this.modelLoadError.set(null);

    try {
      await backend.load();
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
   * Switch to a new detection method and reload models for it.
   * Resolves once models are ready; rejects on load error.
   */
  async selectMethod(method: DetectionMethod): Promise<void> {
    if (method === this.selectedMethod()) return;
    this.selectedMethod.set(method);
    this.modelsLoaded.set(false);
    this.modelLoadError.set(null);
    await this.loadModels();
  }

  /** Returns one 128-d embedding per detected face. */
  async detectFaces(
    image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  ): Promise<Float32Array[]> {
    if (image instanceof HTMLVideoElement) return [];
    return this.getBackend(this.selectedMethod()).getEmbeddings(image);
  }

  /** Returns the first detected face descriptor, or undefined if none found. */
  async detectSingleFace(
    image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  ): Promise<Float32Array | undefined> {
    if (image instanceof HTMLVideoElement) return undefined;
    const embeddings = await this.detectFaces(image);
    return embeddings[0];
  }
}
