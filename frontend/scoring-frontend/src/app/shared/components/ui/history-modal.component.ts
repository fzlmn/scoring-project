import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from './modal.component';
import { IconComponent } from './icon.component';

export interface HistoryColumn {
  key: string;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  /** Style de rendu de la cellule. */
  cell?: 'text' | 'date' | 'score' | 'niveau' | 'statut' | 'moneyPair';
  /** Accesseur personnalisé (tri / recherche / affichage). Défaut : row[key]. */
  value?: (row: any) => any;
  /** 2e clé pour le rendu 'moneyPair' (ex. revenus / charges). */
  key2?: string;
}

/**
 * Modale d'historique réutilisable : recherche, tri par colonne et pagination.
 * Un clic sur une ligne émet `rowClick` (pour ouvrir l'élément concerné).
 *
 *   <app-history-modal [open]="show" title="Historique des scores"
 *       [columns]="cols" [rows]="rows" (rowClick)="open($event)" (closed)="show=false">
 *   </app-history-modal>
 */
@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, IconComponent],
  providers: [DatePipe, DecimalPipe],
  template: `
    <app-modal [open]="open" [title]="title" size="lg" (closed)="closed.emit()">
      <!-- Recherche -->
      <div class="hm-toolbar" *ngIf="hasSearch">
        <div class="hm-search">
          <app-icon name="search" [size]="16"></app-icon>
          <input type="text" [(ngModel)]="search" (ngModelChange)="onSearch()"
                 [placeholder]="searchPlaceholder" />
          <button *ngIf="search" type="button" class="hm-clear" (click)="search=''; onSearch()">✕</button>
        </div>
        <span class="hm-count">{{ filtered.length }} élément(s)</span>
      </div>

      <div class="hm-table-wrap">
        <table class="hm-table" *ngIf="filtered.length; else empty">
          <thead>
            <tr>
              <th *ngFor="let c of columns" [class.sortable]="c.sortable" (click)="c.sortable && toggleSort(c)">
                {{ c.header }}
                <span class="hm-sort" *ngIf="c.sortable">
                  <app-icon *ngIf="sortKey === c.key" [name]="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" [size]="13"></app-icon>
                </span>
              </th>
              <th *ngIf="clickable" class="hm-open-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of paged" [class.clickable]="clickable" (click)="clickable && rowClick.emit(row)">
              <td *ngFor="let c of columns" [ngSwitch]="c.cell">
                <strong *ngSwitchCase="'score'" [style.color]="scoreColor(val(c, row))">{{ val(c, row) | number:'1.0-0' }}/100</strong>
                <span *ngSwitchCase="'niveau'">{{ formatNiveau(val(c, row)) }}</span>
                <span *ngSwitchCase="'statut'" class="hm-chip" [class]="'hm-chip ' + (val(c, row) || '').toLowerCase()">{{ formatStatut(val(c, row)) }}</span>
                <span *ngSwitchCase="'date'">{{ val(c, row) | date:'dd/MM/yyyy HH:mm' }}</span>
                <span *ngSwitchCase="'moneyPair'">{{ row[c.key] | number:'1.0-0' }} / {{ row[c.key2!] | number:'1.0-0' }} DH</span>
                <span *ngSwitchDefault>{{ val(c, row) }}</span>
              </td>
              <td *ngIf="clickable" class="hm-open-col"><app-icon name="open_in_new" [size]="16"></app-icon></td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty><div class="hm-empty">{{ emptyMessage }}</div></ng-template>
      </div>

      <!-- Pagination -->
      <div class="hm-pagination" *ngIf="totalPages > 1">
        <button type="button" (click)="goToPage(page - 1)" [disabled]="page === 0">‹</button>
        <span>Page {{ page + 1 }} / {{ totalPages }}</span>
        <button type="button" (click)="goToPage(page + 1)" [disabled]="page >= totalPages - 1">›</button>
      </div>
    </app-modal>
  `,
  styles: [`
    .hm-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .hm-search { display: flex; align-items: center; gap: 8px; flex: 1; max-width: 320px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; color: var(--ink-500); }
    .hm-search input { border: none; outline: none; flex: 1; font-size: 13px; font-family: var(--font-body); color: var(--ink-900); background: transparent; }
    .hm-clear { border: none; background: transparent; color: var(--ink-500); cursor: pointer; font-size: 12px; }
    .hm-count { font-size: 12px; color: var(--ink-500); font-family: var(--font-body); }
    .hm-table-wrap { overflow-x: auto; }
    .hm-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); }
    .hm-table th { text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.4px; padding: 10px 10px; border-bottom: 2px solid var(--surface-2); white-space: nowrap; }
    .hm-table th.sortable { cursor: pointer; user-select: none; }
    .hm-table th.sortable:hover { color: var(--ink-900); }
    .hm-sort { display: inline-flex; vertical-align: middle; margin-left: 2px; }
    .hm-table td { font-size: 13px; color: var(--ink-900); padding: 11px 10px; border-bottom: 1px solid var(--surface-2); white-space: nowrap; }
    .hm-table tr.clickable { cursor: pointer; }
    .hm-table tr.clickable:hover td { background: var(--surface-2); }
    .hm-open-col { width: 32px; text-align: right; color: var(--ink-300); }
    .hm-chip { padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .hm-chip.valide { background: #E3F5EE; color: #2D9C6A; }
    .hm-chip.en_attente { background: #E3F0FF; color: #1A6FD4; }
    .hm-chip.rejete { background: #FCE3E3; color: #D94040; }
    .hm-empty { padding: 36px; text-align: center; color: var(--ink-500); font-size: 13px; font-family: var(--font-body); }
    .hm-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 16px; font-size: 13px; color: var(--ink-700); font-family: var(--font-body); }
    .hm-pagination button { width: 30px; height: 30px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); cursor: pointer; font-size: 15px; }
    .hm-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class HistoryModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() columns: HistoryColumn[] = [];
  @Input() set rows(v: any[]) { this._rows = v || []; this.recompute(); }
  get rows(): any[] { return this._rows; }
  @Input() pageSize = 8;
  @Input() searchPlaceholder = 'Rechercher…';
  @Input() emptyMessage = 'Aucun élément.';
  @Input() clickable = true;
  @Output() closed = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<any>();

  private _rows: any[] = [];
  filtered: any[] = [];
  paged: any[] = [];
  search = '';
  sortKey = '';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 0;

  get hasSearch(): boolean { return this.columns.some(c => c.searchable); }
  get totalPages(): number { return Math.ceil(this.filtered.length / this.pageSize); }

  val(c: HistoryColumn, row: any): any { return c.value ? c.value(row) : row[c.key]; }

  onSearch(): void { this.page = 0; this.recompute(); }

  toggleSort(c: HistoryColumn): void {
    if (this.sortKey === c.key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = c.key; this.sortDir = 'desc';
    }
    this.recompute();
  }

  goToPage(p: number): void {
    this.page = Math.max(0, Math.min(p, this.totalPages - 1));
    this.updatePaged();
  }

  private recompute(): void {
    const q = this.search.trim().toLowerCase();
    let list = this._rows;
    if (q) {
      const cols = this.columns.filter(c => c.searchable);
      list = list.filter(row => cols.some(c => String(this.val(c, row) ?? '').toLowerCase().includes(q)));
    }
    if (this.sortKey) {
      const col = this.columns.find(c => c.key === this.sortKey);
      const dir = this.sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const va = col ? this.val(col, a) : a[this.sortKey];
        const vb = col ? this.val(col, b) : b[this.sortKey];
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    this.filtered = list;
    if (this.page >= this.totalPages) this.page = Math.max(0, this.totalPages - 1);
    this.updatePaged();
  }

  private updatePaged(): void {
    const start = this.page * this.pageSize;
    this.paged = this.filtered.slice(start, start + this.pageSize);
  }

  scoreColor(s: number): string { return s <= 30 ? '#2D9C6A' : s <= 60 ? '#E8621A' : '#D94040'; }
  formatNiveau(n: string): string {
    return n === 'FAIBLE' ? 'Risque faible' : n === 'MOYEN' ? 'Risque modéré' : n === 'ELEVE' ? 'Risque élevé' : (n || '—');
  }
  formatStatut(s: string): string {
    return s === 'VALIDE' ? 'Validé' : s === 'EN_ATTENTE' ? 'En attente' : s === 'REJETE' ? 'Rejeté' : (s || '');
  }
}
