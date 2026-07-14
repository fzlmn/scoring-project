import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IconButtonComponent } from '../../shared/components/ui/icon-button.component';
import { BackButtonComponent } from '../../shared/components/ui/back-button.component';
import { ToastService } from '../../core/services/toast.service';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { ScoreGaugeComponent } from '../../shared/components/score-gauge.component';
import { ScoreService } from '../../core/services/score.service';
import { ClientService } from '../../core/services/client.service';
import { SimulationService } from '../../core/services/simulation.service';
import { Score } from '../../core/models/score.model';
import { Client } from '../../core/models/client.model';

@Component({
  selector: 'app-scores-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, BadgeComponent, ScoreGaugeComponent, IconButtonComponent, BackButtonComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">        <div class="content">

          <div class="back-wrap"><app-back-button [fallback]="'/scores'"></app-back-button></div>

          <div class="page-header">
            <h2>Validation des Scores</h2>
            <span class="count-badge" *ngIf="scoresEnAttente.length > 0">
              {{ scoresEnAttente.length }} en attente
            </span>
            <app-icon-button class="header-refresh" icon="refresh" tooltip="Rafraîchir la file d'attente"
                             [loading]="isRefreshing" (clicked)="refresh()"></app-icon-button>
          </div>

          <div class="validation-container">

            <!-- ── Panneau gauche : détail du score sélectionné ── -->
            <div class="score-detail">
              <div *ngIf="selectedScore; else emptySelection" class="score-card">

                <h3>Détail du Score</h3>

                <!-- Nom du client -->
                <div class="client-banner">
                  <span class="client-label">Client</span>
                  <strong class="client-name">{{ getClientName(selectedScore.clientId) }}</strong>
                  <a [routerLink]="'/clients/' + selectedScore.clientId" class="client-link">
                    Voir la fiche →
                  </a>
                </div>

                <!-- Jauge : interprétation métier sous la jauge (le niveau de risque
                     détaillé reste dans le tableau ci-dessous — pas de doublon). -->
                <div class="gauge-section">
                  <app-score-gauge [score]="selectedScore.valeurScore" [niveauRisque]="selectedScore.niveauRisque"
                                   [label]="potentielLabel(selectedScore.niveauRisque)"></app-score-gauge>
                </div>

                <!-- Infos score -->
                <div class="score-info">
                  <div class="info-row">
                    <span class="label">Score</span>
                    <strong [style.color]="getRiskColor(selectedScore.niveauRisque)">
                      {{ selectedScore.valeurScore | number:'1.0-0' }}/100
                    </strong>
                  </div>
                  <div class="info-row">
                    <span class="label">Niveau de risque</span>
                    <span [style.color]="getRiskColor(selectedScore.niveauRisque)" style="font-weight:700">
                      {{ formatNiveau(selectedScore.niveauRisque) }}
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="label">Statut</span>
                    <app-badge
                      [label]="formatStatut(selectedScore.statut)"
                      [variant]="getScoreBadgeVariant(selectedScore.statut)">
                    </app-badge>
                  </div>
                  <div class="info-row">
                    <span class="label">Date de calcul</span>
                    <span>{{ selectedScore.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                </div>

                <!-- Données client utilisées par le modèle (#7 : valider sans quitter la page) -->
                <div class="client-features">
                  <h4>Données client utilisées par le modèle</h4>
                  <div *ngIf="loadingClient" class="cf-loading">Chargement des données client…</div>
                  <div *ngIf="!loadingClient && selectedClient as c" class="cf-grid">
                    <div class="cf-item"><span>Âge</span><strong>{{ c.age }} ans</strong></div>
                    <div class="cf-item"><span>Situation pro.</span><strong>{{ formatSituationPro(c.situationPro) }}</strong></div>
                    <div class="cf-item"><span>Revenus mensuels</span><strong>{{ c.revenusMensuels | number:'1.0-0' }} DH</strong></div>
                    <div class="cf-item"><span>Charges mensuelles</span><strong>{{ c.chargesMensuelles | number:'1.0-0' }} DH</strong></div>
                    <div class="cf-item"><span>Taux d'endettement</span>
                      <strong [class.warn]="(c.tauxEndettement || 0) >= 50">{{ (c.tauxEndettement || 0) | number:'1.0-1' }}%</strong></div>
                    <!-- Crédit renouvelable : montants source (toujours affichés, — si absent) + % calculé -->
                    <div class="cf-item"><span>Plafond crédit renouv.</span><strong>{{ c.plafondCredit != null ? (c.plafondCredit | number:'1.0-0') + ' DH' : '—' }}</strong></div>
                    <div class="cf-item"><span>Solde utilisé</span><strong>{{ c.soldeCredit != null ? (c.soldeCredit | number:'1.0-0') + ' DH' : '—' }}</strong></div>
                    <div class="cf-item"><span>Utilisation crédit renouv.</span>
                      <strong [class.warn]="(c.utilisationCreditRenouvelable || 0) >= 70">{{ (c.utilisationCreditRenouvelable || 0) | number:'1.0-1' }}%</strong></div>
                    <div class="cf-item"><span>Historique financier</span><strong>{{ c.historiqueFinancier }}</strong></div>
                    <div class="cf-item"><span>Personnes à charge</span><strong>{{ c.nbPersonnesACharge ?? 0 }}</strong></div>
                    <div class="cf-item"><span>Retards 30–59 j</span><strong>{{ c.nbRetards3059Jours ?? 0 }}</strong></div>
                    <div class="cf-item"><span>Retards 60–89 j</span><strong>{{ c.nbRetards6089Jours ?? 0 }}</strong></div>
                    <div class="cf-item"><span>Retards ≥ 90 j</span>
                      <strong [class.warn]="(c.nbRetards90JoursPlus ?? 0) > 0">{{ c.nbRetards90JoursPlus ?? 0 }}</strong></div>
                    <div class="cf-item"><span>Crédits ouverts</span><strong>{{ c.nbCreditsOuverts ?? 0 }}</strong></div>
                    <div class="cf-item"><span>Prêts immobiliers</span><strong>{{ c.nbPretsImmobiliers ?? 0 }}</strong></div>
                  </div>
                </div>

                <!-- Narration IA -->
                <div class="narrative" *ngIf="selectedScore.narration">
                  <h4>Analyse explicative (IA)</h4>
                  <p>{{ selectedScore.narration }}</p>
                </div>
                <div class="narrative empty-narrative" *ngIf="!selectedScore.narration">
                  <h4>Analyse explicative (IA)</h4>
                  <p>Narration non disponible pour ce score.</p>
                </div>

                <!-- Facteurs d'impact (SHAP) -->
                <div class="shap-section" *ngIf="(selectedScore.explications?.length || 0) > 0">
                  <h4>Facteurs d'impact (SHAP)</h4>
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

                <!-- Boutons de validation -->
                <div class="actions-section" *ngIf="selectedScore.statut === 'EN_ATTENTE'">
                  <button (click)="validerScore('VALIDE')" class="btn-success" [disabled]="isActing">
                    ✓ Valider
                  </button>
                  <button (click)="validerScore('REJETE')" class="btn-danger" [disabled]="isActing">
                    ✗ Rejeter
                  </button>
                </div>

                <div *ngIf="selectedScore.statut !== 'EN_ATTENTE'" class="already-processed">
                  Ce score a déjà été {{ selectedScore.statut === 'VALIDE' ? 'validé' : 'rejeté' }}.
                </div>

                <div *ngIf="actionMessage" class="action-message">{{ actionMessage }}</div>
              </div>

              <ng-template #emptySelection>
                <div class="empty-selection">
                  <p>Sélectionnez un score dans la file d'attente pour voir les détails.</p>
                </div>
              </ng-template>
            </div>

            <!-- ── Panneau droit : file d'attente ── -->
            <div class="scores-queue">
              <h3>File d'attente <span class="queue-count">({{ scoresEnAttente.length }})</span></h3>

              <div class="queue-list" *ngIf="scoresEnAttente.length > 0">
                <div
                  *ngFor="let score of scoresEnAttente"
                  [class.active]="selectedScore?.id === score.id"
                  (click)="selectScore(score)"
                  class="queue-item"
                >
                  <div class="queue-header">
                    <span class="queue-client">{{ getClientName(score.clientId) }}</span>
                    <span class="queue-date">{{ score.createdAt | date:'dd/MM HH:mm' }}</span>
                  </div>
                  <div class="queue-footer">
                    <strong [style.color]="getRiskColor(score.niveauRisque)">
                      {{ score.valeurScore | number:'1.0-0' }}/100
                    </strong>
                    <span class="risk-chip" [style.background]="getRiskColor(score.niveauRisque)">
                      {{ formatNiveau(score.niveauRisque) }}
                    </span>
                  </div>
                </div>
              </div>

              <div *ngIf="scoresEnAttente.length === 0" class="empty-queue">
                <p>Aucun score en attente de validation.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: #F5F5F7; }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: 30px; max-width: 1400px; margin: 0 auto; }
    .back-wrap { margin-bottom: 14px; }

    .page-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    }
    .header-refresh { margin-left: auto; }

    h2 {
      font-size: 24px; font-weight: 700; color: #1A1A2E;
      margin: 0; font-family: 'Sora', sans-serif;
    }

    .count-badge {
      background: #E8621A; color: white;
      font-size: 12px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
      font-family: 'DM Sans', sans-serif;
    }

    .refresh-btn {
      margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 12px; border: 1px solid #E5E5EA; border-radius: 6px;
      background: white; color: #1A1A2E; font-size: 12px; font-weight: 600;
      font-family: 'DM Sans', sans-serif; cursor: pointer;
    }
    .refresh-btn:hover:not(:disabled) { background: #F5F5F7; }
    .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .refresh-btn .spin { animation: sv-spin 1s linear infinite; }
    @keyframes sv-spin { to { transform: rotate(360deg); } }

    /* ── Layout ── */
    .validation-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      align-items: start;
    }

    /* ── Score detail card ── */
    .score-detail, .scores-queue {
      background: white;
      padding: 22px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    /* #11 : la file d'attente reste à hauteur d'écran et défile indépendamment,
       sans jamais allonger la page même avec beaucoup de scores en attente. */
    .scores-queue {
      position: sticky; top: 20px;
      max-height: calc(100vh - 40px);
      display: flex; flex-direction: column;
    }
    .scores-queue h3 { flex-shrink: 0; }

    h3 {
      margin: 0 0 18px 0; font-size: 15px; font-weight: 700;
      color: #1A1A2E; font-family: 'Sora', sans-serif;
      padding-bottom: 12px; border-bottom: 2px solid #F5F5F7;
    }

    .queue-count { font-size: 12px; color: #888; font-family: 'DM Sans', sans-serif; }

    /* ── Client banner ── */
    .client-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; background: #F5F5F7; border-radius: 8px;
      margin-bottom: 16px; font-family: 'DM Sans', sans-serif;
    }

    .client-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; }
    .client-name { font-size: 15px; font-weight: 700; color: #1A1A2E; flex: 1; }
    .client-link { font-size: 12px; color: #1A6FD4; text-decoration: none; font-weight: 600; }
    .client-link:hover { text-decoration: underline; }

    /* ── Gauge ── */
    .gauge-section { display: flex; justify-content: center; margin: 16px 0; }

    /* ── Score info rows ── */
    .score-info {
      padding: 12px 14px; background: #F8F9FA;
      border-radius: 8px; margin-bottom: 16px;
    }

    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #F0F0F0;
      font-size: 13px; font-family: 'DM Sans', sans-serif;
    }
    .info-row:last-child { border-bottom: none; }

    .label { font-weight: 600; color: #666; }

    /* ── Données client (features ML) ── */
    .client-features { margin-bottom: 16px; }
    .client-features h4 {
      margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #E8621A;
      text-transform: uppercase; letter-spacing: 0.5px; font-family: 'DM Sans', sans-serif;
    }
    .cf-loading { padding: 14px; text-align: center; color: #888; font-size: 12px; font-family: 'DM Sans', sans-serif; }
    .cf-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; }
    .cf-item {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 7px 10px; background: #F8F9FA; border-radius: 6px;
      font-size: 12px; font-family: 'DM Sans', sans-serif;
    }
    .cf-item span { color: #888; }
    .cf-item strong { color: #1A1A2E; }
    .cf-item strong.warn { color: #D94040; }

    /* ── Narration ── */
    .narrative {
      padding: 14px 16px; background: #F5F5F7; border-radius: 8px;
      border-left: 3px solid #1A6FD4; margin-bottom: 16px;
    }

    .narrative h4 {
      margin: 0 0 8px 0; font-size: 11px; font-weight: 700;
      color: #1A6FD4; text-transform: uppercase; letter-spacing: 0.5px;
      font-family: 'DM Sans', sans-serif;
    }

    .narrative p {
      margin: 0; font-size: 13px; color: #444;
      line-height: 1.65; font-family: 'DM Sans', sans-serif;
    }

    .empty-narrative { border-left-color: #CCC; }
    .empty-narrative h4 { color: #999; }
    .empty-narrative p { color: #999; font-style: italic; }

    /* ── Facteurs SHAP ── */
    .shap-section {
      padding: 14px 16px; background: #F5F5F7; border-radius: 8px;
      border-left: 3px solid #2D9C6A; margin-bottom: 16px;
    }
    .shap-section h4 {
      margin: 0 0 12px 0; font-size: 11px; font-weight: 700;
      color: #2D9C6A; text-transform: uppercase; letter-spacing: 0.5px;
      font-family: 'DM Sans', sans-serif;
    }
    .shap-list { display: flex; flex-direction: column; gap: 12px; }
    .shap-row { font-family: 'DM Sans', sans-serif; }
    .shap-head {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 12px; margin-bottom: 5px;
    }
    .shap-name { font-weight: 600; color: #1A1A2E; }
    .shap-dir { font-size: 11px; font-weight: 600; }
    .shap-dir.risk { color: #D94040; }
    .shap-dir.protect { color: #2D9C6A; }
    .shap-bar-track { height: 7px; background: #E5E5EA; border-radius: 4px; overflow: hidden; }
    .shap-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .shap-bar.risk { background: #D94040; }
    .shap-bar.protect { background: #2D9C6A; }

    /* ── Action buttons ── */
    .actions-section { display: flex; gap: 10px; }

    .btn-success, .btn-danger {
      flex: 1; padding: 12px;
      border: none; border-radius: 6px;
      font-size: 14px; font-weight: 700;
      cursor: pointer; font-family: 'DM Sans', sans-serif;
      transition: all 0.2s;
    }

    .btn-success { background: #2D9C6A; color: white; }
    .btn-success:hover:not(:disabled) { background: #1f7a52; }

    .btn-danger { background: #D94040; color: white; }
    .btn-danger:hover:not(:disabled) { background: #b83030; }

    .btn-success:disabled, .btn-danger:disabled {
      opacity: 0.5; cursor: not-allowed;
    }

    .already-processed {
      text-align: center; padding: 12px;
      background: #F5F5F7; border-radius: 6px;
      font-size: 13px; color: #888;
      font-family: 'DM Sans', sans-serif;
    }

    .action-message {
      margin-top: 10px; padding: 10px 12px;
      background: #E3F5EE; color: #2D9C6A;
      border-radius: 6px; font-size: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    /* ── Queue ── */
    .queue-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; padding-right: 4px; }

    .queue-item {
      padding: 12px 14px;
      background: #F8F9FA;
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .queue-item:hover { background: #F0F0F0; }

    .queue-item.active {
      background: white;
      border-color: #E8621A;
    }

    .queue-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px;
    }

    .queue-client {
      font-size: 13px; font-weight: 700; color: #1A1A2E;
      font-family: 'DM Sans', sans-serif;
    }

    .queue-date {
      font-size: 11px; color: #888;
      font-family: 'DM Sans', sans-serif;
    }

    .queue-footer {
      display: flex; justify-content: space-between; align-items: center;
    }

    .queue-footer strong {
      font-size: 14px; font-family: 'DM Sans', sans-serif;
    }

    .risk-chip {
      display: inline-block;
      padding: 2px 8px; border-radius: 20px;
      color: white; font-size: 10px; font-weight: 700;
      font-family: 'DM Sans', sans-serif;
    }

    .empty-selection, .empty-queue {
      padding: 50px 20px; text-align: center;
      color: #888; font-family: 'DM Sans', sans-serif; font-size: 13px;
    }

    .empty-selection p, .empty-queue p { margin: 0; }

    @media (max-width: 1024px) {
      .validation-container { grid-template-columns: 1fr; }
    }
  `]
})
export class ScoresValidationComponent implements OnInit {
  scoresEnAttente: Score[] = [];
  selectedScore: Score | null = null;
  selectedClient: Client | null = null;
  loadingClient = false;
  clientsMap: Map<string, string> = new Map(); // clientId → "Prénom Nom"
  isActing = false;
  isRefreshing = false;
  actionMessage = '';
  /** Score à présélectionner (raccourci ?scoreId=…). */
  private pendingScoreId: string | null = null;

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
    private scoreService: ScoreService,
    private clientService: ClientService,
    private simulationService: SimulationService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClients();
    // Pré-sélection via ?scoreId= (raccourcis « Valider ce score » depuis la fiche
    // client, le détail d'un score ou une alerte) — pas de nouvelle recherche manuelle.
    this.pendingScoreId = this.route.snapshot.queryParamMap.get('scoreId');
    this.loadScoresEnAttente();
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (clients) => {
        clients.forEach(c => {
          if (c.id) this.clientsMap.set(String(c.id), `${c.prenom} ${c.nom}`);
        });
      },
      error: (err) => console.error('Erreur chargement clients', err),
    });
  }

  loadScoresEnAttente(): void {
    this.scoreService.getScoresEnAttente().subscribe({
      next: (scores) => {
        this.scoresEnAttente = scores;
        // Présélection demandée (raccourci) : le score ciblé s'il est en attente,
        // sinon on le charge quand même en détail (déjà validé/rejeté → lecture seule).
        if (this.pendingScoreId) {
          const cible = scores.find(s => String(s.id) === String(this.pendingScoreId));
          if (cible) {
            this.selectScore(cible);
          } else {
            this.scoreService.getScore(this.pendingScoreId).subscribe({
              next: (s) => { this.selectedScore = s; },
              error: () => {
                this.toast.error('Score introuvable — il a peut-être été supprimé.');
                if (scores.length > 0) this.selectScore(scores[0]);
              },
            });
          }
          this.pendingScoreId = null;
        } else if (scores.length > 0) {
          this.selectScore(scores[0]);
        }
      },
      error: (err) => {
        console.error('Erreur chargement scores', err);
        this.toast.error('Erreur réseau — impossible de charger la file de validation.');
      },
    });
  }

  /** Recharge la file sans recharger la page, en conservant la sélection courante. */
  refresh(): void {
    this.isRefreshing = true;
    const selectedId = this.selectedScore?.id;
    this.scoreService.getScoresEnAttente().subscribe({
      next: (scores) => {
        this.isRefreshing = false;
        this.scoresEnAttente = scores;
        const still = scores.find(s => String(s.id) === String(selectedId));
        if (still) this.selectedScore = still;
        else if (!this.selectedScore || this.selectedScore.statut === 'EN_ATTENTE') {
          this.selectedScore = scores.length > 0 ? scores[0] : null;
        }
        this.toast.info('File de validation actualisée.');
      },
      error: () => {
        this.isRefreshing = false;
        this.toast.error('Erreur réseau — rafraîchissement impossible.');
      },
    });
  }

  selectScore(score: Score): void {
    this.selectedScore = score;
    this.actionMessage = '';
    // Charge les données client utilisées par le modèle (#7) — validation sans quitter la page.
    this.selectedClient = null;
    if (score.clientId) {
      this.loadingClient = true;
      this.clientService.getClientById(String(score.clientId)).subscribe({
        next: (c) => { this.selectedClient = c; this.loadingClient = false; },
        error: () => { this.loadingClient = false; },
      });
    }
  }

  formatSituationPro(s: string): string {
    switch (s) {
      case 'CDI': return 'Salarié (CDI)';
      case 'CDD': return 'Salarié (CDD)';
      case 'INDEPENDANT': return 'Indépendant';
      case 'SANS_EMPLOI': return 'Sans emploi';
      default: return s;
    }
  }

  /** Interprétation métier affichée sous la jauge (#3) : un risque faible = fort
   *  potentiel client, un risque élevé = faible potentiel. Évite de répéter le
   *  « niveau de risque » déjà présent dans le tableau de détail. */
  potentielLabel(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return 'Client à fort potentiel';
      case 'MOYEN':  return 'Client à potentiel moyen';
      case 'ELEVE':  return 'Client à faible potentiel';
      default:       return '';
    }
  }

  validerScore(statut: 'VALIDE' | 'REJETE'): void {
    if (!this.selectedScore?.id) return;
    this.isActing = true;
    this.scoreService.validerScore(this.selectedScore.id, statut).subscribe({
      next: () => {
        this.isActing = false;
        this.actionMessage = statut === 'VALIDE'
          ? 'Score validé avec succès.'
          : 'Score rejeté.';
        this.toast.success(statut === 'VALIDE' ? 'Score validé avec succès.' : 'Score rejeté avec succès.');
        // Retirer de la file et passer au suivant
        this.scoresEnAttente = this.scoresEnAttente.filter(s => s.id !== this.selectedScore?.id);
        if (this.scoresEnAttente.length > 0) {
          this.selectScore(this.scoresEnAttente[0]);
        } else {
          this.selectedScore = null;
        }
      },
      error: (err) => {
        this.isActing = false;
        console.error('Erreur validation', err);
        this.toast.error(err?.error?.message || 'Échec de la validation — réessayez.');
      },
    });
  }

  getClientName(clientId: string): string {
    return this.clientsMap.get(String(clientId)) || `Client #${clientId}`;
  }

  getRiskColor(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return '#2D9C6A';
      case 'MOYEN':  return '#E8621A';
      case 'ELEVE':  return '#D94040';
      default:       return '#888';
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

  formatStatut(statut: string): string {
    switch (statut) {
      case 'VALIDE':     return 'Validé';
      case 'EN_ATTENTE': return 'En attente';
      case 'REJETE':     return 'Rejeté';
      default:           return statut;
    }
  }

  getScoreBadgeVariant(statut: string): 'success' | 'warning' | 'info' | 'danger' {
    switch (statut) {
      case 'VALIDE':     return 'success';
      case 'EN_ATTENTE': return 'info';
      case 'REJETE':     return 'danger';
      default:           return 'info';
    }
  }

  sortedExplications() {
    const list = this.selectedScore?.explications ?? [];
    return [...list].sort((a, b) => a.ordreImportance - b.ordreImportance);
  }

  featureLabel(name: string): string {
    return this.featureLabels[name] ?? name;
  }

  shapWidth(f: { shapValue: number }): number {
    const list = this.selectedScore?.explications ?? [];
    const max = Math.max(...list.map(e => Math.abs(e.shapValue)), 0.0001);
    return Math.max(8, Math.round((Math.abs(f.shapValue) / max) * 100));
  }
}
