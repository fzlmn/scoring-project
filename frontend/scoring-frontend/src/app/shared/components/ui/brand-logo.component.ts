import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BRANDING } from '../../../core/branding';

/**
 * Logo / marque de l'application, rendu de façon centralisée à partir de
 * `core/branding.ts`. Utilisé dans la sidebar, la page de connexion, etc.
 * Remplacer la marque = éditer `core/branding.ts` (aucune marque en dur ailleurs).
 *
 *   <app-brand-logo></app-brand-logo>          <!-- logo complet -->
 *   <app-brand-logo size="sm"></app-brand-logo> <!-- icône seule (rail replié) -->
 */
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="brand" [class]="'brand ' + size">
      <img *ngIf="src" [src]="src" [alt]="brand.fullName" class="brand-img" [class.icon]="iconOnly" />
      <span *ngIf="!src" class="brand-word">{{ brand.namePrimary }}<span>{{ brand.nameAccent }}</span></span>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .brand { display: flex; flex-direction: column; align-items:center; gap: 4px; width: 100%; }
    /* Collapsed rail keeps the icon centered. */
    .brand.sm { align-items: center; }
    /* Sidebar logo (md): sized to ~76% of the footer width, left-aligned,
       with comfortable padding so it never crowds the footer edges. */
    .brand-img { display: block; width: 76%; height: auto; max-width: 100%; }
    /* Collapsed rail: icon only, fixed square. */
    .brand-img.icon { width: 56px; height: 56px; }
    .brand.lg .brand-img { width: auto; height: 56px; }
    .brand-word { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 15px; color: currentColor; letter-spacing: -0.3px; }
    .brand-word span { color: var(--sal-orange, #E8621A); }
    .brand.lg .brand-word { font-size: 22px; }
    .brand.sm .brand-word { font-size: 12px; }
  `]
})
export class BrandLogoComponent {
  /** 'sm' (icône seule) · 'md' (défaut) · 'lg' */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  readonly brand = BRANDING;

  get iconOnly(): boolean { return this.size === 'sm'; }
  /** Rail replié → icône ; sidebar dépliée → logo sidebar (sans sous-titre). */
  get src(): string { return this.iconOnly ? (this.brand.iconPath || this.brand.logoPath) : (this.brand.sidebarLogoPath || this.brand.logoPath); }
}
