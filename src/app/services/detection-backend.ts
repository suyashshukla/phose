/** Canonical string values for each detection backend. */
export const DetectionMethods = {
  FaceApiSsd: 'faceapi-ssd',
  FaceApiTiny: 'faceapi-tiny',
  MediaPipe: 'mediapipe',
} as const;

/** Union type derived from the constants — no separate maintenance required. */
export type DetectionMethod = (typeof DetectionMethods)[keyof typeof DetectionMethods];

export interface BackendOption {
  readonly method: DetectionMethod;
  readonly label: string;
  readonly badge: string;
  readonly badgeVariant: 'default' | 'fast' | 'fastest';
  readonly description: string;
  readonly note?: string;
}

export const BACKEND_OPTIONS: BackendOption[] = [
  {
    method: DetectionMethods.FaceApiSsd,
    label: 'SSD MobileNet v1',
    badge: 'Accurate',
    badgeVariant: 'default',
    description: 'Most accurate. Best for group photos, small faces, and non-frontal poses.',
  },
  {
    method: DetectionMethods.FaceApiTiny,
    label: 'Tiny Face Detector',
    badge: 'Fast',
    badgeVariant: 'fast',
    description: '2–3× faster than SSD. Best for well-lit, mostly frontal faces.',
  },
  {
    method: DetectionMethods.MediaPipe,
    label: 'MediaPipe BlazeFace',
    badge: 'Fastest',
    badgeVariant: 'fastest',
    description:
      '3–5× faster. Uses Google BlazeFace for detection and skips landmark inference entirely.',
    note: 'First use downloads the BlazeFace model (~900 KB) from Google CDN.',
  },
];

export interface DetectionBackend {
  readonly method: DetectionMethod;
  isLoaded(): boolean;
  load(): Promise<void>;
  /** Returns one 128-d embedding per detected face. */
  getEmbeddings(image: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array[]>;
}
