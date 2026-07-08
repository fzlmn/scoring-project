import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

/**
 * Notifications légères (toasts) pour les actions importantes :
 * validation/rejet de score, recalcul, simulation, rafraîchissement, erreurs réseau…
 * Conteneur global monté dans AppComponent (ToastContainerComponent).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, durationMs = 4000): void { this.push('success', message, durationMs); }
  error(message: string, durationMs = 6000): void { this.push('error', message, durationMs); }
  info(message: string, durationMs = 4000): void { this.push('info', message, durationMs); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(type: ToastType, message: string, durationMs: number): void {
    const toast: Toast = { id: ++this.nextId, type, message };
    this.toasts.update(list => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}
