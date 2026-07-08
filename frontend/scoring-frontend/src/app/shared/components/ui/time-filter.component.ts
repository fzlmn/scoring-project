import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type Periode = 'jour' | 'semaine' | 'mois' | 'annee';

/**
 * Reusable time-granularity control (Jour / Semaine / Mois / Année).
 * Identical UI across every dashboard; the parent decides how to aggregate.
 */
@Component({
  selector: 'app-time-filter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seg" role="group" aria-label="Filtre temporel">
      <button *ngFor="let o of options" type="button"
              [class.active]="value === o.val" (click)="select(o.val)">{{ o.label }}</button>
    </div>
  `,
  styles: [`
    .seg { display: inline-flex; background: var(--surface-2); border-radius: var(--radius-pill); padding: 3px; gap: 2px; }
    .seg button {
      border: none; background: transparent; cursor: pointer; padding: 5px 12px;
      border-radius: var(--radius-pill); font-size: 12px; font-weight: 600; color: var(--ink-500);
      font-family: var(--font-body); transition: all var(--transition);
    }
    .seg button.active { background: var(--surface); color: var(--sal-orange); box-shadow: var(--shadow-sm); }
  `]
})
export class TimeFilterComponent {
  @Input() value: Periode = 'jour';
  @Output() valueChange = new EventEmitter<Periode>();

  readonly options: { val: Periode; label: string }[] = [
    { val: 'jour', label: 'Jour' },
    { val: 'semaine', label: 'Semaine' },
    { val: 'mois', label: 'Mois' },
    { val: 'annee', label: 'Année' },
  ];

  select(v: Periode): void {
    if (v !== this.value) {
      this.value = v;
      this.valueChange.emit(v);
    }
  }
}
