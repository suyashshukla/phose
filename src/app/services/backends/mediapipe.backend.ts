import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import * as faceapi from '@vladmandic/face-api';
import { DetectionBackend, DetectionMethod, DetectionMethods } from '../detection-backend';

/**
 * Canonical eye positions (as fraction of 150×150) that face-api's
 * FaceRecognitionNet expects for its aligned-face input.
 */
const CANONICAL_LEFT_EYE = { x: 0.37, y: 0.38 };
const CANONICAL_RIGHT_EYE = { x: 0.63, y: 0.38 };
const OUT_SIZE = 150;

/**
 * Produces a 150×150 aligned face canvas from two eye-center coordinates
 * using a similarity transform (rotation + uniform scale + translation).
 */
function alignFaceByEyes(
  image: HTMLImageElement | HTMLCanvasElement,
  leftEye: { x: number; y: number },
  rightEye: { x: number; y: number },
): HTMLCanvasElement {
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const srcDist = Math.sqrt(dx * dx + dy * dy);
  const dstDist = (CANONICAL_RIGHT_EYE.x - CANONICAL_LEFT_EYE.x) * OUT_SIZE;
  const scale = dstDist / Math.max(srcDist, 1e-6);
  const angle = Math.atan2(dy, dx);

  const srcCx = (leftEye.x + rightEye.x) / 2;
  const srcCy = (leftEye.y + rightEye.y) / 2;
  const dstCx = ((CANONICAL_LEFT_EYE.x + CANONICAL_RIGHT_EYE.x) / 2) * OUT_SIZE;
  const dstCy = ((CANONICAL_LEFT_EYE.y + CANONICAL_RIGHT_EYE.y) / 2) * OUT_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = OUT_SIZE;
  canvas.height = OUT_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.translate(dstCx, dstCy);
  ctx.rotate(-angle);
  ctx.scale(scale, scale);
  ctx.translate(-srcCx, -srcCy);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
  return canvas;
}

export class MediaPipeBackend implements DetectionBackend {
  readonly method: DetectionMethod = DetectionMethods.MediaPipe;

  private faceDetector: FaceDetector | null = null;
  private loaded = false;

  isLoaded(): boolean {
    return this.loaded;
  }

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks('/assets/mediapipe/wasm');
    this.faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        // BlazeFace short-range model — ~900 KB, cached by browser after first fetch.
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.4,
      minSuppressionThreshold: 0.3,
    });
    // Reuse the recognition net (shared with the other backends).
    await faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models');
    this.loaded = true;
  }

  async getEmbeddings(image: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array[]> {
    if (!this.faceDetector) return [];

    const imgW = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const imgH = image instanceof HTMLImageElement ? image.naturalHeight : image.height;

    const result = this.faceDetector.detect(image);
    const embeddings: Float32Array[] = [];

    for (const detection of result.detections) {
      const kp = detection.keypoints;
      if (!kp || kp.length < 2) continue;

      // BlazeFace keypoint order: [0] right eye, [1] left eye
      // (from the subject's perspective; in image space [0] is the left side)
      const leftEye = { x: kp[0].x * imgW, y: kp[0].y * imgH };
      const rightEye = { x: kp[1].x * imgW, y: kp[1].y * imgH };

      const aligned = alignFaceByEyes(image, leftEye, rightEye);
      const descriptor = await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(aligned);
      if (descriptor instanceof Float32Array) {
        embeddings.push(descriptor);
      }
    }

    return embeddings;
  }
}
