import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Chart card — a titled card surface (on the shared `.card` base) with an optional
 * actions slot reserved for future time filters, and the chart body projected.
 *
 *   <app-chart-card title="…" [wide]="true">
 *     <div actions>…filters…</div>   <!-- optional -->
 *     …chart body…
 *   </app-chart-card>
 *
 * When [wide] is set the host spans the full grid row (grid-column: 1 / -1).
 */
@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  host: { '[class.wide]': 'wide' },
  template: `
    <div class="card chart-card">
      <header class="chart-card-head">
        <div class="chart-card-titles">
          <h3>{{ title }}</h3>
          <p class="chart-card-sub" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <div class="chart-card-actions">
          <ng-content select="[actions]"></ng-content>
        </div>
      </header>
      <div class="chart-card-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    :host(.wide) { grid-column: 1 / -1; }
    .card.chart-card { height: 100%; }
    .chart-card-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: var(--space-3); margin-bottom: var(--space-5);
    }
    .chart-card-titles h3 {
      margin: 0; font-size: 16px; font-weight: 600; color: var(--ink-900);
      font-family: var(--font-display);
    }
    .chart-card-sub {
      margin: 4px 0 0 0; font-size: 13px; color: var(--ink-500); font-family: var(--font-body);
    }
    .chart-card-actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
  `]
})
export class ChartCardComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() wide = false;
}
