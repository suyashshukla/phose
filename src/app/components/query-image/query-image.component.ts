import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FaceEmbeddingService } from '../../services/face-embedding.service';
import { canvasToFile } from '../../utils/image-utils';

export interface QueryResult {
  file: File;
  previewUrl: string;
  embedding: Float32Array;
}

@Component({
  selector: 'app-query-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './query-image.component.html',
  styleUrl: './query-image.component.css',
})
export class QueryImageComponent implements OnDestroy {
  private readonly embeddingService = inject(FaceEmbeddingService);

  readonly queryReady = output<QueryResult>();
  readonly previewUrl = signal<string | null>(null);
  readonly processing = signal(false);
  readonly error = signal<string | null>(null);
  readonly cameraActive = signal(false);
  readonly dragOver = signal(false);

  private stream: MediaStream | null = null;
  private currentPreviewUrl: string | null = null;

  private readonly fileInputElementReference = viewChild<ElementRef<HTMLInputElement>>('fileInputElement');
  private readonly videoElementReference = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  private readonly canvasElementReference = viewChild<ElementRef<HTMLCanvasElement>>('canvasElement');

  triggerFileInput(): void {
    if (this.previewUrl()) return;
    this.fileInputElementReference()?.nativeElement.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.processFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void this.processFile(file);
    input.value = '';
  }

  async startCamera(): Promise<void> {
    this.error.set(null);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.cameraActive.set(true);
      setTimeout(() => {
        const video = this.videoElementReference()?.nativeElement;
        if (video && this.stream) video.srcObject = this.stream;
      }, 50);
    } catch {
      this.error.set('Camera access denied. Please allow camera permissions and try again.');
    }
  }

  async captureFrame(): Promise<void> {
    const video = this.videoElementReference()?.nativeElement;
    const canvas = this.canvasElementReference()?.nativeElement;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.stopCamera();
    try {
      const file = await canvasToFile(canvas, 'capture.jpg');
      await this.processFile(file);
    } catch {
      this.error.set('Failed to capture image. Please try again.');
    }
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.cameraActive.set(false);
  }

  reset(): void {
    if (this.currentPreviewUrl) {
      URL.revokeObjectURL(this.currentPreviewUrl);
      this.currentPreviewUrl = null;
    }
    this.previewUrl.set(null);
    this.error.set(null);
  }

  private async processFile(file: File): Promise<void> {
    this.error.set(null);
    this.processing.set(true);
    const objectUrl = URL.createObjectURL(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageElement = new Image();
      imageElement.onload = () => resolve(imageElement);
      imageElement.onerror = reject;
      imageElement.src = objectUrl;
    });
    try {
      const embedding = await this.embeddingService.getQueryEmbedding(image);
      if (this.currentPreviewUrl) URL.revokeObjectURL(this.currentPreviewUrl);
      this.currentPreviewUrl = objectUrl;
      this.previewUrl.set(objectUrl);
      this.queryReady.emit({ file, previewUrl: objectUrl, embedding });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      this.error.set(error instanceof Error ? error.message : 'Failed to process image.');
    } finally {
      this.processing.set(false);
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.currentPreviewUrl) URL.revokeObjectURL(this.currentPreviewUrl);
  }
}
