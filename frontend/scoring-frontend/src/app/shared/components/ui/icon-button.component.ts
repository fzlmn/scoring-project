import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

/**
 * Bouton icône compact et cohérent (Rafraîchir, Recalculer, …).
 *
 * - icône seule + tooltip au survol (toujours accessible via aria-label) ;
 * - état `loading` : l'icône tourne et le bouton est désactivé ;
 * - état `disabled` géré ;
 * - variantes visuelles alignées sur les boutons de l'app.
 *
 *   <app-icon-button icon="refresh" tooltip="Rafraîchir"
 *                    [loading]="isLoading" (clicked)="refresh()"></app-icon-button>
 */
@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button type="button" class="icon-btn" [class]="'icon-btn ' + variant"
            [class.busy]="loading" [disabled]="disabled || loading"
            [title]="tooltip" [attr.aria-label]="tooltip"
            (click)="onClick($event)">
      <app-icon [name]="icon" [size]="size" [class.spin]="loading"></app-icon>
    </button>
  `,
  styles: [`
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 8px;
      border: 1px solid var(--border, #E5E5EA); background: var(--surface, #fff);
      color: var(--ink-700, #444); cursor: pointer;
      transition: background var(--transition, .15s), border-color .15s, color .15s;
    }
    .icon-btn:hover:not(:disabled) { background: var(--surface-2, #F5F5F7); color: var(--ink-900, #1A1A2E); }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .icon-btn.primary { background: var(--sal-orange, #E8621A); border-color: transparent; color: #fff; }
    .icon-btn.primary:hover:not(:disabled) { background: var(--sal-orange-dark, #d14d0a); color: #fff; }
    .icon-btn.ghost { border-color: transparent; background: transparent; }
    .icon-btn.ghost:hover:not(:disabled) { background: var(--surface-2, #F5F5F7); }
    .spin { animation: ib-spin 1s linear infinite; }
    @keyframes ib-spin { to { transform: rotate(360deg); } }
  `]
})
export class IconButtonComponent {
  @Input() icon = 'refresh';
  @Input() tooltip = '';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() size = 18;
  /** 'default' (contour) · 'primary' (orange) · 'ghost' (transparent) */
  @Input() variant: 'default' | 'primary' | 'ghost' = 'default';
  @Output() clicked = new EventEmitter<Event>();

  onClick(e: Event): void {
    if (this.loading || this.disabled) return;
    this.clicked.emit(e);
  }
}
