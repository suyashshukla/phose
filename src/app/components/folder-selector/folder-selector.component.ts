import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FileSystemService } from '../../services/file-system.service';
import { FaceEmbeddingService } from '../../services/face-embedding.service';
import { FaceDetectionService } from '../../services/face-detection.service';
import { CacheService } from '../../services/cache.service';
import { FaceEmbedding, ScanProgress } from '../../models/face-embedding.model';
import { DetectionMethod, BACKEND_OPTIONS } from '../../services/detection-backend';

const BATCH_SIZE = 10;

@Component({
  selector: 'app-folder-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-selector.component.html',
  styleUrl: './folder-selector.component.css',
})
export class FolderSelectorComponent {
  private readonly fileSystemService = inject(FileSystemService);
  private readonly embeddingService = inject(FaceEmbeddingService);
  readonly detection = inject(FaceDetectionService);
  private readonly cache = inject(CacheService);

  readonly queryEmbedding = input<Float32Array | null>(null);

  readonly scanStarted = output<void>();
  readonly progressUpdate = output<ScanProgress>();
  readonly scanComplete = output<FaceEmbedding[]>();
  readonly scanError = output<string>();
  readonly methodChanged = output<void>();

  readonly scanning = signal(false);
  readonly error = signal<string | null>(null);

  /** Exposed so the template can iterate options without globals. */
  readonly backendOptions = BACKEND_OPTIONS;

  async onMethodChange(method: DetectionMethod): Promise<void> {
    this.error.set(null);
    try {
      await this.detection.selectMethod(method);
      this.methodChanged.emit();
    } catch {
      // Error surfaced via detection.modelLoadError signal
    }
  }

  async selectAndScan(): Promise<void> {
    if (!this.queryEmbedding() || this.scanning()) return;

    this.error.set(null);
    let directoryHandle: FileSystemDirectoryHandle;

    try {
      directoryHandle = await this.fileSystemService.pickDirectory();
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        this.error.set('Could not access the directory. Please try again.');
      }
      return;
    }

    this.scanning.set(true);
    this.scanStarted.emit();

    try {
      const files = await this.fileSystemService.collectImageFiles(directoryHandle, (count) => {
        this.progressUpdate.emit({ current: 0, total: count, currentFileName: 'Discovering files…' });
      });

      const total = files.length;
      const results: FaceEmbedding[] = [];
      const method = this.detection.selectedMethod();

      for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
        const batch = files.slice(batchStart, batchStart + BATCH_SIZE);

        await Promise.all(
          batch.map(async (file) => {
            // Prefix cache key with the detection method so that embeddings from
            // different backends are never mixed up.
            const filePath = `${method}:${file.name}__${file.size}__${file.lastModified}`;
            let embeddings = await this.cache.get(filePath, file);
            if (!embeddings) {
              embeddings = await this.embeddingService.getEmbeddingsForFile(file);
              if (embeddings.length > 0) await this.cache.set(filePath, file, embeddings);
            }
            results.push({ filePath, fileName: file.name, file, embeddings });
          }),
        );

        this.progressUpdate.emit({
          current: Math.min(batchStart + BATCH_SIZE, total),
          total,
          currentFileName: batch[batch.length - 1].name,
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      this.scanComplete.emit(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed. Please try again.';
      this.error.set(message);
      this.scanError.emit(message);
    } finally {
      this.scanning.set(false);
    }
  }
}
