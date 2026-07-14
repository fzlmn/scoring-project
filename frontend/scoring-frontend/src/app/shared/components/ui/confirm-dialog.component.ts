import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';

/** Boîte de confirmation globale — montée une seule fois dans AppComponent. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cf-overlay" *ngIf="confirm.state().open" (click)="confirm.cancel()">
      <div class="cf-modal" role="alertdialog" aria-modal="true" (click)="$event.stopPropagation()">
        <h3 class="cf-title">{{ confirm.state().title }}</h3>
        <p class="cf-message">{{ confirm.state().message }}</p>
        <ul class="cf-bullets" *ngIf="confirm.state().bullets?.length">
          <li *ngFor="let b of confirm.state().bullets">{{ b }}</li>
        </ul>
        <div class="cf-actions">
          <button type="button" class="cf-btn cf-cancel" (click)="confirm.cancel()">
            {{ confirm.state().cancelLabel }}
          </button>
          <button type="button" class="cf-btn"
                  [class.cf-primary]="confirm.state().variant !== 'danger'"
                  [class.cf-danger]="confirm.state().variant === 'danger'"
                  (click)="confirm.confirm()" cdkFocusInitial>
            {{ confirm.state().confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cf-overlay {
      position: fixed; inset: 0; z-index: 9000;
      background: rgba(26, 26, 46, 0.45); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center; padding: 20px;
      animation: cf-fade 0.15s ease;
    }
    @keyframes cf-fade { from { opacity: 0; } to { opacity: 1; } }
    .cf-modal {
      background: var(--surface, #fff); border-radius: 14px; padding: 24px;
      width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      font-family: var(--font-body, 'DM Sans', sans-serif);
      animation: cf-pop 0.16s ease-out;
    }
    @keyframes cf-pop { from { transform: translateY(8px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
    .cf-title { margin: 0 0 10px; font-size: 17px; font-weight: 700; color: var(--ink-900, #1A1A2E); font-family: var(--font-display, 'Sora', sans-serif); }
    .cf-message { margin: 0 0 12px; font-size: 14px; line-height: 1.55; color: var(--ink-700, #444); }
    .cf-bullets { margin: 0 0 16px; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
    .cf-bullets li { font-size: 13px; line-height: 1.5; color: var(--ink-700, #555); }
    .cf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
    .cf-btn { padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
    .cf-cancel { background: var(--surface-2, #F5F5F7); color: var(--ink-700, #444); border-color: var(--border, #E5E5EA); }
    .cf-cancel:hover { background: #ECECEF; }
    .cf-primary { background: var(--sal-orange, #E8621A); color: #fff; }
    .cf-primary:hover { background: var(--sal-orange-dark, #d14d0a); }
    .cf-danger { background: var(--danger, #D94040); color: #fff; }
    .cf-danger:hover { background: #b83030; }
  `]
})
export class ConfirmDialogComponent {
  constructor(public confirm: ConfirmService) {}
}
