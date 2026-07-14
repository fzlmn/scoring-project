import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from './icon.component';
import { NavigationHistoryService } from '../../../core/services/navigation-history.service';

/**
 * Bouton « Retour » standard de l'application : bouton contour (secondary) + flèche.
 * Revient à la page précédente ; s'il n'y a pas d'historique de navigation dans
 * l'application, redirige vers `fallback` (l'utilisateur ne reste jamais bloqué).
 *
 * Le libellé est **contextuel** par défaut : dérivé de la page précédente
 * (« Retour aux alertes », « Retour au client »…). Un `label` explicite le force.
 *
 *   <app-back-button [fallback]="'/clients'"></app-back-button>
 *   <app-back-button [fallback]="'/clients'" label="Retour à la liste"></app-back-button>
 */
@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button type="button" class="btn btn-secondary back-btn" (click)="goBack()">
      <app-icon name="arrow_back" [size]="18"></app-icon>
      <span>{{ label || contextualLabel() }}</span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; }
  `]
})
export class BackButtonComponent {
  /** Libellé explicite (facultatif). Si absent, un libellé contextuel est déduit. */
  @Input() label?: string;
  /** Route de repli quand il n'y a pas d'historique de navigation dans l'app. */
  @Input() fallback = '/';

  constructor(
    private location: Location,
    private router: Router,
    private navHistory: NavigationHistoryService,
  ) {}

  /** Déduit un libellé à partir de la page précédente ; « Retour » si indéterminé. */
  contextualLabel(): string {
    const url = this.navHistory.previousUrl;
    if (!url) return 'Retour';
    const path = url.split('?')[0].split('#')[0];
    if (path.startsWith('/alertes')) return 'Retour aux alertes';
    if (path.startsWith('/simulations/historique')) return 'Retour aux simulations';
    if (path.startsWith('/simulations')) return 'Retour à la simulation';
    if (path.startsWith('/scores/validation')) return 'Retour à la validation';
    if (path.startsWith('/scores')) return 'Retour aux scores';
    if (/^\/clients\/\d+/.test(path)) return 'Retour au client';
    if (path.startsWith('/clients')) return 'Retour aux clients';
    if (path.startsWith('/dashboard')) return 'Retour au tableau de bord';
    return 'Retour';
  }

  goBack(): void {
    const navId = (history.state && history.state.navigationId) || 0;
    if (navId > 1) this.location.back();
    else this.router.navigate([this.fallback]);
  }
}
