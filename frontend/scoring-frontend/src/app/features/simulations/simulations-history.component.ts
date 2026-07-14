import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ModalComponent } from '../../shared/components/ui/modal.component';
import { DataTableComponent, CellTemplateDirective, TableColumn, TableRowAction } from '../../shared/components/ui/data-table.component';
import { FilterBarComponent, FilterDef, FilterValues, applyTableFilters } from '../../shared/components/ui/filter-bar.component';
import { IconButtonComponent } from '../../shared/components/ui/icon-button.component';
import { SimulationService } from '../../core/services/simulation.service';
import { ClientService } from '../../core/services/client.service';
import { Simulation } from '../../core/models/simulation.model';
import { ToastService } from '../../core/services/toast.service';
import { Client } from '../../core/models/client.model';

interface CmpRow { label: string; real: string; sim: string; changed: boolean; }

@Component({
  selector: 'app-simulations-history',
  standalone: true,
  imports: [
    CommonModule, RouterModule, SidebarComponent, BadgeComponent,
    PageHeaderComponent, IconComponent, ModalComponent,
    DataTableComponent, CellTemplateDirective, FilterBarComponent, IconButtonComponent,
  ],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <app-page-header title="Historique des simulations" subtitle="Toutes les simulations « what-if » enregistrées">
            <a routerLink="/simulations" class="btn btn-primary">
              <app-icon name="science" [size]="18"></app-icon> Nouvelle simulation
            </a>
          </app-page-header>

          <app-data-table
            [columns]="columns" [rows]="filteredRows" [loading]="isLoading"
            [rowActions]="rowActions" [hasToolbar]="true" [pageSize]="12"
            searchPlaceholder="Rechercher par client…"
            emptyIcon="tune" emptyMessage="Aucune simulation enregistrée">

            <app-filter-bar toolbar [filters]="filterDefs" [values]="filterValues"
                            (valuesChange)="onFilters($event)"></app-filter-bar>
            <app-icon-button toolbar icon="refresh" tooltip="Rafraîchir"
                             [loading]="isLoading" (clicked)="refresh()"></app-icon-button>

            <ng-template appCell="tauxEndettementSimule" let-row="row">{{ (row.tauxEndettementSimule || 0) | number:'1.0-1' }}%</ng-template>
            <ng-template appCell="scoreSimule" let-row="row">
              <strong [style.color]="scoreColor(row.scoreSimule || 0)">{{ row.scoreSimule | number:'1.0-0' }}/100</strong>
            </ng-template>
            <ng-template appCell="niveauRisqueSimule" let-row="row">
              <app-badge [label]="formatNiveau(row.niveauRisqueSimule)" [variant]="riskVariant(row.niveauRisqueSimule)"></app-badge>
            </ng-template>
          </app-data-table>

        </div>
      </div>
    </div>

    <!-- ── Détail de la simulation : comparaison réel vs simulé ── -->
    <app-modal [open]="detailOpen" size="lg" [hasFooter]="true"
               [title]="detailSim ? ('Simulation — ' + (detailSim.clientNomComplet || 'Client #' + detailSim.clientId)) : 'Détail de la simulation'"
               (closed)="detailOpen = false">
      <div *ngIf="detailLoading" class="modal-state">Chargement…</div>

      <ng-container *ngIf="!detailLoading && detailSim as s">
        <!-- Résumé impact -->
        <div class="impact-grid">
          <div class="impact">
            <span class="impact-k">Score</span>
            <div class="impact-v">
              <span class="from" [style.color]="scoreColor(s.scoreReel || 0)">{{ s.scoreReel != null ? (s.scoreReel | number:'1.0-0') : '—' }}</span>
              <app-icon name="arrow_forward" [size]="16"></app-icon>
              <span class="to" [style.color]="scoreColor(s.scoreSimule || 0)">{{ s.scoreSimule | number:'1.0-0' }}<span class="unit">/100</span></span>
            </div>
          </div>
          <div class="impact">
            <span class="impact-k">Niveau de risque</span>
            <div class="impact-v">
              <app-badge [label]="formatNiveau(realNiveau)" [variant]="riskVariant(realNiveau)"></app-badge>
              <app-icon name="arrow_forward" [size]="16"></app-icon>
              <app-badge [label]="formatNiveau(s.niveauRisqueSimule || '')" [variant]="riskVariant(s.niveauRisqueSimule || '')"></app-badge>
            </div>
          </div>
        </div>

        <!-- Comparaison paramètres -->
        <div class="cmp-section">
          <h4>Paramètres — réel vs simulé</h4>
          <table class="cmp-table">
            <thead><tr><th>Paramètre</th><th>Réel</th><th></th><th>Simulé</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of comparison" [class.changed]="r.changed">
                <td class="cmp-label">{{ r.label }}</td>
                <td class="cmp-real">{{ r.real }}</td>
                <td class="cmp-arrow"><app-icon *ngIf="r.changed" name="arrow_forward" [size]="15"></app-icon></td>
                <td class="cmp-sim" [class.hl]="r.changed">{{ r.sim }}</td>
              </tr>
            </tbody>
          </table>
          <p class="cmp-note"><span class="dot"></span> Ligne surlignée = paramètre modifié dans la simulation.</p>
        </div>

        <!-- Narration -->
        <div class="cmp-section narr" *ngIf="detailSim.narrationSimulee">
          <h4>Analyse simulée (IA)</h4>
          <p>{{ detailSim.narrationSimulee }}</p>
        </div>
      </ng-container>

      <div footer><button type="button" class="btn btn-secondary" (click)="detailOpen = false">Fermer</button></div>
    </app-modal>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1400px; margin: 0 auto; }
    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } }

    .modal-state { text-align: center; padding: var(--space-6); color: var(--ink-500); font-family: var(--font-body); font-size: 13px; }

    .refresh-glyph { display: inline-block; font-size: 14px; line-height: 1; }
    .refresh-glyph.spin { animation: sh-spin 1s linear infinite; }
    @keyframes sh-spin { to { transform: rotate(360deg); } }

    .impact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-5); }
    .impact { background: var(--surface-2); border-radius: var(--radius-sm); padding: var(--space-4); }
    .impact-k { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-500); margin-bottom: 8px; font-family: var(--font-body); }
    .impact-v { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); }
    .impact-v app-icon { color: var(--ink-300); }
    .from, .to { font-size: 24px; font-weight: 700; }
    .from { opacity: 0.75; }
    .unit { font-size: 13px; color: var(--ink-500); }

    .cmp-section { margin-top: var(--space-5); }
    .cmp-section h4 { margin: 0 0 var(--space-3); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-500); font-family: var(--font-body); }
    .cmp-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: 13px; }
    .cmp-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--ink-300); font-weight: 600; padding: 6px 10px; border-bottom: 1px solid var(--border); }
    .cmp-table td { padding: 9px 10px; border-bottom: 1px solid var(--border); color: var(--ink-700); }
    .cmp-table tr.changed { background: var(--sal-orange-tint); }
    .cmp-label { font-weight: 600; color: var(--ink-900); }
    .cmp-arrow { width: 24px; text-align: center; color: var(--sal-orange); }
    .cmp-sim.hl { font-weight: 700; color: var(--sal-orange-dark); }
    .cmp-note { display: flex; align-items: center; gap: 7px; margin: 10px 0 0; font-size: 12px; color: var(--ink-500); font-family: var(--font-body); }
    .cmp-note .dot { width: 12px; height: 12px; border-radius: 3px; background: var(--sal-orange-tint); border: 1px solid var(--sal-orange); }

    .narr { padding: var(--space-4) var(--space-5); background: var(--surface-2); border-radius: var(--radius-sm); }
    .narr p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--ink-700); white-space: pre-line; font-family: var(--font-body); }
  `]
})
export class SimulationsHistoryComponent implements OnInit {
  simulations: Simulation[] = [];
  isLoading = false;
  filterValues: FilterValues = {};
  rowActions: TableRowAction[] = [];

  detailOpen = false;
  detailLoading = false;
  detailSim: Simulation | null = null;
  detailClient: Client | null = null;

  readonly filterDefs: FilterDef[] = [
    { key: 'niveauRisqueSimule', label: 'risque', type: 'select', allLabel: 'Tous les risques',
      options: [{ value: 'FAIBLE', label: 'Faible' }, { value: 'MOYEN', label: 'Moyen' }, { value: 'ELEVE', label: 'Élevé' }] },
    { key: 'createdAt', label: 'période', type: 'daterange', match: (r, v) => this.dateInRange(r.createdAt || r.dateCreation, v) },
  ];

  readonly columns: TableColumn[] = [
    { key: 'clientNomComplet', header: 'Client', sortable: true, format: (r) => r.clientNomComplet || `Client #${r.clientId}` },
    { key: 'revenusSimules', header: 'Revenus', sortable: true, align: 'right', format: (r) => `${(r.revenusSimules ?? 0).toLocaleString('fr-FR')} DH`, noSearch: true },
    { key: 'chargesSimulees', header: 'Charges', sortable: true, align: 'right', format: (r) => `${(r.chargesSimulees ?? 0).toLocaleString('fr-FR')} DH`, noSearch: true },
    { key: 'tauxEndettementSimule', header: "Taux d'endettement", sortable: true, align: 'right', format: (r) => r.tauxEndettementSimule ?? 0, noSearch: true },
    { key: 'scoreSimule', header: 'Score simulé', sortable: true, align: 'right', format: (r) => r.scoreSimule ?? -1, noSearch: true },
    { key: 'niveauRisqueSimule', header: 'Niveau', sortable: true, format: (r) => r.niveauRisqueSimule, noSearch: true },
    { key: 'createdAt', header: 'Date', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy HH:mm', format: (r) => r.createdAt || r.dateCreation, noSearch: true },
  ];

  private pendingOpenId: string | null = null;

  constructor(
    private simulationService: SimulationService,
    private clientService: ClientService,
    private toast: ToastService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.rowActions = [
      { label: 'Détail', icon: 'visibility', variant: 'primary', handler: (r) => this.openDetail(r) },
    ];
    // Deep-link ?open=<simId> : ouvre directement le détail (depuis l'historique client).
    this.pendingOpenId = this.route.snapshot.queryParamMap.get('open');
    this.load();
  }

  load(notify = false): void {
    this.isLoading = true;
    this.simulationService.getSimulations().subscribe({
      next: (data) => {
        this.simulations = data;
        this.isLoading = false;
        if (notify) this.toast.info('Historique des simulations actualisé.');
        if (this.pendingOpenId) {
          const row = this.simulations.find(s => String(s.id) === this.pendingOpenId);
          this.pendingOpenId = null;
          if (row) this.openDetail(row);
        }
      },
      error: (err) => {
        console.error('Erreur chargement simulations', err);
        this.isLoading = false;
        this.toast.error("Erreur réseau — impossible de charger l'historique.");
      },
    });
  }

  /** Recharge les données sans recharger la page — filtres, recherche et tri conservés. */
  refresh(): void { this.load(true); }

  get filteredRows(): Simulation[] { return applyTableFilters(this.simulations, this.filterDefs, this.filterValues); }
  onFilters(v: FilterValues): void { this.filterValues = { ...v }; }

  // ── Détail ──
  openDetail(sim: Simulation): void {
    this.detailSim = sim;
    this.detailClient = null;
    this.detailLoading = true;
    this.detailOpen = true;
    this.clientService.getClientById(String(sim.clientId)).subscribe({
      next: (c) => { this.detailClient = c; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }

  get realNiveau(): string { return this.detailClient?.dernierScore?.niveauRisque || ''; }

  /** Comparaison réel (client) vs simulé (paramètres persistés) pour chaque variable. */
  get comparison(): CmpRow[] {
    const s = this.detailSim;
    if (!s) return [];
    const c = this.detailClient;
    const p = (s.parametresSimules || {}) as Record<string, unknown>;
    const dh = (v: unknown) => `${Number(v).toLocaleString('fr-FR')} DH`;
    const pct = (v: unknown) => `${Number(v).toFixed(1)}%`;
    const int = (v: unknown) => String(Number(v));
    const rows: CmpRow[] = [];
    const push = (label: string, real: unknown, sim: unknown, fmt: (v: unknown) => string) => {
      const rS = real == null ? '—' : fmt(real);
      const sS = sim == null ? '—' : fmt(sim);
      rows.push({ label, real: rS, sim: sS, changed: rS !== sS });
    };
    push('Revenus mensuels', c?.revenusMensuels, p['revenusMensuels'], dh);
    push('Charges mensuelles', c?.chargesMensuelles, p['chargesMensuelles'], dh);
    push("Taux d'endettement", c?.tauxEndettement, p['tauxEndettement'], pct);
    push('Situation professionnelle', c?.situationPro, p['situationPro'], (v) => this.situationLabel(String(v)));
    push('Historique financier', c?.historiqueFinancier, p['historiqueFinancier'], (v) => this.histLabel(String(v)));
    push('Retards 30–59 j', c?.nbRetards3059Jours, p['nbRetards3059Jours'], int);
    push('Retards 60–89 j', c?.nbRetards6089Jours, p['nbRetards6089Jours'], int);
    push('Retards ≥ 90 j', c?.nbRetards90JoursPlus, p['nbRetards90JoursPlus'], int);
    push('Crédits ouverts', c?.nbCreditsOuverts, p['nbCreditsOuverts'], int);
    push('Prêts immobiliers', c?.nbPretsImmobiliers, p['nbPretsImmobiliers'], int);
    push('Personnes à charge', c?.nbPersonnesACharge, p['nbPersonnesACharge'], int);
    // Crédit renouvelable : trio complet plafond / solde / utilisation, réel ET simulé (#1, #2).
    // Toujours affiché (— si non renseigné) ; les montants simulés viennent des paramètres
    // stockés (simulations antérieures à ce changement : montants absents → —).
    push('Plafond crédit renouv.', c?.plafondCredit, p['plafondCredit'], dh);
    push('Solde utilisé', c?.soldeCredit, p['soldeCredit'], dh);
    push('Utilisation crédit renouv.', c?.utilisationCreditRenouvelable, p['utilisationCreditRenouvelable'], pct);
    return rows;
  }

  private dateInRange(value: string | undefined, v: { from?: string; to?: string }): boolean {
    if (!value) return false;
    const d = new Date(value).getTime();
    if (Number.isNaN(d)) return false;
    if (v.from && d < new Date(v.from).getTime()) return false;
    if (v.to && d > new Date(v.to).getTime() + 86399999) return false;
    return true;
  }

  scoreColor(score: number): string {
    if (score <= 30) return 'var(--success)';
    if (score <= 60) return 'var(--sal-orange)';
    return 'var(--danger)';
  }

  riskVariant(niveau: string): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (niveau) {
      case 'FAIBLE': return 'success';
      case 'MOYEN': return 'warning';
      case 'ELEVE': return 'danger';
      default: return 'neutral';
    }
  }

  formatNiveau(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return 'Faible';
      case 'MOYEN': return 'Moyen';
      case 'ELEVE': return 'Élevé';
      default: return niveau || '—';
    }
  }

  situationLabel(s: string): string {
    switch (s) {
      case 'CDI': return 'Salarié (CDI)';
      case 'CDD': return 'Salarié (CDD)';
      case 'INDEPENDANT': return 'Indépendant';
      case 'SANS_EMPLOI': return 'Sans emploi';
      default: return s || '—';
    }
  }

  histLabel(h: string): string {
    switch (h) {
      case 'BON': return 'Bon';
      case 'MOYEN': return 'Moyen';
      case 'MAUVAIS': return 'Mauvais';
      default: return h || '—';
    }
  }
}
