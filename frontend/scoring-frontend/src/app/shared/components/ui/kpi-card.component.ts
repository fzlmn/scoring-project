import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from './icon.component';

/**
 * KPI card — icon in a tinted circle + label + value, on the shared `.card` base.
 * Optional `link` (+ `queryParams`) makes the whole card a router link; wired now
 * but unused until the Dashboards section adds clickable navigation.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <a *ngIf="link; else plain" class="card kpi-card kpi-card--link"
       [routerLink]="link" [queryParams]="queryParams">
      <ng-container *ngTemplateOutlet="inner"></ng-container>
    </a>
    <ng-template #plain>
      <div class="card kpi-card">
        <ng-container *ngTemplateOutlet="inner"></ng-container>
      </div>
    </ng-template>

    <ng-template #inner>
      <div class="kpi-icon" [style.background]="tint">
        <app-icon [name]="icon" [size]="22" [style.color]="iconColor || null"></app-icon>
      </div>
      <div class="kpi-content">
        <p class="kpi-label">{{ label }}</p>
        <p class="kpi-value">{{ value }}</p>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    /* Fixed height so cards stay identical even when labels wrap onto 2 lines. */
    .kpi-card {
      height: 100%; min-height: 104px; box-sizing: border-box;
      display: flex; align-items: center; gap: var(--space-4);
      color: inherit; text-decoration: none;
    }
    .kpi-card--link { transition: box-shadow var(--transition), transform var(--transition); }
    .kpi-card--link:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .kpi-icon {
      width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: var(--ink-700);
    }
    .kpi-content { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
    /* Label may wrap to 2 lines; reserved space keeps every card the same height. */
    .kpi-label {
      font-size: 13px; color: var(--ink-500); margin: 0; font-family: var(--font-body);
      line-height: 1.3; min-height: calc(1.3em * 2);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .kpi-value {
      font-size: 30px; font-weight: 700; color: var(--ink-900); margin: 4px 0 0 0;
      font-family: var(--font-display); line-height: 1.1;
    }
  `]
})
export class KpiCardComponent {
  /** Material Symbols ligature. */
  @Input() icon = '';
  /** Background of the icon circle (e.g. var(--info-tint) or a hex). */
  @Input() tint = 'var(--surface-2)';
  /** Optional glyph color; defaults to charcoal when omitted. */
  @Input() iconColor?: string;
  @Input() label = '';
  @Input() value: number | string = '';
  @Input() link?: string | any[];
  @Input() queryParams?: Record<string, unknown>;
}
