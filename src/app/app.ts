import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { FaceDetectionService } from './services/face-detection.service';
import { FaceSearchService } from './services/face-search.service';
import { FaceEmbedding, ScanProgress } from './models/face-embedding.model';
import { SearchResult } from './models/search-result.model';
import { QueryImageComponent, QueryResult } from './components/query-image/query-image.component';
import { FolderSelectorComponent } from './components/folder-selector/folder-selector.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { DISTANCE_THRESHOLD, THRESHOLD_MAX, THRESHOLD_MIN } from './utils/similarity';
import { DetectionMethods } from './services/detection-backend';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    NgOptimizedImage,
    QueryImageComponent,
    FolderSelectorComponent,
    ProgressBarComponent,
    SearchResultsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  private readonly faceSearch = inject(FaceSearchService);
  readonly detection = inject(FaceDetectionService);

  readonly queryEmbedding = signal<Float32Array | null>(null);
  readonly scanning = signal(false);
  readonly scanProgress = signal<ScanProgress>({ current: 0, total: 0, currentFileName: '' });
  readonly results = signal<SearchResult[]>([]);
  readonly hasResults = signal(false);
  readonly hasScanData = signal(false);
  readonly appError = signal<string | null>(null);

  readonly threshold = signal(DISTANCE_THRESHOLD);
  readonly thresholdMin = THRESHOLD_MIN;
  readonly thresholdMax = THRESHOLD_MAX;
  readonly scanDuration = signal<number | null>(null);

  private scanStartTime = 0;

  /** Step state helpers for the numbered step UI */
  readonly step1State = computed<'idle' | 'active' | 'done'>(() =>
    this.queryEmbedding() ? 'done' : 'active',
  );
  readonly step2State = computed<'idle' | 'active' | 'done'>(() => {
    if (!this.queryEmbedding()) return 'idle';
    return this.hasScanData() ? 'done' : 'active';
  });
  readonly step3State = computed<'idle' | 'active' | 'done'>(() => {
    if (!this.hasScanData()) return 'idle';
    return this.hasResults() ? 'active' : 'idle';
  });

  /** Exposed for template — allows @switch @case to reference constants without literals. */
  readonly DetectionMethods = DetectionMethods;

  private lastEmbeddings: FaceEmbedding[] = [];

  constructor() {
    this.detection.loadModels().catch(() => {
      // Error surfaced through detection.modelLoadError signal
    });
  }

  onQueryReady(result: QueryResult): void {
    this.queryEmbedding.set(result.embedding);
    this.clearResultsInternal();
    this.appError.set(null);
  }

  onScanStarted(): void {
    this.scanning.set(true);
    this.scanStartTime = performance.now();
    this.scanDuration.set(null);
    this.clearResultsInternal();
    this.hasScanData.set(false);
    this.lastEmbeddings = [];
    this.appError.set(null);
  }

  onProgressUpdate(progress: ScanProgress): void {
    this.scanProgress.set(progress);
  }

  onScanComplete(embeddings: FaceEmbedding[]): void {
    this.scanning.set(false);
    this.scanDuration.set(performance.now() - this.scanStartTime);
    this.lastEmbeddings = embeddings;
    this.hasScanData.set(true);
    this.runSearch();
  }

  onScanError(message: string): void {
    this.scanning.set(false);
    this.appError.set(message);
  }

  onDetectionMethodChanged(): void {
    // Clear existing scan data — embeddings from different backends are incompatible.
    this.clearResultsInternal();
    this.hasScanData.set(false);
    this.lastEmbeddings = [];
    this.scanDuration.set(null);
  }

  onResultsCleared(): void {
    this.faceSearch.revokeResults(this.results());
    this.results.set([]);
    this.hasResults.set(false);
  }

  onThresholdChange(value: number): void {
    this.threshold.set(value);
    if (this.lastEmbeddings.length > 0) {
      this.faceSearch.revokeResults(this.results());
      this.runSearch();
    }
  }

  private runSearch(): void {
    const query = this.queryEmbedding();
    if (!query) return;
    const found = this.faceSearch.search(query, this.lastEmbeddings, this.threshold());
    this.results.set(found);
    this.hasResults.set(true);
  }

  private clearResultsInternal(): void {
    this.faceSearch.revokeResults(this.results());
    this.results.set([]);
    this.hasResults.set(false);
  }

  ngOnDestroy(): void {
    this.faceSearch.revokeResults(this.results());
  }
}
