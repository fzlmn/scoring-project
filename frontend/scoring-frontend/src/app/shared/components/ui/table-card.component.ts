import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Table card — a card shell (flush `.card`) with an optional title + toolbar slot
 * (search / filters / export) above a projected `<table class="data-table">`.
 *
 *   <app-table-card title="Clients">
 *     <div toolbar>…search / export…</div>   <!-- optional -->
 *     <table class="data-table">…</table>
 *   </app-table-card>
 *
 * Shell + styling only — interactive sort/filter/pagination is the later Tables section.
 */
@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card card--flush table-card">
      <div class="table-card-toolbar" *ngIf="title || subtitle || showToolbar">
        <div class="table-card-titles">
          <h3 *ngIf="title">{{ title }}</h3>
          <p class="table-card-sub" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <div class="table-card-actions">
          <ng-content select="[toolbar]"></ng-content>
        </div>
      </div>
      <div class="table-card-scroll">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .table-card { overflow: hidden; }
    .table-card-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-4); padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--border);
    }
    .table-card-titles h3 {
      margin: 0; font-size: 16px; font-weight: 600; color: var(--ink-900);
      font-family: var(--font-display);
    }
    .table-card-sub {
      margin: 4px 0 0 0; font-size: 13px; color: var(--ink-500); font-family: var(--font-body);
    }
    .table-card-actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
    .table-card-scroll { overflow-x: auto; }
  `]
})
export class TableCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  /** Force the toolbar row to render even without a title (e.g. only projected actions). */
  @Input() showToolbar = false;
}
