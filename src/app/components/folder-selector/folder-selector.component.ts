import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FileSystemService } from '../../services/file-system.service';
import { FaceEmbeddingService } from '../../services/face-embedding.service';
import { CacheService } from '../../services/cache.service';
import { FaceEmbedding, ScanProgress } from '../../models/face-embedding.model';

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
  private readonly cache = inject(CacheService);

  readonly queryEmbedding = input<Float32Array | null>(null);

  readonly scanStarted = output<void>();
  readonly progressUpdate = output<ScanProgress>();
  readonly scanComplete = output<FaceEmbedding[]>();
  readonly scanError = output<string>();

  readonly scanning = signal(false);
  readonly error = signal<string | null>(null);

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

      for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
        const batch = files.slice(batchStart, batchStart + BATCH_SIZE);

        await Promise.all(
          batch.map(async (file) => {
            const filePath = `${file.name}__${file.size}__${file.lastModified}`;
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
