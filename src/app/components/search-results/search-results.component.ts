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
    // Focus after render
    setTimeout(() => this.lightboxElementReference()?.nativeElement.focus(), 30);
  }

  closeLightbox(): void {
    this.active.set(null);
  }

  ngOnDestroy(): void {
    this.active.set(null);
  }
}
