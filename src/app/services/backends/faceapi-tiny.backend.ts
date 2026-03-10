import * as faceapi from '@vladmandic/face-api';
import { DetectionBackend, DetectionMethod, DetectionMethods } from '../detection-backend';
import { prepareImageForInference } from '../../utils/image-utils';

export class FaceApiTinyBackend implements DetectionBackend {
  readonly method: DetectionMethod = DetectionMethods.FaceApiTiny;

  private loaded = false;

  isLoaded(): boolean {
    return this.loaded;
  }

  async load(): Promise<void> {
    const modelPath = '/assets/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    this.loaded = true;
  }

  async getEmbeddings(image: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array[]> {
    const input = prepareImageForInference(image);
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 });
    const detections = await faceapi
      .detectAllFaces(input, options)
      .withFaceLandmarks(true) // true = use tiny landmark model
      .withFaceDescriptors();
    return detections.map((d) => d.descriptor);
  }
}
