import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.css',
})
export class ProgressBarComponent {
  readonly label = input('Scanning…');
  readonly current = input(0);
  readonly total = input(0);
  readonly currentFileName = input('');

  readonly percentage = computed(() => {
    const t = this.total();
    return t > 0 ? Math.min(100, Math.round((this.current() / t) * 100)) : 0;
  });

  readonly ariaLabel = computed(
    () => `${this.label()}: ${this.current()} of ${this.total()} files processed, ${this.percentage()}% complete`,
  );
}
