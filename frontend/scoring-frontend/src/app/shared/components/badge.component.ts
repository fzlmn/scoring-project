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
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      white-space: nowrap;
    }

    .badge-success {
      background: #E3F5EE;
      color: #2D9C6A;
    }

    .badge-danger {
      background: #FCE3E3;
      color: #D94040;
    }

    .badge-warning {
      background: #FEF0E6;
      color: #E8621A;
    }

    .badge-info {
      background: #E3F0FF;
      color: #1A6FD4;
    }

    .badge-secondary {
      background: #F0F0F0;
      color: #666;
    }
  `]
})
export class BadgeComponent {
  @Input() label: string = '';
  @Input() variant: 'success' | 'danger' | 'warning' | 'info' | 'secondary' = 'secondary';
}
