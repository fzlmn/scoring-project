import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

/**
 * Generic modal dialog — backdrop + centered panel, closes on overlay click,
 * the close button, or Escape. Body is projected; an optional [footer] slot holds
 * actions. Used by the profile modal in a later section.
 *
 *   <app-modal [open]="show" title="Profil" (closed)="show = false">
 *     …body…
 *     <div footer><button class="btn btn-secondary">Fermer</button></div>
 *   </app-modal>
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-backdrop" *ngIf="open" (click)="onBackdrop()">
      <div class="modal" [ngClass]="'modal--' + size" role="dialog" aria-modal="true"
           (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h2>{{ title }}</h2>
          <button type="button" class="modal-close" (click)="close()" aria-label="Fermer">
            <app-icon name="close" [size]="20"></app-icon>
          </button>
        </header>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
        <footer class="modal-footer" *ngIf="hasFooter">
          <ng-content select="[footer]"></ng-content>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(20, 20, 40, 0.45);
      display: flex; align-items: center; justify-content: center;
      padding: var(--space-5); animation: fadeIn 0.15s ease;
    }
    .modal {
      background: var(--surface); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg); width: 100%; max-height: 90vh;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .modal--sm { max-width: 420px; }
    .modal--md { max-width: 560px; }
    .modal--lg { max-width: 760px; }
    .modal-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-3); padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--border);
    }
    .modal-head h2 {
      margin: 0; font-size: 18px; font-weight: 600; color: var(--ink-900);
      font-family: var(--font-display);
    }
    .modal-close {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border: none; background: transparent;
      border-radius: var(--radius-sm); color: var(--ink-500); cursor: pointer;
      transition: background var(--transition), color var(--transition);
    }
    .modal-close:hover { background: var(--surface-2); color: var(--ink-900); }
    .modal-body { padding: var(--space-6); overflow-y: auto; }
    .modal-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3);
      padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border);
    }
  `]
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  /** Set when projecting a [footer] so the footer wrapper renders. */
  @Input() hasFooter = false;
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onBackdrop(): void {
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}
