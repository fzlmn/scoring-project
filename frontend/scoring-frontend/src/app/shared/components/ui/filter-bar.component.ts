import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';

export interface FilterOption { value: string; label: string; }

export interface FilterDef {
  key: string;
  label: string;
  type: 'select' | 'daterange';
  options?: FilterOption[];
  allLabel?: string;
  /** Custom predicate; defaults to equality (select) / date-window (daterange) on row[key]. */
  match?: (row: any, value: any) => boolean;
}

export type FilterValues = Record<string, any>;

/** Apply a set of filter definitions + current values to a row collection. */
export function applyTableFilters(rows: any[], filters: FilterDef[], values: FilterValues): any[] {
  return (rows || []).filter(row =>
    filters.every(f => {
      const v = values[f.key];
      if (v === undefined || v === null || v === '' || (typeof v === 'object' && !v.from && !v.to)) return true;
      if (f.match) return f.match(row, v);
      if (f.type === 'select') return String(row?.[f.key] ?? '') === String(v);
      if (f.type === 'daterange') {
        const d = row?.[f.key] ? new Date(row[f.key]).getTime() : NaN;
        if (Number.isNaN(d)) return false;
        if (v.from && d < new Date(v.from).getTime()) return false;
        if (v.to && d > new Date(v.to).getTime() + 86399999) return false;
        return true;
      }
      return true;
    })
  );
}

/**
 * Reusable filter bar shared by all modules. Renders select / date-range filters
 * from a config and emits the filter values; the parent applies them (or uses
 * applyTableFilters). Keeps every page's filtering UI consistent.
 */
@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <ng-container *ngFor="let f of filters">
      <select *ngIf="f.type === 'select'" class="fb-select"
              [ngModel]="values[f.key] || ''" (ngModelChange)="setVal(f.key, $event)">
        <option value="">{{ f.allLabel || ('Tous : ' + f.label) }}</option>
        <option *ngFor="let o of f.options" [value]="o.value">{{ o.label }}</option>
      </select>

      <span *ngIf="f.type === 'daterange'" class="fb-range">
        <input type="date" [value]="values[f.key]?.from || ''" (change)="setRange(f.key, 'from', $any($event.target).value)" [attr.aria-label]="f.label + ' (début)'">
        <app-icon name="arrow_forward" [size]="14"></app-icon>
        <input type="date" [value]="values[f.key]?.to || ''" (change)="setRange(f.key, 'to', $any($event.target).value)" [attr.aria-label]="f.label + ' (fin)'">
      </span>
    </ng-container>

    <button *ngIf="hasActive" type="button" class="fb-reset" (click)="reset()">
      <app-icon name="close" [size]="14"></app-icon> Réinitialiser
    </button>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .fb-select, .fb-range input {
      padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
      font-family: var(--font-body); font-size: 13px; color: var(--ink-900); background: var(--surface);
    }
    .fb-select:focus, .fb-range input:focus { outline: none; border-color: var(--sal-orange); box-shadow: 0 0 0 3px var(--sal-orange-tint); }
    .fb-range { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-500); }
    .fb-reset {
      display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent;
      color: var(--sal-orange); font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .fb-reset:hover { text-decoration: underline; }
  `]
})
export class FilterBarComponent {
  @Input() filters: FilterDef[] = [];
  @Input() values: FilterValues = {};
  @Output() valuesChange = new EventEmitter<FilterValues>();

  get hasActive(): boolean {
    return Object.values(this.values).some(v => v && (typeof v !== 'object' || v.from || v.to));
  }

  setVal(key: string, value: string): void {
    this.values = { ...this.values, [key]: value || undefined };
    this.valuesChange.emit(this.values);
  }

  setRange(key: string, which: 'from' | 'to', value: string): void {
    const range = { ...(this.values[key] || {}), [which]: value || undefined };
    this.values = { ...this.values, [key]: (range.from || range.to) ? range : undefined };
    this.valuesChange.emit(this.values);
  }

  reset(): void {
    this.values = {};
    this.valuesChange.emit(this.values);
  }
}
