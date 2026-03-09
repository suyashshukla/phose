import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
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
