import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { BackButtonComponent } from '../../shared/components/ui/back-button.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { HistoryModalComponent, HistoryColumn } from '../../shared/components/ui/history-modal.component';
import { ClientService } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ScoreService } from '../../core/services/score.service';
import { SimulationService } from '../../core/services/simulation.service';
import { Client } from '../../core/models/client.model';
import { Score } from '../../core/models/score.model';
import { Simulation } from '../../core/models/simulation.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, BadgeComponent, BackButtonComponent, IconComponent, HistoryModalComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">        <div class="content" *ngIf="client; else loading">

          <div class="page-header">
            <div class="back-wrap"><app-back-button [fallback]="'/clients'"></app-back-button></div>
            <div class="header-row">
              <h2>{{ client.prenom }} {{ client.nom }}</h2>
              <div class="header-actions">
                <button
                  *ngIf="user?.role === 'CHARGE_CLIENTELE'"
                  (click)="goToEdit()"
                  class="btn btn-primary">
                  <app-icon name="edit" [size]="18"></app-icon> Modifier
                </button>
                <!-- Score en attente → raccourci direct vers la validation (4.1/4.2) -->
                <button
                  *ngIf="user?.role === 'SUPERVISEUR' && client.dernierScore?.statut === 'EN_ATTENTE'"
                  (click)="goToValidation()"
                  class="btn btn-primary">
                  <app-icon name="fact_check" [size]="18"></app-icon> Valider le score
                </button>
                <!-- Historiques du client (modales à la demande) -->
                <button *ngIf="!isCharge" (click)="openScoreHistory()" class="btn btn-secondary">
                  <app-icon name="monitoring" [size]="18"></app-icon> Historique des scores
                </button>
                <button *ngIf="user?.role === 'SUPERVISEUR'" (click)="openSimHistory()" class="btn btn-secondary">
                  <app-icon name="history" [size]="18"></app-icon> Historique des simulations
                </button>
                <!-- Nouvelle simulation pré-remplie avec ce client (4.2) -->
                <button
                  *ngIf="user?.role === 'SUPERVISEUR'"
                  (click)="goToSimulation()"
                  class="btn btn-secondary">
                  <app-icon name="science" [size]="18"></app-icon> Nouvelle simulation
                </button>
                <!-- Recalcul : UNIQUEMENT quand le score courant est déjà validé ou rejeté (4.3).
                     Un score EN_ATTENTE doit d'abord être traité par la validation. -->
                <button
                  *ngIf="user?.role === 'SUPERVISEUR' && canRecalculer()"
                  (click)="recalculerScore()"
                  [disabled]="recalculating"
                  class="btn btn-secondary">
                  <app-icon name="refresh" [size]="18" [class.spin]="recalculating"></app-icon>
                  {{ recalculating ? 'Recalcul…' : 'Recalculer le score' }}
                </button>
              </div>
            </div>
            <div *ngIf="recalcMessage" class="recalc-message">{{ recalcMessage }}</div>
          </div>

          <div class="detail-grid">

            <!-- Ligne 1 : informations personnelles + données financières -->
            <div class="top-row">

            <!-- ── Informations personnelles ── -->
            <div class="card">
              <h3>Informations personnelles</h3>
              <div class="row"><span class="label">CIN</span><span class="value">{{ client.cin }}</span></div>
              <div class="row"><span class="label">Date de naissance</span><span class="value">{{ client.dateNaissance | date:'dd/MM/yyyy' }}</span></div>
              <div class="row"><span class="label">Âge</span><span class="value">{{ client.age }} ans</span></div>
              <div class="row"><span class="label">Situation professionnelle</span><span class="value">{{ formatSituationPro(client.situationPro) }}</span></div>
              <div class="row"><span class="label">Personnes à charge</span><span class="value">{{ client.nbPersonnesACharge ?? 0 }}</span></div>
            </div>

            <!-- ── Données financières ── -->
            <div class="card">
              <h3>Données financières</h3>
              <div class="row"><span class="label">Revenus mensuels</span><span class="value">{{ client.revenusMensuels | number:'1.0-0' }} DH</span></div>
              <div class="row"><span class="label">Charges mensuelles</span><span class="value">{{ client.chargesMensuelles | number:'1.0-0' }} DH</span></div>
              <div class="row">
                <span class="label">Taux d'endettement</span>
                <span class="value" [class.value-warning]="(client.tauxEndettement || 0) > 50"
                                    [class.value-danger]="(client.tauxEndettement || 0) > 80">
                  {{ (client.tauxEndettement || 0) | number:'1.1-1' }}%
                </span>
              </div>
              <div class="row"><span class="label">Historique financier</span>
                <span class="value badge-historique" [class]="'hf-' + (client.historiqueFinancier || '').toLowerCase()">
                  {{ client.historiqueFinancier }}
                </span>
              </div>
            </div>

            </div><!-- /.top-row -->

            <!-- ── Données de crédit (pleine largeur, 2 colonnes internes) ── -->
            <div class="card credit-card">
              <h3>Données de crédit <span class="card-badge">Bureau / Déclaration</span></h3>
              <div class="credit-cols">

                <!-- Colonne gauche : retards de paiement -->
                <div class="credit-col">
                  <div class="sub-label">Retards de paiement</div>
                  <div class="row"><span class="label">Retards 30–59 jours</span><span class="value">{{ client.nbRetards3059Jours ?? 0 }} fois</span></div>
                  <div class="row"><span class="label">Retards 60–89 jours</span><span class="value">{{ client.nbRetards6089Jours ?? 0 }} fois</span></div>
                  <div class="row">
                    <span class="label">Retards ≥ 90 jours</span>
                    <span class="value" [class.value-danger]="(client.nbRetards90JoursPlus ?? 0) > 0">
                      {{ client.nbRetards90JoursPlus ?? 0 }} fois
                    </span>
                  </div>
                </div>

                <!-- Colonne droite : engagements -->
                <div class="credit-col">
                  <div class="sub-label">Engagements</div>
                  <div class="row"><span class="label">Crédits ouverts</span><span class="value">{{ client.nbCreditsOuverts ?? 0 }}</span></div>
                  <div class="row"><span class="label">Prêts immobiliers</span><span class="value">{{ client.nbPretsImmobiliers ?? 0 }}</span></div>
                  <!-- Crédit renouvelable : montants source (toujours affichés, — si absent) + % calculé -->
                  <div class="row"><span class="label">Plafond crédit renouv.</span><span class="value">{{ client.plafondCredit != null ? (client.plafondCredit | number:'1.0-0') + ' DH' : '—' }}</span></div>
                  <div class="row"><span class="label">Solde utilisé</span><span class="value">{{ client.soldeCredit != null ? (client.soldeCredit | number:'1.0-0') + ' DH' : '—' }}</span></div>
                  <div class="row">
                    <span class="label">Utilisation crédit renouvelable</span>
                    <span class="value" [class.value-warning]="(client.utilisationCreditRenouvelable ?? 0) > 50"
                                        [class.value-danger]="(client.utilisationCreditRenouvelable ?? 0) > 80">
                      {{ (client.utilisationCreditRenouvelable ?? 0) | number:'1.0-1' }}%
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <!-- Score et son analyse (pleine largeur, en dessous) -->
            <div class="score-col">

            <!-- ── Score simplifié (chargé de clientèle) : uniquement la note finale validée ── -->
            <div class="card score-card simple-score"
                 *ngIf="isCharge && client.dernierScore?.statut === 'VALIDE'">
              <h3>Score</h3>
              <div class="simple-score-value">
                {{ client.dernierScore?.valeurScore | number:'1.0-0' }}<span class="score-unit">/100</span>
              </div>
            </div>

            <!-- ── Score de risque complet (analyste / superviseur) ── -->
            <div class="card score-card" *ngIf="scoreVisible() && !isCharge">
              <h3>Score de risque</h3>
              <div class="score-display">
                <div class="score-value" [style.color]="getScoreColor(client.dernierScore?.valeurScore || 0)">
                  {{ client.dernierScore?.valeurScore | number:'1.0-0' }}<span class="score-unit">/100</span>
                </div>
                <div class="score-gauge">
                  <div class="gauge-track">
                    <div class="gauge-fill"
                         [style.width.%]="client.dernierScore?.valeurScore || 0"
                         [style.background]="getScoreColor(client.dernierScore?.valeurScore || 0)">
                    </div>
                  </div>
                </div>
              </div>
              <div class="row"><span class="label">Niveau de risque</span>
                <span class="value" [style.color]="getScoreColor(client.dernierScore?.valeurScore || 0)">
                  <strong>{{ formatNiveau(client.dernierScore?.niveauRisque || '') }}</strong>
                </span>
              </div>
              <div class="row"><span class="label">Statut</span>
                <app-badge
                  [label]="formatStatut(client.dernierScore?.statut || '')"
                  [variant]="getBadgeVariant(client.dernierScore?.statut || '')">
                </app-badge>
              </div>
              <div class="row">
                <span class="label">Date de calcul</span>
                <span class="value">{{ client.dernierScore?.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>

              <!-- Facteurs d'impact SHAP -->
              <div *ngIf="(client.dernierScore?.explications?.length || 0) > 0" class="shap-section">
                <div class="narration-title">Facteurs d'impact (SHAP)</div>
                <div class="shap-list">
                  <div class="shap-row" *ngFor="let f of sortedExplications()">
                    <div class="shap-head">
                      <span class="shap-name">{{ featureLabel(f.featureName) }}</span>
                      <span class="shap-dir" [class.risk]="f.direction" [class.protect]="!f.direction">
                        {{ f.direction ? '▲ augmente le risque' : '▼ réduit le risque' }}
                      </span>
                    </div>
                    <div class="shap-bar-track">
                      <div class="shap-bar" [class.risk]="f.direction" [class.protect]="!f.direction"
                           [style.width.%]="shapWidth(f)"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Narration : visible seulement si score VALIDÉ -->
              <div *ngIf="client.dernierScore?.statut === 'VALIDE' && client.dernierScore?.narration"
                   class="narration">
                <div class="narration-title">Analyse explicative</div>
                <p>{{ client.dernierScore?.narration }}</p>
              </div>
            </div>

            <!-- ── Score en attente (chargé de clientèle) ── -->
            <div class="card score-card pending-card"
                 *ngIf="!scoreVisible() && client.dernierScore && user?.role === 'CHARGE_CLIENTELE'">
              <h3>Score de risque</h3>
              <p class="pending-text">
                Le score de ce client est en attente de validation par le superviseur.
                Il sera visible ici dès validation.
              </p>
            </div>

            </div><!-- /.score-col -->

          </div>

        </div>

        <!-- ── Modales d'historique (ouvertes à la demande) ── -->
        <app-history-modal [open]="scoreHistoryOpen" title="Historique des scores"
          [columns]="scoreHistoryCols" [rows]="scoreHistory || []" [pageSize]="8"
          searchPlaceholder="Rechercher par niveau, statut…"
          emptyMessage="Aucun score enregistré pour ce client."
          (rowClick)="openScore($event)" (closed)="scoreHistoryOpen = false"></app-history-modal>

        <app-history-modal [open]="simHistoryOpen" title="Historique des simulations"
          [columns]="simHistoryCols" [rows]="simHistory || []" [pageSize]="8"
          searchPlaceholder="Rechercher par niveau…"
          emptyMessage="Aucune simulation pour ce client."
          (rowClick)="openSimulation($event)" (closed)="simHistoryOpen = false"></app-history-modal>

        <ng-template #loading>
          <div class="loading">Chargement...</div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: #F5F5F7; }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: 30px; max-width: 1200px; margin: 0 auto; }
    .loading { padding: 60px; text-align: center; color: #888; font-family: 'DM Sans', sans-serif; }

    .page-header { margin-bottom: 24px; }
    .back-wrap { margin-bottom: 12px; }

    .header-row {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;
    }

    h2 {
      font-size: 26px; font-weight: 700; color: #1A1A2E;
      margin: 0; font-family: 'Sora', sans-serif;
    }

    /* ── Layout empilé : (personnel | financier) → crédit pleine largeur → score ── */
    .detail-grid { display: flex; flex-direction: column; gap: 20px; }
    .top-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    .score-col { display: flex; flex-direction: column; gap: 20px; }

    /* Carte crédit : 2 colonnes internes (retards | engagements) */
    .credit-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; }
    .credit-col .sub-label { margin-top: 4px; }

    /* ── Cards ── */
    .card {
      background: white;
      padding: 22px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    .card h3 {
      font-size: 14px; font-weight: 700; color: #1A1A2E;
      margin: 0 0 16px 0; padding-bottom: 10px;
      border-bottom: 2px solid #F5F5F7;
      font-family: 'Sora', sans-serif;
      display: flex; align-items: center; gap: 8px;
    }

    .card-badge {
      font-size: 10px; font-weight: 600;
      background: #E3F0FF; color: #1A6FD4;
      padding: 2px 7px; border-radius: 20px;
      font-family: 'DM Sans', sans-serif;
    }

    .sub-label {
      font-size: 11px; font-weight: 700; color: #888;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin: 12px 0 6px 0; font-family: 'DM Sans', sans-serif;
    }

    .row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 0; border-bottom: 1px solid #F5F5F7;
      font-size: 13px; font-family: 'DM Sans', sans-serif;
    }
    .row:last-child { border-bottom: none; }

    .label { font-weight: 600; color: #666; }
    .value { color: #1A1A2E; font-weight: 500; }
    .value-warning { color: #E8621A !important; }
    .value-danger  { color: #D94040 !important; }

    .badge-historique {
      padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .hf-bon     { background: #E3F5EE; color: #2D9C6A; }
    .hf-moyen   { background: #FFF3E3; color: #E8621A; }
    .hf-mauvais { background: #FCE3E3; color: #D94040; }

    /* ── Score simplifié (chargé de clientèle) ── */
    .simple-score-value {
      font-size: 52px; font-weight: 700; line-height: 1;
      font-family: 'Sora', sans-serif; color: #1A1A2E; padding: 6px 0 4px;
    }

    /* ── Score display ── */
    .score-display { margin-bottom: 16px; }

    .score-value {
      font-size: 48px; font-weight: 700; line-height: 1;
      font-family: 'Sora', sans-serif; margin-bottom: 10px;
    }

    .score-unit { font-size: 20px; color: #888; margin-left: 4px; }

    .gauge-track {
      height: 8px; background: #F5F5F7; border-radius: 4px; overflow: hidden;
    }
    .gauge-fill {
      height: 100%; border-radius: 4px;
      transition: width 0.6s ease;
    }

    /* ── Narration ── */
    .narration {
      margin-top: 16px; padding: 16px;
      background: #F8F9FA; border-radius: 8px;
      border-left: 3px solid #1A6FD4;
    }

    .narration-title {
      font-size: 12px; font-weight: 700; color: #1A6FD4;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 8px; font-family: 'DM Sans', sans-serif;
    }

    .narration p {
      margin: 0; font-size: 13px; color: #444;
      line-height: 1.6; font-family: 'DM Sans', sans-serif;
    }

    /* ── En attente ── */
    .pending-card { border: 1px dashed #E5E5EA; background: #FAFAFA; }

    .pending-text {
      font-size: 13px; color: #888; font-family: 'DM Sans', sans-serif;
      line-height: 1.6; margin: 0;
      padding: 20px 0; text-align: center;
    }

    /* ── Buttons (styles globaux .btn / .btn-primary / .btn-secondary) ── */
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .header-actions .spin { animation: cd-spin 1s linear infinite; }
    @keyframes cd-spin { to { transform: rotate(360deg); } }


    .recalc-message {
      margin-top: 10px; padding: 10px 14px; background: #E3F5EE; color: #2D9C6A;
      border-radius: 6px; font-size: 13px; font-family: 'DM Sans', sans-serif;
    }

    /* ── SHAP factors ── */
    .shap-section { margin-top: 16px; }
    .shap-list { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
    .shap-row { font-family: 'DM Sans', sans-serif; }
    .shap-head {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 12px; margin-bottom: 5px;
    }
    .shap-name { font-weight: 600; color: #1A1A2E; }
    .shap-dir { font-size: 11px; font-weight: 600; }
    .shap-dir.risk { color: #D94040; }
    .shap-dir.protect { color: #2D9C6A; }
    .shap-bar-track { height: 7px; background: #F0F0F0; border-radius: 4px; overflow: hidden; }
    .shap-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .shap-bar.risk { background: #D94040; }
    .shap-bar.protect { background: #2D9C6A; }

    @media (max-width: 900px) {
      .top-row { grid-template-columns: 1fr; }
      .credit-cols { grid-template-columns: 1fr; gap: 0 32px; }
    }
  `]
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  user: User | null = null;
  recalculating = false;
  recalcMessage = '';

  // Historiques du client — modales chargées à la demande (#3/#5)
  scoreHistoryOpen = false;
  simHistoryOpen = false;
  scoreHistory: Score[] | null = null;
  simHistory: Simulation[] | null = null;

  readonly scoreHistoryCols: HistoryColumn[] = [
    { key: 'createdAt', header: 'Date', cell: 'date', sortable: true },
    { key: 'valeurScore', header: 'Score', cell: 'score', sortable: true },
    { key: 'niveauRisque', header: 'Niveau', cell: 'niveau', sortable: true, searchable: true },
    { key: 'statut', header: 'Statut', cell: 'statut', sortable: true, searchable: true },
  ];
  readonly simHistoryCols: HistoryColumn[] = [
    { key: 'createdAt', header: 'Date', cell: 'date', sortable: true, value: (r) => r.createdAt || r.dateCreation },
    { key: 'revenusSimules', header: 'Revenus / Charges', cell: 'moneyPair', key2: 'chargesSimulees' },
    { key: 'scoreSimule', header: 'Score simulé', cell: 'score', sortable: true },
    { key: 'niveauRisqueSimule', header: 'Niveau', cell: 'niveau', sortable: true, searchable: true },
  ];

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

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private confirm: ConfirmService,
    private scoreService: ScoreService,
    private simulationService: SimulationService
  ) {}

  get isSuperviseur(): boolean { return this.user?.role === 'SUPERVISEUR'; }

  openScoreHistory(): void {
    this.scoreHistoryOpen = true;
    if (this.scoreHistory === null && this.client?.id) {
      this.scoreService.getScoresParClient(String(this.client.id)).subscribe({
        next: (list) => { this.scoreHistory = list; },
        error: () => { this.scoreHistory = []; this.toast.error('Historique des scores indisponible.'); },
      });
    }
  }

  openSimHistory(): void {
    this.simHistoryOpen = true;
    if (this.simHistory === null && this.client?.id) {
      this.simulationService.getSimulationsByClient(String(this.client.id)).subscribe({
        next: (list) => { this.simHistory = list; },
        error: () => { this.simHistory = []; this.toast.error('Historique des simulations indisponible.'); },
      });
    }
  }

  /** Ouvre un score de l'historique : file de validation (superviseur) ou liste des scores. */
  openScore(s: Score): void {
    this.scoreHistoryOpen = false;
    if (this.isSuperviseur && s.id) {
      this.router.navigate(['/scores/validation'], { queryParams: { scoreId: s.id } });
    } else {
      this.router.navigate(['/scores'], { queryParams: { open: s.id } });
    }
  }

  /** Ouvre une simulation de l'historique dans la page d'historique des simulations. */
  openSimulation(s: Simulation): void {
    this.simHistoryOpen = false;
    this.router.navigate(['/simulations/historique'], { queryParams: { open: s.id } });
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.loadClient(id);
    });
  }

  get isCharge(): boolean { return this.user?.role === 'CHARGE_CLIENTELE'; }

  loadClient(id: string): void {
    this.clientService.getClientById(id).subscribe({
      next: (client) => { this.client = client; },
      error: () => { console.error('Erreur chargement client'); },
    });
  }

  goToEdit(): void {
    this.router.navigate(['/clients', this.client?.id, 'modifier']);
  }

  /** Raccourci : ouvre la file de validation directement sur le score en attente de ce client. */
  goToValidation(): void {
    const scoreId = this.client?.dernierScore?.id;
    this.router.navigate(['/scores/validation'], scoreId ? { queryParams: { scoreId } } : undefined);
  }

  /** Raccourci : ouvre la page Simulation avec ce client déjà sélectionné. */
  goToSimulation(): void {
    this.router.navigate(['/simulations'], { queryParams: { clientId: this.client?.id } });
  }

  /** Règle métier : le recalcul n'est proposé que si le score courant a déjà été
   *  validé ou rejeté — jamais pour un score EN_ATTENTE (à traiter d'abord). */
  canRecalculer(): boolean {
    const statut = this.client?.dernierScore?.statut;
    return statut === 'VALIDE' || statut === 'REJETE';
  }

  async recalculerScore(): Promise<void> {
    if (!this.client?.id || this.recalculating || !this.canRecalculer()) return;
    const ok = await this.confirm.ask({
      title: 'Recalculer le score ?',
      message: 'Un nouveau score sera calculé à partir des données actuelles du client.',
      bullets: [
        'Le nouveau score remplacera le score courant.',
        'Il repassera au statut EN ATTENTE.',
        'Une nouvelle validation par un superviseur sera requise.',
      ],
      confirmLabel: 'Recalculer',
      variant: 'primary',
    });
    if (!ok) return;
    this.recalculating = true;
    this.recalcMessage = '';
    const id = String(this.client.id);
    this.clientService.recalculerScore(id).subscribe({
      next: () => {
        this.recalculating = false;
        this.recalcMessage = 'Score recalculé avec succès.';
        this.toast.success('Score recalculé avec succès — en attente de validation.');
        this.loadClient(id);   // recharge score, niveau, narration, explications SHAP
      },
      error: () => {
        this.recalculating = false;
        this.recalcMessage = 'Échec du recalcul — vérifiez que le service IA est actif.';
        this.toast.error('Échec du recalcul — vérifiez que le service IA est actif.');
      },
    });
  }

  sortedExplications() {
    const list = this.client?.dernierScore?.explications ?? [];
    return [...list].sort((a, b) => a.ordreImportance - b.ordreImportance);
  }

  featureLabel(name: string): string {
    return this.featureLabels[name] ?? name;
  }

  shapWidth(f: { shapValue: number }): number {
    const list = this.client?.dernierScore?.explications ?? [];
    const max = Math.max(...list.map(e => Math.abs(e.shapValue)), 0.0001);
    return Math.max(8, Math.round((Math.abs(f.shapValue) / max) * 100));
  }

  /**
   * Le score est visible par le chargé de clientèle et l'analyste
   * UNIQUEMENT si le statut est VALIDE.
   * Le superviseur voit TOUS les scores (EN_ATTENTE, VALIDE, REJETE).
   */
  scoreVisible(): boolean {
    if (!this.client?.dernierScore) return false;
    const role = this.user?.role;
    if (role === 'SUPERVISEUR' || role === 'ADMINISTRATEUR') return true;
    return this.client.dernierScore.statut === 'VALIDE';
  }

  getScoreColor(score: number): string {
    if (score <= 30) return '#2D9C6A';
    if (score <= 60) return '#E8621A';
    return '#D94040';
  }

  getBadgeVariant(statut: string): 'success' | 'warning' | 'info' | 'danger' {
    switch (statut) {
      case 'VALIDE':     return 'success';
      case 'EN_ATTENTE': return 'info';
      case 'REJETE':     return 'danger';
      default:           return 'info';
    }
  }

  formatStatut(statut: string): string {
    switch (statut) {
      case 'VALIDE':     return 'Validé';
      case 'EN_ATTENTE': return 'En attente';
      case 'REJETE':     return 'Rejeté';
      default:           return statut;
    }
  }

  formatNiveau(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return 'Risque faible';
      case 'MOYEN':  return 'Risque modéré';
      case 'ELEVE':  return 'Risque élevé';
      default:       return niveau;
    }
  }

  formatSituationPro(s: string): string {
    switch (s) {
      case 'CDI':         return 'Salarié (CDI)';
      case 'CDD':         return 'Salarié (CDD)';
      case 'INDEPENDANT': return 'Indépendant';
      case 'SANS_EMPLOI': return 'Sans emploi';
      default:            return s;
    }
  }
}
