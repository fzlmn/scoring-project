import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { ScoreGaugeComponent } from '../../shared/components/score-gauge.component';
import { ScoreService } from '../../core/services/score.service';
import { SimulationService } from '../../core/services/simulation.service';
import { Score } from '../../core/models/score.model';
import { Simulation } from '../../core/models/simulation.model';

@Component({
  selector: 'app-scores-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent, BadgeComponent, ScoreGaugeComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <h2>Validation des Scores</h2>

          <div class="validation-container">
            <div class="score-detail">
              <div *ngIf="selectedScore" class="score-card">
                <h3>Détail du Score</h3>

                <div class="gauge-section">
                  <app-score-gauge [score]="selectedScore.valeur"></app-score-gauge>
                </div>

                <div class="score-info">
                  <div class="info-row">
                    <span class="label">Client</span>
                    <span class="value">{{ selectedScore.clientId }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Statut</span>
                    <app-badge
                      [label]="selectedScore.statut"
                      [variant]="getScoreBadgeVariant(selectedScore.statut)"
                    ></app-badge>
                  </div>
                  <div class="info-row">
                    <span class="label">Risque</span>
                    <span class="value" [style.color]="getRiskColor(selectedScore.niveauRisque)">
                      {{ selectedScore.niveauRisque }}
                    </span>
                  </div>
                </div>

                <div class="narrative">
                  <h4>Narration IA</h4>
                  <p>{{ selectedScore.narratif }}</p>
                </div>

                <div class="shap-factors">
                  <h4>Facteurs d'Impact (SHAP)</h4>
                  <div class="factors-list">
                    <div *ngFor="let factor of selectedScore.facteurs" class="factor-item">
                      <div class="factor-name">{{ factor.nom }}</div>
                      <div class="factor-bar">
                        <div class="factor-value" [style.width.%]="Math.abs(factor.impact) * 10"></div>
                      </div>
                      <div class="factor-impact" [style.color]="factor.impact > 0 ? '#2D9C6A' : '#D94040'">
                        {{ factor.impact > 0 ? '+' : '' }}{{ factor.impact }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="actions-section">
                  <button (click)="validerScore('VALIDE')" class="btn-success">
                    ✓ Valider
                  </button>
                  <button (click)="validerScore('REJETE')" class="btn-danger">
                    ✗ Rejeter
                  </button>
                </div>
              </div>

              <div *ngIf="!selectedScore" class="empty-selection">
                Sélectionnez un score pour voir les détails
              </div>
            </div>

            <div class="scores-queue">
              <h3>File d'Attente</h3>
              <div class="queue-list">
                <div
                  *ngFor="let score of scoresEnAttente"
                  [class.active]="selectedScore?.id === score.id"
                  (click)="selectScore(score)"
                  class="queue-item"
                >
                  <div class="queue-header">
                    <span class="score-value">{{ score.valeur }}/100</span>
                    <span class="queue-date">{{ score.dateCalcul | date:'short' }}</span>
                  </div>
                  <div class="queue-risk">
                    <span class="risk-badge" [style.background]="getRiskColor(score.niveauRisque)">
                      {{ score.niveauRisque }}
                    </span>
                  </div>
                </div>
              </div>

              <div *ngIf="scoresEnAttente.length === 0" class="empty-queue">
                Aucun score en attente
              </div>
            </div>
          </div>

          <div *ngIf="selectedScore" class="simulation-section">
            <h3>Simulation de Score</h3>
            <div class="simulation-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Revenus Simulés (DH)</label>
                  <input
                    type="number"
                    [(ngModel)]="simulationForm.revenusSimules"
                    placeholder="Entrez les revenus simulés"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>Charges Simulées (DH)</label>
                  <input
                    type="number"
                    [(ngModel)]="simulationForm.chargesSimulees"
                    placeholder="Entrez les charges simulées"
                    class="form-input"
                  />
                </div>
              </div>
              <button (click)="runSimulation()" class="btn-simulate">
                Simuler
              </button>
              <div *ngIf="simulationResult" class="simulation-result">
                <p><strong>Score Résultat :</strong> {{ simulationResult.scoreResultat }}/100</p>
                <p><strong>Taux d'Endettement :</strong> {{ simulationResult.tauxEndettementSimule }}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: #F5F5F7;
    }

    .main-content {
      flex: 1;
      margin-left: 280px;
    }

    .content {
      padding: 30px;
      max-width: 1400px;
      margin: 0 auto;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1A1A2E;
      margin: 0 0 30px 0;
      font-family: 'Sora', sans-serif;
    }

    .validation-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .score-detail,
    .scores-queue {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    .score-card h3,
    .scores-queue h3 {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .gauge-section {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }

    .score-info {
      margin: 20px 0;
      padding: 15px;
      background: #F5F5F7;
      border-radius: 6px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
    }

    .label {
      font-weight: 600;
      color: #666;
    }

    .value {
      font-weight: 600;
      color: #1A1A2E;
    }

    .narrative,
    .shap-factors {
      margin: 20px 0;
      padding: 15px;
      background: #F5F5F7;
      border-radius: 6px;
    }

    .narrative h4,
    .shap-factors h4 {
      margin: 0 0 10px 0;
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .narrative p {
      margin: 0;
      font-size: 13px;
      color: #666;
      line-height: 1.6;
      font-family: 'DM Sans', sans-serif;
    }

    .factors-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .factor-item {
      display: grid;
      grid-template-columns: 80px 1fr 60px;
      gap: 10px;
      align-items: center;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    .factor-name {
      font-weight: 600;
      color: #1A1A2E;
    }

    .factor-bar {
      background: #E5E5EA;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
    }

    .factor-value {
      height: 100%;
      background: #E8621A;
    }

    .factor-impact {
      text-align: right;
      font-weight: 600;
    }

    .actions-section {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .btn-success,
    .btn-danger,
    .btn-simulate {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.3s;
    }

    .btn-success {
      background: #2D9C6A;
      color: white;
    }

    .btn-success:hover {
      background: #1f7a52;
    }

    .btn-danger {
      background: #D94040;
      color: white;
    }

    .btn-danger:hover {
      background: #b83030;
    }

    .btn-simulate {
      background: #E8621A;
      color: white;
      margin-top: 10px;
    }

    .btn-simulate:hover {
      background: #d14d0a;
    }

    .empty-selection,
    .empty-queue {
      padding: 40px 20px;
      text-align: center;
      color: #888;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }

    .queue-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .queue-item {
      padding: 12px;
      background: #F5F5F7;
      border: 2px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
    }

    .queue-item:hover {
      background: #E5E5EA;
    }

    .queue-item.active {
      background: white;
      border-color: #E8621A;
    }

    .queue-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }

    .score-value {
      font-weight: 600;
      color: #1A1A2E;
    }

    .queue-date {
      color: #888;
    }

    .risk-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      color: white;
      font-weight: 600;
      font-size: 10px;
    }

    .simulation-section {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    .simulation-section h3 {
      margin: 0 0 15px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .simulation-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-size: 12px;
      font-weight: 600;
      color: #1A1A2E;
      margin-bottom: 5px;
      font-family: 'DM Sans', sans-serif;
    }

    .form-input {
      padding: 8px 10px;
      border: 1px solid #E5E5EA;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    .form-input:focus {
      outline: none;
      border-color: #E8621A;
    }

    .simulation-result {
      margin-top: 10px;
      padding: 10px;
      background: #E3F5EE;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      color: #2D9C6A;
    }

    .simulation-result p {
      margin: 4px 0;
    }

    @media (max-width: 1024px) {
      .validation-container {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ScoresValidationComponent implements OnInit {
  scoresEnAttente: Score[] = [];
  selectedScore: Score | null = null;
  simulationForm = {
    revenusSimules: 0,
    chargesSimulees: 0,
  };
  simulationResult: any = null;

  Math = Math;

  constructor(
    private scoreService: ScoreService,
    private simulationService: SimulationService
  ) {}

  ngOnInit(): void {
    this.loadScoresEnAttente();
  }

  loadScoresEnAttente(): void {
    this.scoreService.getScoresEnAttente().subscribe({
      next: (scores) => {
        this.scoresEnAttente = scores;
        if (scores.length > 0) {
          this.selectScore(scores[0]);
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des scores', err);
      },
    });
  }

  selectScore(score: Score): void {
    this.selectedScore = score;
  }

  validerScore(statut: 'VALIDE' | 'REJETE'): void {
    if (this.selectedScore?.id) {
      this.scoreService.validerScore(this.selectedScore.id, statut).subscribe({
        next: () => {
          this.scoresEnAttente = this.scoresEnAttente.filter((s) => s.id !== this.selectedScore?.id);
          if (this.scoresEnAttente.length > 0) {
            this.selectScore(this.scoresEnAttente[0]);
          } else {
            this.selectedScore = null;
          }
        },
        error: (err) => {
          console.error('Erreur lors de la validation du score', err);
        },
      });
    }
  }

  runSimulation(): void {
    if (this.selectedScore) {
      this.simulationService
        .createSimulation({
          clientId: this.selectedScore.clientId,
          revenusSimules: this.simulationForm.revenusSimules,
          chargesSimulees: this.simulationForm.chargesSimulees,
        })
        .subscribe({
          next: (result) => {
            this.simulationResult = result;
          },
          error: (err) => {
            console.error('Erreur lors de la simulation', err);
          },
        });
    }
  }

  getRiskColor(risk: string): string {
    switch (risk) {
      case 'FAIBLE':
        return '#2D9C6A';
      case 'MOYEN':
        return '#E8621A';
      case 'ELEVE':
        return '#D94040';
      default:
        return '#888';
    }
  }

  getScoreBadgeVariant(statut: string): 'success' | 'warning' | 'info' | 'danger' {
    switch (statut) {
      case 'VALIDE':
        return 'success';
      case 'EN_ATTENTE':
        return 'info';
      case 'REJETE':
        return 'danger';
      default:
        return 'secondary' as any;
    }
  }
}
