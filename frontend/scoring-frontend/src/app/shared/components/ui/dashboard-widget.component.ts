import { Component, ContentChild, Input, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ChartCardComponent } from './chart-card.component';
import { IconComponent } from './icon.component';
import { TimeFilterComponent, Periode } from './time-filter.component';

/**
 * Widget de tableau de bord autonome : possède sa propre période, son propre
 * état de chargement et son bouton de rafraîchissement. Rafraîchir un widget ne
 * recharge que ce widget (endpoint dédié), le reste du tableau de bord reste utilisable.
 *
 *   <app-dashboard-widget title="…" [wide]="true" [loader]="loadValidations" [defaultPeriode]="'jour'">
 *     <ng-template let-data="data">…graphique rendu avec data…</ng-template>
 *   </app-dashboard-widget>
 */
@Component({
  selector: 'app-dashboard-widget',
  standalone: true,
  imports: [CommonModule, ChartCardComponent, IconComponent, TimeFilterComponent],
  template: `
    <app-chart-card [title]="title" [subtitle]="subtitle" [wide]="wide">
      <div actions>
        <app-time-filter [value]="periode" (valueChange)="onPeriode($event)"></app-time-filter>
        <button type="button" class="wg-refresh no-print" (click)="refresh()" [disabled]="loading" title="Rafraîchir ce widget">
          <app-icon name="refresh" [size]="18" [class.spin]="loading"></app-icon>
        </button>
      </div>

      <div class="wg-body">
        <div *ngIf="loading && !hasData" class="wg-loading">
          <app-icon name="progress_activity" [size]="26" class="spin"></app-icon>
          <span>Chargement…</span>
        </div>
        <div *ngIf="error && !loading" class="wg-error">Impossible de charger ce widget.</div>
        <ng-container *ngIf="hasData">
          <ng-container *ngTemplateOutlet="body; context: { $implicit: data, data: data, periode: periode }"></ng-container>
        </ng-container>
      </div>
    </app-chart-card>
  `,
  styles: [`
    :host { display: block; }
    :host(.wide) { grid-column: 1 / -1; }
    .wg-refresh {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border: 1px solid var(--border); background: var(--surface);
      border-radius: var(--radius-sm); cursor: pointer; color: var(--ink-500);
      transition: all var(--transition);
    }
    .wg-refresh:hover:not(:disabled) { border-color: var(--sal-orange); color: var(--sal-orange); }
    .wg-refresh:disabled { opacity: 0.5; cursor: default; }
    .wg-body { min-height: 60px; }
    .wg-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: var(--space-7); color: var(--ink-500); font-size: 13px; font-family: var(--font-body); }
    .wg-error { padding: var(--space-6); text-align: center; color: var(--danger); font-size: 13px; font-family: var(--font-body); }
    .spin { animation: wg-spin 1s linear infinite; }
    @keyframes wg-spin { to { transform: rotate(360deg); } }
  `],
  host: { '[class.wide]': 'wide' },
})
export class DashboardWidgetComponent implements OnInit {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() wide = false;
  @Input() defaultPeriode: Periode = 'jour';
  @Input({ required: true }) loader!: (p: Periode) => Observable<unknown>;

  @ContentChild(TemplateRef) body!: TemplateRef<unknown>;

  periode: Periode = 'jour';
  loading = false;
  error = false;
  data: unknown = null;

  ngOnInit(): void {
    this.periode = this.defaultPeriode;
    this.fetch();
  }

  get hasData(): boolean { return this.data != null; }

  onPeriode(p: Periode): void { this.periode = p; this.fetch(); }
  refresh(): void { this.fetch(); }

  private fetch(): void {
    this.loading = true;
    this.error = false;
    this.loader(this.periode).subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.error = true; this.loading = false; },
    });
  }
}
