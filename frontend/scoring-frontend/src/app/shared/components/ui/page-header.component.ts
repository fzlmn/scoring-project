import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Page header — title + subtitle on the left, optional projected actions on the right.
 * Usage: <app-page-header [title]="t" [subtitle]="s"><button class="btn btn-primary">…</button></app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-head">
      <div class="page-head-text">
        <h1>{{ title }}</h1>
        <p class="subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-head-actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .page-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: var(--space-4); margin-bottom: var(--space-7);
    }
    .page-head h1 {
      font-size: 28px; font-weight: 700; color: var(--ink-900); margin: 0;
      font-family: var(--font-display);
    }
    .subtitle {
      font-size: 14px; color: var(--ink-500); margin: 6px 0 0 0;
      font-family: var(--font-body);
    }
    .page-head-actions { display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0; }
    @media (max-width: 640px) {
      .page-head { flex-direction: column; }
    }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
}
