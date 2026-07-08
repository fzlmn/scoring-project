import {
  Component, ContentChildren, Directive, Input, Output, EventEmitter,
  QueryList, TemplateRef, AfterContentInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from './icon.component';
import { EmptyStateComponent } from './empty-state.component';
import { ExportService } from '../../../core/services/export.service';

export type CellAlign = 'left' | 'right' | 'center';
export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'neutral';

export interface TableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  align?: CellAlign;
  type?: 'text' | 'number' | 'date' | 'badge';
  /** Derive the display/sort value from the row (overrides row[key]). */
  format?: (row: any) => string | number;
  /** For type 'badge': map a row to a badge. */
  badge?: (row: any) => { label: string; variant: BadgeVariant };
  dateFormat?: string;
  width?: string;
  /** Exclude this column from the global search index. */
  noSearch?: boolean;
}

export interface TableRowAction {
  label: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'danger';
  handler: (row: any) => void;
  visible?: (row: any) => boolean;
}

export interface TableExport {
  filename: string;
  /** Override the default client-side CSV export (e.g. a backend .xlsx download). */
  handler?: () => void;
}

/**
 * Provide a custom cell for a column:
 *   <ng-template appCell="score" let-row="row" let-value="value"> … </ng-template>
 */
@Directive({ selector: '[appCell]', standalone: true })
export class CellTemplateDirective {
  @Input('appCell') key = '';
  constructor(public tpl: TemplateRef<any>) {}
}

/**
 * Reusable data table: search, sorting, pagination, configurable columns,
 * custom cells, row actions, loading / empty states, export and a toolbar slot
 * for the reusable filter bar. Each page only configures columns/actions/data.
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, EmptyStateComponent],
  template: `
    <div class="card card--flush dt">
      <!-- Toolbar -->
      <div class="dt-toolbar" *ngIf="searchable || hasToolbar || exportConfig">
        <div class="dt-search" *ngIf="searchable">
          <app-icon name="search" [size]="18"></app-icon>
          <input type="text" [placeholder]="searchPlaceholder" [value]="search"
                 (input)="onSearch($any($event.target).value)" />
        </div>
        <div class="dt-toolbar-slot"><ng-content select="[toolbar]"></ng-content></div>
        <button *ngIf="exportConfig && canExport" type="button" class="btn btn-sm btn-secondary"
                [disabled]="!view.length" (click)="doExport()">
          <app-icon name="download" [size]="16"></app-icon> Exporter
        </button>
      </div>

      <!-- Table -->
      <div class="dt-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th *ngFor="let col of columns" [style.width]="col.width" [class.right]="col.align === 'right'"
                  [class.center]="col.align === 'center'" [class.sortable]="col.sortable" (click)="col.sortable && toggleSort(col)">
                <span class="th-inner">
                  {{ col.header }}
                  <app-icon *ngIf="col.sortable" class="sort-ic" [size]="16"
                            [name]="sortKey === col.key ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'"
                            [class.dim]="sortKey !== col.key"></app-icon>
                </span>
              </th>
              <th *ngIf="rowActions?.length" class="right">{{ actionsHeader }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of paged">
              <td *ngFor="let col of columns" [class.right]="col.align === 'right'" [class.center]="col.align === 'center'">
                <ng-container *ngIf="templates[col.key] as tpl; else builtIn">
                  <ng-container *ngTemplateOutlet="tpl; context: { row: row, value: rawValue(row, col), $implicit: row }"></ng-container>
                </ng-container>
                <ng-template #builtIn [ngSwitch]="col.type">
                  <span *ngSwitchCase="'badge'" class="badge" [ngClass]="'badge-' + badgeOf(row, col).variant">{{ badgeOf(row, col).label }}</span>
                  <span *ngSwitchCase="'date'">{{ displayValue(row, col) ? (displayValue(row, col) | date:(col.dateFormat || 'dd/MM/yyyy')) : '—' }}</span>
                  <span *ngSwitchDefault>{{ displayValue(row, col) }}</span>
                </ng-template>
              </td>
              <td *ngIf="rowActions?.length" class="right actions">
                <ng-container *ngFor="let a of rowActions">
                  <button *ngIf="!a.visible || a.visible(row)" type="button" class="act" [ngClass]="'act-' + (a.variant || 'default')"
                          (click)="a.handler(row)" [title]="a.label">
                    <app-icon *ngIf="a.icon" [name]="a.icon" [size]="18"></app-icon>
                    <span *ngIf="!a.icon">{{ a.label }}</span>
                  </button>
                </ng-container>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading / empty -->
      <div *ngIf="loading" class="dt-state"><app-icon name="progress_activity" [size]="28" class="spin"></app-icon><span>Chargement…</span></div>
      <app-empty-state *ngIf="!loading && view.length === 0" [icon]="emptyIcon" [message]="emptyMessage"></app-empty-state>

      <!-- Pagination -->
      <div class="dt-foot" *ngIf="!loading && view.length > 0">
        <span class="dt-count">{{ rangeStart }}–{{ rangeEnd }} sur {{ view.length }}</span>
        <div class="dt-pager" *ngIf="totalPages > 1">
          <button type="button" class="pg" [disabled]="page === 1" (click)="goto(page - 1)"><app-icon name="chevron_left" [size]="18"></app-icon></button>
          <span class="pg-info">Page {{ page }} / {{ totalPages }}</span>
          <button type="button" class="pg" [disabled]="page === totalPages" (click)="goto(page + 1)"><app-icon name="chevron_right" [size]="18"></app-icon></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dt { overflow: hidden; }
    .dt-toolbar { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .dt-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--ink-500); }
    .dt-search input { border: none; background: transparent; outline: none; flex: 1; font-family: var(--font-body); font-size: 14px; color: var(--ink-900); }
    .dt-toolbar-slot { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .dt-toolbar-slot:empty { display: none; }

    .dt-scroll { overflow-x: auto; }
    .data-table th.sortable { cursor: pointer; user-select: none; }
    .data-table th.right, .data-table td.right { text-align: right; }
    .data-table th.center, .data-table td.center { text-align: center; }
    .th-inner { display: inline-flex; align-items: center; gap: 4px; }
    .th-inner .sort-ic.dim { opacity: 0.35; }
    .data-table td.actions { white-space: nowrap; }
    .act { display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: none; background: transparent; cursor: pointer; color: var(--ink-500); padding: 6px; border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 13px; font-weight: 600; transition: all var(--transition); }
    .act:hover { background: var(--surface-2); color: var(--ink-900); }
    .act-primary { color: var(--info); }
    .act-danger:hover { background: var(--danger-tint); color: var(--danger); }

    .dt-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: var(--space-8); color: var(--ink-500); font-family: var(--font-body); font-size: 13px; }
    .spin { animation: dt-spin 1s linear infinite; }
    @keyframes dt-spin { to { transform: rotate(360deg); } }

    .dt-foot { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-5); border-top: 1px solid var(--border); }
    .dt-count { font-size: 13px; color: var(--ink-500); font-family: var(--font-body); }
    .dt-pager { display: flex; align-items: center; gap: 10px; }
    .pg { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid var(--border); background: var(--surface); border-radius: var(--radius-sm); cursor: pointer; color: var(--ink-700); }
    .pg:disabled { opacity: 0.4; cursor: not-allowed; }
    .pg:not(:disabled):hover { border-color: var(--sal-orange); color: var(--sal-orange); }
    .pg-info { font-size: 13px; color: var(--ink-700); font-family: var(--font-body); }

    /* tokens for the projected .badge cells */
    .badge { display: inline-block; padding: 4px 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; font-family: var(--font-body); white-space: nowrap; }
    .badge-success { background: var(--success-tint); color: var(--success); }
    .badge-danger { background: var(--danger-tint); color: var(--danger); }
    .badge-warning { background: var(--sal-orange-tint); color: var(--sal-orange); }
    .badge-info { background: var(--info-tint); color: var(--info); }
    .badge-secondary, .badge-neutral { background: var(--surface-2); color: var(--ink-500); }
  `]
})
export class DataTableComponent implements AfterContentInit {
  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() searchable = true;
  @Input() searchPlaceholder = 'Rechercher…';
  @Input() pageSize = 10;
  @Input() emptyIcon = 'inbox';
  @Input() emptyMessage = 'Aucun résultat';
  @Input() rowActions: TableRowAction[] = [];
  @Input() actionsHeader = 'Actions';
  @Input() exportConfig?: TableExport;
  /** Masque le bouton d'export si false (permissions par rôle). */
  @Input() canExport = true;
  @Input() hasToolbar = false;
  @Output() exported = new EventEmitter<any[]>();

  @ContentChildren(CellTemplateDirective) cellTemplates!: QueryList<CellTemplateDirective>;
  templates: Record<string, TemplateRef<any>> = {};

  search = '';
  sortKey = '';
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;

  constructor(private exportService: ExportService) {}

  ngAfterContentInit(): void {
    const build = () => { this.templates = {}; this.cellTemplates.forEach(t => (this.templates[t.key] = t.tpl)); };
    build();
    this.cellTemplates.changes.subscribe(build);
  }

  // ── Pipeline: search -> sort -> page ──────────────────────────────────
  get view(): any[] {
    let out = this.rows || [];
    const term = this.search.trim().toLowerCase();
    if (term) {
      const keys = this.columns.filter(c => !c.noSearch);
      out = out.filter(r => keys.some(c => String(this.rawValue(r, c) ?? '').toLowerCase().includes(term)));
    }
    if (this.sortKey) {
      const col = this.columns.find(c => c.key === this.sortKey);
      if (col) {
        out = [...out].sort((a, b) => {
          const va = this.rawValue(a, col), vb = this.rawValue(b, col);
          let cmp: number;
          if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
          else cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'fr', { numeric: true });
          return this.sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.view.length / this.pageSize)); }
  get paged(): any[] {
    const p = Math.min(this.page, this.totalPages);
    const start = (p - 1) * this.pageSize;
    return this.view.slice(start, start + this.pageSize);
  }
  get rangeStart(): number { return this.view.length === 0 ? 0 : (Math.min(this.page, this.totalPages) - 1) * this.pageSize + 1; }
  get rangeEnd(): number { return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.view.length); }

  onSearch(v: string): void { this.search = v; this.page = 1; }
  toggleSort(col: TableColumn): void {
    if (this.sortKey === col.key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = col.key; this.sortDir = 'asc'; }
    this.page = 1;
  }
  goto(p: number): void { this.page = Math.min(Math.max(1, p), this.totalPages); }

  // ── Cell helpers ──────────────────────────────────────────────────────
  rawValue(row: any, col: TableColumn): any { return col.format ? col.format(row) : row?.[col.key]; }
  displayValue(row: any, col: TableColumn): any { return this.rawValue(row, col); }
  badgeOf(row: any, col: TableColumn): { label: string; variant: BadgeVariant } {
    return col.badge ? col.badge(row) : { label: String(this.rawValue(row, col) ?? ''), variant: 'neutral' };
  }

  doExport(): void {
    if (this.exportConfig?.handler) { this.exportConfig.handler(); return; }
    const name = this.exportConfig?.filename || 'export';
    this.exportService.exportRows(name, this.columns, this.view);
    this.exported.emit(this.view);
  }
}
