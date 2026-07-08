import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { ModalComponent } from '../../shared/components/ui/modal.component';
import {
  DataTableComponent, CellTemplateDirective, TableColumn, TableRowAction, TableExport,
} from '../../shared/components/ui/data-table.component';
import { FilterBarComponent, FilterDef, FilterValues, applyTableFilters } from '../../shared/components/ui/filter-bar.component';
import { ScoreService } from '../../core/services/score.service';
import { AuthService } from '../../core/services/auth.service';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/toast.service';
import { Score, ScoreListItem } from '../../core/models/score.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-scores-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, SidebarComponent, BadgeComponent,
    PageHeaderComponent, ModalComponent, DataTableComponent, CellTemplateDirective, FilterBarComponent,
  ],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <app-page-header title="Scores" [subtitle]="headerSubtitle">
            <a *ngIf="isSuperviseur" routerLink="/scores/validation" class="btn btn-primary">
              File de validation
            </a>
          </app-page-header>

          <app-data-table
            [columns]="columns" [rows]="filteredRows" [loading]="isLoading"
            [rowActions]="rowActions" [hasToolbar]="true" [pageSize]="12"
            searchPlaceholder="Rechercher par client…"
            emptyIcon="query_stats" emptyMessage="Aucun score trouvé"
            [exportConfig]="exportConfig" [canExport]="isSuperviseur">

            <app-filter-bar toolbar [filters]="filterDefs" [values]="filterValues"
                            (valuesChange)="onFilters($event)"></app-filter-bar>
            <button toolbar type="button" class="btn btn-secondary btn-refresh" (click)="refresh()"
                    [disabled]="isLoading" title="Recharger les scores (filtres conservés)">
              <span class="refresh-glyph" [class.spin]="isLoading">⟳</span> Rafraîchir
            </button>

            <ng-template appCell="valeurScore" let-row="row">
              <strong [style.color]="getScoreColor(row.valeurScore)">{{ row.valeurScore | number:'1.0-0' }}/100</strong>
            </ng-template>
            <ng-template appCell="niveauRisque" let-row="row">
              <app-badge [label]="formatNiveau(row.niveauRisque)" [variant]="getRiskBadgeVariant(row.niveauRisque)"></app-badge>
            </ng-template>
            <ng-template appCell="statut" let-row="row">
              <app-badge [label]="formatStatut(row.statut)" [variant]="getScoreBadgeVariant(row.statut)"></app-badge>
            </ng-template>
            <ng-template appCell="versionModele" let-row="row"><span class="muted">{{ row.versionModele || '—' }}</span></ng-template>
          </app-data-table>

        </div>
      </div>
    </div>

    <!-- ── Détail du score (narration + SHAP via GET /api/scores/{id}) ── -->
    <app-modal [open]="detailOpen" size="lg" [hasFooter]="true"
               [title]="detailRow ? ('Score — ' + detailRow.clientNomComplet) : 'Détail du score'"
               (closed)="detailOpen = false">
      <div *ngIf="detailLoading" class="modal-state">Chargement…</div>

      <ng-container *ngIf="!detailLoading && detailRow">
        <div class="sc-grid">
          <div class="sc-item"><span>Score</span><strong [style.color]="getScoreColor(detailRow.valeurScore)">{{ detailRow.valeurScore | number:'1.0-0' }}/100</strong></div>
          <div class="sc-item"><span>Niveau de risque</span><app-badge [label]="formatNiveau(detailRow.niveauRisque)" [variant]="getRiskBadgeVariant(detailRow.niveauRisque)"></app-badge></div>
          <div class="sc-item"><span>Statut</span><app-badge [label]="formatStatut(detailRow.statut)" [variant]="getScoreBadgeVariant(detailRow.statut)"></app-badge></div>
          <div class="sc-item"><span>Modèle</span><strong>{{ detailRow.versionModele || '—' }}</strong></div>
          <div class="sc-item"><span>Calculé le</span><strong>{{ detailRow.createdAt | date:'dd/MM/yyyy HH:mm' }}</strong></div>
          <div class="sc-item"><span>Décidé le</span><strong>{{ detailRow.decidedAt ? (detailRow.decidedAt | date:'dd/MM/yyyy HH:mm') : '—' }}</strong></div>
        </div>

        <div class="sc-section" *ngIf="detail?.narration">
          <h4>Analyse explicative (IA)</h4>
          <p>{{ detail?.narration }}</p>
        </div>

        <div class="sc-section" *ngIf="(detail?.explications?.length || 0) > 0">
          <h4>Facteurs d'impact (SHAP)</h4>
          <div class="shap-list">
            <div class="shap-row" *ngFor="let f of sortedExplications()">
              <div class="shap-head">
                <span class="shap-name">{{ featureLabel(f.featureName) }}</span>
                <span class="shap-dir" [class.risk]="f.direction" [class.protect]="!f.direction">
                  {{ f.direction ? '▲ augmente le risque' : '▼ réduit le risque' }}
                </span>
              </div>
              <div class="shap-track"><div class="shap-fill" [class.risk]="f.direction" [class.protect]="!f.direction" [style.width.%]="shapWidth(f)"></div></div>
            </div>
          </div>
        </div>

        <div class="modal-state" *ngIf="!detail?.narration && (detail?.explications?.length || 0) === 0">
          Aucune analyse détaillée disponible pour ce score.
        </div>
      </ng-container>

      <div footer class="detail-footer">
        <!-- 4.1 : score en attente → aller directement le valider -->
        <button *ngIf="isSuperviseur && detailRow?.statut === 'EN_ATTENTE'"
                type="button" class="btn btn-primary" (click)="goToValidation()">
          ✓ Valider ce score
        </button>
        <!-- 4.3 : recalcul UNIQUEMENT si le score courant est déjà validé ou rejeté -->
        <button *ngIf="isSuperviseur && (detailRow?.statut === 'VALIDE' || detailRow?.statut === 'REJETE')"
                type="button" class="btn btn-secondary" (click)="recalculerFromDetail()"
                [disabled]="recalculating">
          <span class="refresh-glyph" [class.spin]="recalculating">⟳</span>
          {{ recalculating ? 'Recalcul…' : 'Recalculer le score' }}
        </button>
        <button type="button" class="btn btn-secondary" (click)="detailOpen = false">Fermer</button>
      </div>
    </app-modal>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1400px; margin: 0 auto; }
    .muted { color: var(--ink-500); font-size: 13px; }

    .modal-state { text-align: center; padding: var(--space-6); color: var(--ink-500); font-family: var(--font-body); font-size: 13px; }

    .detail-footer { display: flex; gap: var(--space-2); justify-content: flex-end; flex-wrap: wrap; }
    .refresh-glyph { display: inline-block; font-size: 14px; line-height: 1; }
    .refresh-glyph.spin { animation: sl-spin 1s linear infinite; }
    @keyframes sl-spin { to { transform: rotate(360deg); } }

    .sc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3) var(--space-6); margin-bottom: var(--space-5); }
    .sc-item { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 10px 0; border-bottom: 1px solid var(--border); font-family: var(--font-body); font-size: 13px; }
    .sc-item span { color: var(--ink-500); font-weight: 600; }
    .sc-item strong { color: var(--ink-900); }

    .sc-section { margin-top: var(--space-5); padding: var(--space-4) var(--space-5); background: var(--surface-2); border-radius: var(--radius-sm); }
    .sc-section h4 { margin: 0 0 10px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--info); font-family: var(--font-body); }
    .sc-section p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--ink-700); font-family: var(--font-body); }

    .shap-list { display: flex; flex-direction: column; gap: 12px; }
    .shap-row { font-family: var(--font-body); }
    .shap-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 5px; }
    .shap-name { font-weight: 600; color: var(--ink-900); }
    .shap-dir { font-size: 11px; font-weight: 600; }
    .shap-dir.risk { color: var(--danger); }
    .shap-dir.protect { color: var(--success); }
    .shap-track { height: 7px; background: var(--border); border-radius: 4px; overflow: hidden; }
    .shap-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
    .shap-fill.risk { background: var(--danger); }
    .shap-fill.protect { background: var(--success); }

    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } .sc-grid { grid-template-columns: 1fr; } }
  `]
})
export class ScoresListComponent implements OnInit {
  scores: ScoreListItem[] = [];
  user: User | null = null;
  isLoading = false;

  filterValues: FilterValues = {};
  rowActions: TableRowAction[] = [];

  detailOpen = false;
  detailLoading = false;
  detailRow: ScoreListItem | null = null;
  detail: Score | null = null;

  private readonly featureLabels: Record<string, string> = {
    'age': 'Âge',
    'MonthlyIncome': 'Revenu mensuel',
    'charges_mensuelles': 'Charges mensuelles',
    'DebtRatio': "Taux d'endettement",
    'RevolvingUtilizationOfUnsecuredLines': 'Utilisation crédit renouvelable',
    'NumberOfTimes90DaysLate': 'Retards ≥ 90 jours',
    'NumberOfTime30-59DaysPastDueNotWorse': 'Retards 30–59 jours',
    'NumberOfTime60-89DaysPastDueNotWorse': 'Retards 60–89 jours',
    'score_retards': 'Historique de retards',
    'historique_financier': 'Historique financier',
    'NumberOfOpenCreditLinesAndLoans': 'Crédits ouverts',
    'NumberRealEstateLoansOrLines': 'Prêts immobiliers',
    'nb_credits_total': 'Engagements de crédit',
    'NumberOfDependents': 'Personnes à charge',
  };

  readonly filterDefs: FilterDef[] = [
    { key: 'statut', label: 'statut', type: 'select', allLabel: 'Tous les statuts',
      options: [{ value: 'VALIDE', label: 'Validé' }, { value: 'EN_ATTENTE', label: 'En attente' }, { value: 'REJETE', label: 'Rejeté' }] },
    { key: 'niveauRisque', label: 'risque', type: 'select', allLabel: 'Tous les risques',
      options: [{ value: 'FAIBLE', label: 'Faible' }, { value: 'MOYEN', label: 'Moyen' }, { value: 'ELEVE', label: 'Élevé' }] },
    { key: 'createdAt', label: 'période', type: 'daterange' },
  ];

  readonly columns: TableColumn[] = [
    { key: 'clientNomComplet', header: 'Client', sortable: true, format: (r) => r.clientNomComplet },
    { key: 'valeurScore', header: 'Score', sortable: true, align: 'right', format: (r) => r.valeurScore ?? -1, noSearch: true },
    { key: 'niveauRisque', header: 'Risque', sortable: true, format: (r) => r.niveauRisque, noSearch: true },
    { key: 'statut', header: 'Statut', sortable: true, format: (r) => r.statut, noSearch: true },
    { key: 'versionModele', header: 'Modèle', noSearch: true },
    { key: 'createdAt', header: 'Calculé le', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy HH:mm', format: (r) => r.createdAt, noSearch: true },
    { key: 'decidedAt', header: 'Décidé le', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy HH:mm', format: (r) => r.decidedAt, noSearch: true },
  ];

  readonly exportConfig: TableExport = { filename: 'scores' };

  recalculating = false;

  constructor(
    private scoreService: ScoreService,
    private authService: AuthService,
    private clientService: ClientService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.rowActions = [
      { label: 'Détail', icon: 'visibility', variant: 'primary', handler: (r) => this.openDetail(r) },
    ];
    // Pré-remplissage des filtres depuis l'URL (navigation KPIs / graphiques du dashboard).
    this.route.queryParams.subscribe((p) => {
      this.filterValues = {
        statut: (p['statut'] || '').toUpperCase() || undefined,
        niveauRisque: (p['risque'] || p['niveauRisque'] || '').toUpperCase() || undefined,
      };
    });
    this.load();
  }

  get isSuperviseur(): boolean { return this.user?.role === 'SUPERVISEUR'; }

  get headerSubtitle(): string {
    return this.user?.role === 'CHARGE_CLIENTELE'
      ? 'Historique des scores de vos clients'
      : 'Historique complet des scores calculés';
  }

  load(notify = false): void {
    this.isLoading = true;
    this.scoreService.getScores({ size: 500 }).subscribe({
      next: (page) => {
        this.scores = page.content;
        this.isLoading = false;
        if (notify) this.toast.info('Liste des scores actualisée.');
      },
      error: (err) => {
        console.error('Erreur lors du chargement des scores', err);
        this.isLoading = false;
        this.toast.error('Erreur réseau — impossible de charger les scores.');
      },
    });
  }

  /** Recharge les données sans recharger la page — filtres, recherche et tri conservés. */
  refresh(): void { this.load(true); }

  /** 4.1 — Ouvre la file de validation directement sur ce score. */
  goToValidation(): void {
    const id = this.detailRow?.id;
    this.detailOpen = false;
    this.router.navigate(['/scores/validation'], id ? { queryParams: { scoreId: id } } : undefined);
  }

  /** 4.3 — Recalcule le score du client (autorisé uniquement si le score courant
   *  est VALIDE ou REJETE — jamais EN_ATTENTE). Réutilise l'endpoint existant. */
  recalculerFromDetail(): void {
    const row = this.detailRow;
    if (!row || this.recalculating) return;
    if (row.statut !== 'VALIDE' && row.statut !== 'REJETE') return;
    if (!confirm(`Recalculer le score de ${row.clientNomComplet} avec ses données actuelles ?\n` +
                 'Le nouveau score repassera EN ATTENTE de validation.')) return;
    this.recalculating = true;
    this.clientService.recalculerScore(String(row.clientId)).subscribe({
      next: () => {
        this.recalculating = false;
        this.detailOpen = false;
        this.toast.success('Score recalculé avec succès — en attente de validation.');
        this.load();   // rafraîchit la liste (nouveau score EN_ATTENTE visible)
      },
      error: () => {
        this.recalculating = false;
        this.toast.error('Échec du recalcul — vérifiez que le service IA est actif.');
      },
    });
  }

  get filteredRows(): ScoreListItem[] {
    return applyTableFilters(this.scores, this.filterDefs, this.filterValues);
  }

  onFilters(v: FilterValues): void { this.filterValues = { ...v }; }

  openDetail(row: ScoreListItem): void {
    this.detailRow = row;
    this.detail = null;
    this.detailOpen = true;
    this.detailLoading = true;
    this.scoreService.getScore(row.id).subscribe({
      next: (s) => { this.detail = s; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }

  sortedExplications() {
    const list = this.detail?.explications ?? [];
    return [...list].sort((a, b) => a.ordreImportance - b.ordreImportance);
  }
  featureLabel(name: string): string { return this.featureLabels[name] ?? name; }
  shapWidth(f: { shapValue: number }): number {
    const list = this.detail?.explications ?? [];
    const max = Math.max(...list.map(e => Math.abs(e.shapValue)), 0.0001);
    return Math.max(8, Math.round((Math.abs(f.shapValue) / max) * 100));
  }

  formatStatut(statut: string): string {
    switch (statut) { case 'VALIDE': return 'Validé'; case 'EN_ATTENTE': return 'En attente'; case 'REJETE': return 'Rejeté'; default: return statut; }
  }
  formatNiveau(niveau: string): string {
    switch (niveau) { case 'FAIBLE': return 'Faible'; case 'MOYEN': return 'Moyen'; case 'ELEVE': return 'Élevé'; default: return niveau; }
  }
  getScoreColor(score: number): string {
    if (score <= 30) return '#2D9C6A';
    if (score <= 60) return '#E8621A';
    return '#D94040';
  }
  getScoreBadgeVariant(statut: string): 'success' | 'warning' | 'info' | 'danger' {
    switch (statut) { case 'VALIDE': return 'success'; case 'EN_ATTENTE': return 'info'; case 'REJETE': return 'danger'; default: return 'info'; }
  }
  getRiskBadgeVariant(niveau: string): 'success' | 'warning' | 'info' | 'danger' {
    switch (niveau) { case 'FAIBLE': return 'success'; case 'MOYEN': return 'warning'; case 'ELEVE': return 'danger'; default: return 'info'; }
  }
}
