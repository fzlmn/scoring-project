import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Generic card container — the standard surface for forms, profile sections,
 * info panels and future pages. KPI / chart / table cards build on the same
 * `.card` visual language (defined in styles.css).
 *
 * Optional header / footer slots:
 *   <app-card>
 *     <span card-header>Titre</span>
 *     ...body...
 *     <div card-footer>...actions...</div>
 *   </app-card>
 */
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card" [ngClass]="paddingClass">
      <header class="card-header" *ngIf="hasHeader">
        <ng-content select="[card-header]"></ng-content>
      </header>
      <div class="card-body">
        <ng-content></ng-content>
      </div>
      <footer class="card-footer" *ngIf="hasFooter">
        <ng-content select="[card-footer]"></ng-content>
      </footer>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .card { display: flex; flex-direction: column; }
    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-3); margin-bottom: var(--space-4);
      font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--ink-900);
    }
    .card-body { flex: 1; min-width: 0; }
    .card-footer {
      margin-top: var(--space-5); padding-top: var(--space-4);
      border-top: 1px solid var(--border);
      display: flex; align-items: center; gap: var(--space-3);
    }
  `]
})
export class CardComponent {
  /** 'default' | 'compact' | 'none' — controls padding via the .card modifiers. */
  @Input() padding: 'default' | 'compact' | 'none' = 'default';
  /** Set when projecting a [card-header] so the header wrapper renders. */
  @Input() hasHeader = false;
  /** Set when projecting a [card-footer] so the footer wrapper renders. */
  @Input() hasFooter = false;

  get paddingClass(): string {
    return this.padding === 'compact' ? 'card--compact'
      : this.padding === 'none' ? 'card--flush'
      : '';
  }
}
