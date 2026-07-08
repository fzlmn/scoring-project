import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '../../../core/services/toast.service';

/** Conteneur global des toasts — monté une seule fois dans AppComponent. */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite">
      <div *ngFor="let t of toastService.toasts()" class="toast" [class]="'toast ' + t.type"
           (click)="toastService.dismiss(t.id)" role="status">
        <span class="toast-icon">{{ icon(t) }}</span>
        <span class="toast-msg">{{ t.message }}</span>
        <span class="toast-close">✕</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; bottom: 24px; right: 24px; z-index: 10000;
      display: flex; flex-direction: column; gap: 10px; max-width: 380px;
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 10px; cursor: pointer;
      background: #1A1A2E; color: #fff;
      font-size: 13px; font-family: var(--font-body, 'DM Sans', sans-serif);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
      border-left: 4px solid var(--ink-500, #888);
      animation: toast-in 0.22s ease-out;
    }
    .toast.success { border-left-color: #2D9C6A; }
    .toast.error   { border-left-color: #D94040; }
    .toast.info    { border-left-color: #E8621A; }
    .toast-icon { font-size: 15px; }
    .toast-msg { flex: 1; line-height: 1.45; }
    .toast-close { opacity: 0.55; font-size: 11px; }
    @keyframes toast-in {
      from { transform: translateY(8px); opacity: 0; }
      to   { transform: translateY(0);   opacity: 1; }
    }
  `]
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  icon(t: Toast): string {
    switch (t.type) {
      case 'success': return '✓';
      case 'error': return '⚠';
      default: return 'ℹ';
    }
  }
}
