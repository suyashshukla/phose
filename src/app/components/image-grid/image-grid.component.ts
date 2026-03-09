import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SearchResult } from '../../models/search-result.model';

@Component({
  selector: 'app-image-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './image-grid.component.html',
  styleUrl: './image-grid.component.css',
})
export class ImageGridComponent {
  readonly results = input.required<SearchResult[]>();
  readonly open = output<SearchResult>();
}
