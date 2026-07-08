import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="'badge-' + variant">{{ label }}</span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
      font-family: var(--font-body);
      white-space: nowrap;
    }

    .badge-success {
      background: var(--success-tint);
      color: var(--success);
    }

    .badge-danger {
      background: var(--danger-tint);
      color: var(--danger);
    }

    .badge-warning {
      background: var(--sal-orange-tint);
      color: var(--sal-orange);
    }

    .badge-info {
      background: var(--info-tint);
      color: var(--info);
    }

    .badge-secondary,
    .badge-neutral {
      background: var(--surface-2);
      color: var(--ink-500);
    }
  `]
})
export class BadgeComponent {
  @Input() label: string = '';
  @Input() variant: 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'neutral' = 'secondary';
}
