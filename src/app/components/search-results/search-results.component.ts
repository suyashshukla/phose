import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SearchResult } from '../../models/search-result.model';
import { ImageGridComponent } from '../image-grid/image-grid.component';
import { zipSync } from 'fflate';

@Component({
  selector: 'app-search-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImageGridComponent, DecimalPipe],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.css',
})
export class SearchResultsComponent implements AfterViewInit, OnDestroy {
  readonly results = input.required<SearchResult[]>();
  readonly cleared = output<void>();

  readonly active = signal<SearchResult | null>(null);
  readonly filterMode = signal<'all' | 'strong' | 'good' | 'possible'>('all');
  readonly sortMode = signal<'similarity' | 'filename'>('similarity');
  readonly downloading = signal(false);

  readonly strongCount  = computed(() => this.results().filter(r => r.distance <= 0.35).length);
  readonly goodCount    = computed(() => this.results().filter(r => r.distance > 0.35 && r.distance <= 0.45).length);
  readonly possibleCount = computed(() => this.results().filter(r => r.distance > 0.45).length);

  readonly filteredResults = computed(() => {
    const all = this.results();
    const filter = this.filterMode();
    const sort = this.sortMode();
    let filtered: SearchResult[];
    if (filter === 'strong')   filtered = all.filter(r => r.distance <= 0.35);
    else if (filter === 'good') filtered = all.filter(r => r.distance > 0.35 && r.distance <= 0.45);
    else if (filter === 'possible') filtered = all.filter(r => r.distance > 0.45);
    else filtered = all;
    if (sort === 'filename') return [...filtered].sort((a, b) => a.fileName.localeCompare(b.fileName));
    return filtered;
  });

  private readonly lightboxElementReference = viewChild<ElementRef<HTMLDivElement>>('lightboxElement');

  ngAfterViewInit(): void {
    // Focus the lightbox when it appears so keyboard/screen-reader users can interact
  }

  openLightbox(result: SearchResult): void {
    this.active.set(result);
    setTimeout(() => this.lightboxElementReference()?.nativeElement.focus(), 30);
  }

  closeLightbox(): void {
    this.active.set(null);
  }

  async downloadZip(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    try {
      const results = this.filteredResults();
      const buffers = await Promise.all(
        results.map(r => r.file.arrayBuffer()),
      );

      // Deduplicate file names by appending a counter when needed
      const nameCount = new Map<string, number>();
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < results.length; i++) {
        let name = results[i].fileName;
        const count = nameCount.get(name) ?? 0;
        nameCount.set(name, count + 1);
        if (count > 0) {
          const dot = name.lastIndexOf('.');
          name = dot >= 0
            ? `${name.slice(0, dot)} (${count})${name.slice(dot)}`
            : `${name} (${count})`;
        }
        files[name] = new Uint8Array(buffers[i]);
      }

      const zipped = zipSync(files, { level: 0 });
      const blob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'phose-results.zip';
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.active.set(null);
  }
}
