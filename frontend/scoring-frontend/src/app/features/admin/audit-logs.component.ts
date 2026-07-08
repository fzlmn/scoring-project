import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import {
  DataTableComponent, CellTemplateDirective, TableColumn,
} from '../../shared/components/ui/data-table.component';
import { FilterBarComponent, FilterDef, FilterValues, applyTableFilters } from '../../shared/components/ui/filter-bar.component';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog } from '../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule, SidebarComponent, BadgeComponent, PageHeaderComponent,
    DataTableComponent, CellTemplateDirective, FilterBarComponent,
  ],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <app-page-header title="Journal d'audit" subtitle="Traçabilité des actions effectuées dans l'application"></app-page-header>

          <app-data-table
            [columns]="columns" [rows]="filteredRows" [loading]="isLoading"
            [hasToolbar]="true" [pageSize]="15"
            searchPlaceholder="Rechercher par utilisateur, action…"
            emptyIcon="history" emptyMessage="Aucune entrée d'audit">

            <app-filter-bar toolbar [filters]="filterDefs" [values]="filterValues"
                            (valuesChange)="onFilters($event)"></app-filter-bar>

            <ng-template appCell="action" let-row="row">
              <app-badge [label]="formatAction(row.action)" [variant]="actionVariant(row.action)"></app-badge>
            </ng-template>
            <ng-template appCell="userNomComplet" let-row="row">{{ userLabel(row) }}</ng-template>
            <ng-template appCell="entiteId" let-row="row"><span class="mono" *ngIf="row.entiteId">#{{ row.entiteId }}</span><span *ngIf="!row.entiteId" class="muted">—</span></ng-template>
          </app-data-table>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1400px; margin: 0 auto; }
    .mono { font-family: 'Courier New', monospace; font-size: 12px; color: var(--ink-500); }
    .muted { color: var(--ink-300); }
    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } }
  `]
})
export class AuditLogsComponent implements OnInit {
  auditLogs: AuditLog[] = [];
  isLoading = false;
  filterValues: FilterValues = {};
  /** Référence stable (recalculée uniquement après chargement des données). */
  filterDefs: FilterDef[] = this.buildFilterDefs();

  readonly columns: TableColumn[] = [
    { key: 'createdAt', header: 'Date', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy HH:mm', format: (r) => r.createdAt || r.dateCreation, noSearch: true },
    { key: 'userNomComplet', header: 'Utilisateur', sortable: true, format: (r) => this.userLabel(r) },
    { key: 'action', header: 'Action', sortable: true, format: (r) => this.formatAction(r.action) },
    { key: 'cible', header: 'Concerné', sortable: true, format: (r) => r.cible || '—' },
    { key: 'entite', header: 'Entité', sortable: true, format: (r) => r.entite || r.ressource || '—' },
    { key: 'entiteId', header: 'Réf.', align: 'right', format: (r) => r.entiteId ?? r.ressourceId ?? '', noSearch: true },
  ];

  constructor(private auditLogService: AuditLogService) {}

  ngOnInit(): void { this.loadAuditLogs(); }

  loadAuditLogs(): void {
    this.isLoading = true;
    this.auditLogService.getAuditLogs().subscribe({
      next: (data) => { this.auditLogs = data; this.filterDefs = this.buildFilterDefs(); this.isLoading = false; },
      error: (err) => { console.error('Erreur lors du chargement des audit logs', err); this.isLoading = false; },
    });
  }

  /** Filtres — les valeurs d'action/entité sont dérivées des données réelles. */
  private buildFilterDefs(): FilterDef[] {
    const logs = this.auditLogs || [];
    const actions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)))
      .sort()
      .map(a => ({ value: a as string, label: this.formatAction(a as string) }));
    const entites = Array.from(new Set(logs.map(l => l.entite || l.ressource).filter(Boolean)))
      .sort()
      .map(e => ({ value: e as string, label: e as string }));
    return [
      { key: 'action', label: 'action', type: 'select', allLabel: 'Toutes les actions', options: actions },
      { key: 'entite', label: 'entité', type: 'select', allLabel: 'Toutes les entités', options: entites,
        match: (r, v) => (r.entite || r.ressource) === v },
      { key: 'createdAt', label: 'période', type: 'daterange', match: (r, v) => this.dateInRange(r.createdAt || r.dateCreation, v) },
    ];
  }

  get filteredRows(): AuditLog[] { return applyTableFilters(this.auditLogs, this.filterDefs, this.filterValues); }
  onFilters(v: FilterValues): void { this.filterValues = { ...v }; }

  private dateInRange(value: string | undefined, v: { from?: string; to?: string }): boolean {
    if (!value) return false;
    const d = new Date(value).getTime();
    if (Number.isNaN(d)) return false;
    if (v.from && d < new Date(v.from).getTime()) return false;
    if (v.to && d > new Date(v.to).getTime() + 86399999) return false;
    return true;
  }

  userLabel(log: AuditLog): string {
    if (log.userNomComplet) return log.userNomComplet;
    if (log.userId != null) return `Utilisateur #${log.userId}`;
    return 'Système';
  }

  formatAction(action: string): string {
    const map: Record<string, string> = {
      CREATION_CLIENT: 'Création client',
      MODIFICATION_CLIENT: 'Modification client',
      RECALCUL_SCORE: 'Recalcul score',
      VALIDATION_SCORE: 'Validation score',
      REJET_SCORE: 'Rejet score',
      SIMULATION: 'Simulation',
      CREATION_UTILISATEUR: 'Création utilisateur',
      MODIFICATION_UTILISATEUR: 'Modification utilisateur',
      ACTIVATION_UTILISATEUR: 'Activation utilisateur',
      DESACTIVATION_UTILISATEUR: 'Désactivation utilisateur',
      REINITIALISATION_MOT_DE_PASSE: 'Réinitialisation mot de passe',
    };
    return map[action] || (action ? action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ') : '');
  }

  actionVariant(action: string): 'success' | 'danger' | 'info' | 'secondary' {
    const a = (action || '').toUpperCase();
    // DESACTIVATION contient « ACTIVATION » : tester le rouge en premier.
    if (a.includes('DESACTIVATION') || a.includes('REJET') || a.includes('SUPPRESSION') || a.includes('DELETE')) return 'danger';
    if (a.includes('CREATION') || a.includes('VALIDATION') || a.includes('ACTIVATION')) return 'success';
    if (a.includes('MODIFICATION') || a.includes('RECALCUL') || a.includes('REINITIALISATION') || a.includes('SIMULATION')) return 'info';
    return 'secondary';
  }
}
