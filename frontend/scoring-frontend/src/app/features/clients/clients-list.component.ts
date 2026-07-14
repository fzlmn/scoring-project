import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import {
  DataTableComponent, CellTemplateDirective, TableColumn, TableRowAction, TableExport,
} from '../../shared/components/ui/data-table.component';
import { FilterBarComponent, FilterDef, FilterValues, applyTableFilters } from '../../shared/components/ui/filter-bar.component';
import { IconButtonComponent } from '../../shared/components/ui/icon-button.component';
import { ToastService } from '../../core/services/toast.service';
import { ClientService } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { Client } from '../../core/models/client.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, SidebarComponent, BadgeComponent, IconComponent,
    PageHeaderComponent, DataTableComponent, CellTemplateDirective, FilterBarComponent, IconButtonComponent,
  ],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <app-page-header title="Clients" subtitle="Consultez et recherchez les clients de votre périmètre">
            <a *ngIf="isCharge" routerLink="/clients/nouveau" class="btn btn-primary">
              <app-icon name="add" [size]="18"></app-icon> Nouveau client
            </a>
          </app-page-header>

          <app-data-table
            [columns]="columns" [rows]="filteredRows" [loading]="isLoading"
            [rowActions]="rowActions" [hasToolbar]="true"
            searchPlaceholder="Rechercher par nom, prénom, CIN…"
            emptyIcon="search_off" emptyMessage="Aucun client trouvé"
            [exportConfig]="exportConfig" [canExport]="isSuperviseur">

            <app-filter-bar toolbar [filters]="filterDefs" [values]="filterValues"
                            (valuesChange)="onFilters($event)"></app-filter-bar>
            <app-icon-button toolbar icon="refresh" tooltip="Rafraîchir"
                             [loading]="isLoading" (clicked)="refresh()"></app-icon-button>

            <ng-template appCell="client" let-row="row"><span class="cname">{{ row.prenom }} {{ row.nom }}</span></ng-template>
            <ng-template appCell="cin" let-row="row"><span class="mono">{{ row.cin }}</span></ng-template>
            <ng-template appCell="revenusMensuels" let-row="row">{{ row.revenusMensuels | number:'1.0-0' }} DH</ng-template>
            <ng-template appCell="tauxEndettement" let-row="row">
              <span [class.warn]="(row.tauxEndettement || 0) > 50" [class.danger]="(row.tauxEndettement || 0) > 80">
                {{ (row.tauxEndettement || 0) | number:'1.0-1' }}%
              </span>
            </ng-template>
            <ng-template appCell="score" let-row="row">
              <ng-container *ngIf="isSuperviseur; else nonSup">
                <strong *ngIf="row.dernierScore" [style.color]="getScoreColor(row.dernierScore.valeurScore)">{{ row.dernierScore.valeurScore | number:'1.0-0' }}/100</strong>
                <span *ngIf="!row.dernierScore" class="muted">N/A</span>
              </ng-container>
              <ng-template #nonSup>
                <strong *ngIf="row.dernierScore?.statut === 'VALIDE'" [style.color]="getScoreColor(row.dernierScore.valeurScore)">{{ row.dernierScore.valeurScore | number:'1.0-0' }}/100</strong>
                <span *ngIf="row.dernierScore?.statut === 'EN_ATTENTE'" class="muted">En attente</span>
                <span *ngIf="!row.dernierScore" class="muted">N/A</span>
              </ng-template>
            </ng-template>
            <ng-template appCell="statut" let-row="row">
              <app-badge *ngIf="row.dernierScore && (isSuperviseur || row.dernierScore.statut === 'VALIDE')"
                         [label]="formatStatut(row.dernierScore.statut)" [variant]="getScoreBadgeVariant(row.dernierScore.statut)"></app-badge>
              <span *ngIf="!row.dernierScore || (!isSuperviseur && row.dernierScore.statut !== 'VALIDE')" class="muted">—</span>
            </ng-template>
          </app-data-table>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1400px; margin: 0 auto; }
    .cname { font-weight: 600; color: var(--ink-900); }
    .mono { font-family: 'Courier New', monospace; font-size: 12px; color: var(--ink-500); }
    .muted { color: var(--ink-300); font-size: 12px; }
    .warn { color: var(--sal-orange); font-weight: 600; }
    .danger { color: var(--danger); font-weight: 600; }
    .refresh-glyph { display: inline-block; font-size: 14px; line-height: 1; }
    .refresh-glyph.spin { animation: cl-spin 1s linear infinite; }
    @keyframes cl-spin { to { transform: rotate(360deg); } }
    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } }
  `]
})
export class ClientsListComponent implements OnInit {
  clients: Client[] = [];
  user: User | null = null;
  isLoading = false;
  exporting = false;

  filterValues: FilterValues = {};
  rowActions: TableRowAction[] = [];

  readonly filterDefs: FilterDef[] = [
    { key: 'risque', label: 'risque', type: 'select', allLabel: 'Tous les risques',
      options: [{ value: 'FAIBLE', label: 'Faible' }, { value: 'MOYEN', label: 'Moyen' }, { value: 'ELEVE', label: 'Élevé' }],
      match: (r, v) => r.dernierScore?.niveauRisque === v },
    { key: 'statut', label: 'statut', type: 'select', allLabel: 'Tous les statuts',
      options: [{ value: 'VALIDE', label: 'Validé' }, { value: 'EN_ATTENTE', label: 'En attente' }, { value: 'REJETE', label: 'Rejeté' }],
      match: (r, v) => r.dernierScore?.statut === v },
    { key: 'situation', label: 'situation', type: 'select', allLabel: 'Toutes situations',
      options: [{ value: 'CDI', label: 'Salarié (CDI)' }, { value: 'CDD', label: 'Salarié (CDD)' }, { value: 'INDEPENDANT', label: 'Indépendant' }, { value: 'SANS_EMPLOI', label: 'Sans emploi' }],
      match: (r, v) => r.situationPro === v },
  ];

  columns: TableColumn[] = [];

  private buildColumns(): TableColumn[] {
    const cols: TableColumn[] = [
      { key: 'client', header: 'Client', sortable: true, format: (r) => `${r.prenom} ${r.nom}` },
      { key: 'cin', header: 'CIN', sortable: true, format: (r) => r.cin },
      { key: 'situationPro', header: 'Situation', sortable: true, format: (r) => this.formatSituationPro(r.situationPro) },
      { key: 'revenusMensuels', header: 'Revenus', sortable: true, align: 'right', format: (r) => r.revenusMensuels ?? 0, noSearch: true },
      { key: 'tauxEndettement', header: "Taux d'endettement", sortable: true, align: 'right', format: (r) => r.tauxEndettement ?? 0, noSearch: true },
      { key: 'score', header: 'Score', sortable: true, align: 'right', format: (r) => r.dernierScore?.valeurScore ?? -1, noSearch: true },
    ];
    // « Statut » = état de validation du score (workflow interne). Masqué pour le chargé de
    // clientèle, qui ne participe pas à la validation et pourrait le confondre avec l'état du client.
    if (!this.isCharge) {
      cols.push({ key: 'statut', header: 'Statut', format: (r) => r.dernierScore?.statut ?? '', noSearch: true });
    }
    return cols;
  }

  readonly exportConfig: TableExport = { filename: 'clients', handler: () => this.exportExcel() };

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.columns = this.buildColumns();
    this.rowActions = [
      { label: 'Détail', icon: 'visibility', variant: 'primary', handler: (r) => this.router.navigate(['/clients', r.id]) },
      { label: 'Modifier', icon: 'edit', visible: (r) => this.isCharge && !!r.id, handler: (r) => this.router.navigate(['/clients', r.id, 'modifier']) },
    ];
    // Pré-remplissage des filtres depuis l'URL (KPIs / graphiques du dashboard).
    this.route.queryParams.subscribe((p) => {
      this.filterValues = {
        risque: (p['risque'] || '').toUpperCase() || undefined,
        statut: (p['statut'] || '').toUpperCase() || undefined,
        situation: (p['situation'] || '').toUpperCase() || undefined,
        periode: (p['periode'] || '').toLowerCase() || undefined,
      };
    });
    this.loadClients();
  }

  get isCharge(): boolean { return this.user?.role === 'CHARGE_CLIENTELE'; }
  get isSuperviseur(): boolean { return this.user?.role === 'SUPERVISEUR'; }

  loadClients(notify = false): void {
    this.isLoading = true;
    this.clientService.getClients().subscribe({
      next: (data) => {
        this.clients = data;
        this.isLoading = false;
        if (notify) this.toast.info('Liste des clients actualisée.');
      },
      error: (err) => {
        console.error('Erreur lors du chargement des clients', err);
        this.isLoading = false;
        this.toast.error('Erreur réseau — impossible de charger les clients.');
      },
    });
  }

  /** Recharge les données sans recharger la page — filtres, recherche et tri conservés. */
  refresh(): void { this.loadClients(true); }

  get filteredRows(): Client[] {
    let rows = applyTableFilters(this.clients, this.filterDefs, this.filterValues);
    if (this.filterValues['periode'] === 'mois') {
      const now = new Date();
      rows = rows.filter(c => {
        if (!c.createdAt) return false;
        const d = new Date(c.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    }
    return rows;
  }

  /** Synchronise les filtres dans l'URL (replaceUrl) : le bouton « Retour » de la
   *  fiche client restaure alors exactement les filtres précédents (contexte 4.6). */
  onFilters(v: FilterValues): void {
    this.filterValues = { ...v };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        risque: v['risque'] || null,
        statut: v['statut'] || null,
        situation: v['situation'] || null,
        periode: v['periode'] || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;
    this.clientService.exportClients('', '').subscribe({
      next: (res: HttpResponse<Blob>) => {
        this.exporting = false;
        const blob = res.body; if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = this.extractFilename(res) || 'clients.xlsx'; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.exporting = false; },
    });
  }

  private extractFilename(res: HttpResponse<Blob>): string | null {
    const cd = res.headers.get('Content-Disposition');
    if (!cd) return null;
    const m = /filename="?([^"]+)"?/.exec(cd);
    return m ? m[1] : null;
  }

  formatSituationPro(s: string): string {
    switch (s) { case 'CDI': return 'Salarié (CDI)'; case 'CDD': return 'Salarié (CDD)'; case 'INDEPENDANT': return 'Indépendant'; case 'SANS_EMPLOI': return 'Sans emploi'; default: return s; }
  }
  formatStatut(statut: string): string {
    switch (statut) { case 'VALIDE': return 'Validé'; case 'EN_ATTENTE': return 'En attente'; case 'REJETE': return 'Rejeté'; default: return statut; }
  }
  getScoreColor(score: number): string {
    if (score <= 30) return '#2D9C6A';
    if (score <= 60) return '#E8621A';
    return '#D94040';
  }
  getScoreBadgeVariant(statut: string): 'success' | 'warning' | 'info' | 'danger' {
    switch (statut) { case 'VALIDE': return 'success'; case 'EN_ATTENTE': return 'info'; case 'REJETE': return 'danger'; default: return 'info'; }
  }
}
