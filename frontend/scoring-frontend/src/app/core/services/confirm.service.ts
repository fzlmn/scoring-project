import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Puces optionnelles explicitant les conséquences de l'action. */
  bullets?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'primary' (orange) ou 'danger' (rouge) pour le bouton de confirmation. */
  variant?: 'primary' | 'danger';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (ok: boolean) => void;
}

/**
 * Boîte de confirmation modale, cohérente avec le design system (remplace le
 * `window.confirm()` natif). Usage :
 *
 *   const ok = await this.confirm.ask({ title, message, bullets, variant });
 *   if (ok) { … }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState>({ open: false, title: '', message: '' });

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.state.set({
        open: true,
        confirmLabel: 'Confirmer',
        cancelLabel: 'Annuler',
        variant: 'primary',
        ...options,
        resolve,
      });
    });
  }

  confirm(): void { this.close(true); }
  cancel(): void { this.close(false); }

  private close(result: boolean): void {
    const s = this.state();
    s.resolve?.(result);
    this.state.set({ ...s, open: false, resolve: undefined });
  }
}
