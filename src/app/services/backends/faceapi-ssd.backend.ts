import * as faceapi from '@vladmandic/face-api';
import { DetectionBackend, DetectionMethod, DetectionMethods } from '../detection-backend';
import { prepareImageForInference } from '../../utils/image-utils';

export class FaceApiSsdBackend implements DetectionBackend {
  readonly method: DetectionMethod = DetectionMethods.FaceApiSsd;

  private loaded = false;

  isLoaded(): boolean {
    return this.loaded;
  }

  async load(): Promise<void> {
    const modelPath = '/assets/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    this.loaded = true;
  }

  async getEmbeddings(image: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array[]> {
    const input = prepareImageForInference(image);
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 100 });
    const detections = await faceapi
      .detectAllFaces(input, options)
      .withFaceLandmarks()
      .withFaceDescriptors();
    return detections.map((d) => d.descriptor);
  }
}
