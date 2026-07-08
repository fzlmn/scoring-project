import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

/**
 * Empty state — centered icon (optional) + optional title + message, with an
 * optional projected action. Replaces the scattered `.empty` paragraphs.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="empty-state">
      <app-icon *ngIf="icon" class="empty-icon" [name]="icon" [size]="32"></app-icon>
      <p class="empty-title" *ngIf="title">{{ title }}</p>
      <p class="empty-msg">{{ message }}</p>
      <div class="empty-action"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: var(--space-8) var(--space-5); gap: var(--space-2);
      color: var(--ink-500);
    }
    .empty-icon { color: var(--ink-300); }
    .empty-title {
      margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: var(--ink-700);
      font-family: var(--font-display);
    }
    .empty-msg { margin: 0; font-size: 13px; color: var(--ink-500); font-family: var(--font-body); }
    .empty-action:empty { display: none; }
    .empty-action { margin-top: var(--space-3); }
  `]
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title?: string;
  @Input() message = '';
}
