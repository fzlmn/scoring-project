import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from './icon.component';

/**
 * Bouton « Retour » standard de l'application : bouton contour (secondary) + flèche.
 * Revient à la page précédente ; s'il n'y a pas d'historique de navigation dans
 * l'application, redirige vers `fallback` (l'utilisateur ne reste jamais bloqué).
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
      <span>{{ label }}</span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; }
  `]
})
export class BackButtonComponent {
  /** Libellé du bouton. */
  @Input() label = 'Retour';
  /** Route de repli quand il n'y a pas d'historique de navigation dans l'app. */
  @Input() fallback = '/';

  constructor(private location: Location, private router: Router) {}

  goBack(): void {
    const navId = (history.state && history.state.navigationId) || 0;
    if (navId > 1) this.location.back();
    else this.router.navigate([this.fallback]);
  }
}
