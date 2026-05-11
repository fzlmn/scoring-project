import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { ClientService } from '../../core/services/client.service';
import { ScoreService } from '../../core/services/score.service';
import { Client } from '../../core/models/client.model';
import { Score } from '../../core/models/score.model';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent, BadgeComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <div class="header-section">
            <a routerLink="/clients" class="back-link">← Retour</a>
            <h2>{{ client?.prenom }} {{ client?.nom }}</h2>
          </div>

          <div class="detail-grid">
            <div class="detail-card">
              <h3>Informations Personnelles</h3>
              <div class="detail-row">
                <span class="label">CIN</span>
                <span class="value">{{ client?.cin }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date de Naissance</span>
                <span class="value">{{ client?.dateNaissance | date:'longDate' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Situation Pro</span>
                <span class="value">{{ client?.situationPro }}</span>
              </div>
            </div>

            <div class="detail-card">
              <h3>Informations Financières</h3>
              <div class="detail-row">
                <span class="label">Revenus Mensuels</span>
                <span class="value">{{ client?.revenusMensuels | number:'1.0-0' }} DH</span>
              </div>
              <div class="detail-row">
                <span class="label">Charges Mensuelles</span>
                <span class="value">{{ client?.chargesMensuelles | number:'1.0-0' }} DH</span>
              </div>
              <div class="detail-row">
                <span class="label">Taux d'Endettement</span>
                <span class="value">{{ (client?.tauxEndettement || 0) | number:'1.0-0' }}%</span>
              </div>
            </div>

              <div class="detail-row">
                <span class="label">Score Client</span>
                <span class="value" [style.color]="getScoreColor(client?.dernierScore?.valeur || 0)">
                  <strong>{{ client?.dernierScore?.valeur || 'N/A' }}/100</strong>
                </span>
              </div>
              <div class="detail-row">
                <span class="label">Statut</span>
                <span>
                  <app-badge
                    [label]="client?.dernierScore?.statut || 'N/A'"
                    [variant]="getScoreBadgeVariant(client?.dernierScore?.statut || '')"
                  ></app-badge>
                </span>
              </div>
              <div class="detail-row">
                <span class="label">Risque</span>
                <span class="value">{{ client?.dernierScore?.niveauRisque || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date de Calcul</span>
                <span class="value">{{ client?.dernierScore?.dateCalcul | date:'short' }}</span>
              </div>
          </div>

          <div *ngIf="client?.historiqueFinancier" class="history-card">
            <h3>Historique Financier</h3>
            <p class="history-text">{{ client?.historiqueFinancier }}</p>
          </div>

          <div class="action-section">
            <a routerLink="/clients/{{ client?.id }}" class="btn-primary">Modifier</a>
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
      max-width: 1000px;
      margin: 0 auto;
    }

    .header-section {
      margin-bottom: 30px;
    }

    .back-link {
      display: inline-block;
      color: #1A6FD4;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 10px;
      font-family: 'DM Sans', sans-serif;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #1A1A2E;
      margin: 0;
      font-family: 'Sora', sans-serif;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .detail-card,
    .history-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    .detail-card h3,
    .history-card h3 {
      margin: 0 0 15px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #E5E5EA;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 600;
      color: #666;
    }

    .value {
      color: #1A1A2E;
      font-weight: 500;
    }

    .history-card {
      grid-column: 1 / -1;
    }

    .history-text {
      margin: 0;
      color: #666;
      line-height: 1.6;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }

    .action-section {
      display: flex;
      gap: 10px;
    }

    .btn-primary {
      padding: 10px 20px;
      background: #E8621A;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      font-family: 'DM Sans', sans-serif;
      transition: background 0.3s;
    }

    .btn-primary:hover {
      background: #d14d0a;
    }
  `]
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  clientId: string | null = null;

  constructor(
    private clientService: ClientService,
    private scoreService: ScoreService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.clientId = params.get('id');
      if (this.clientId) {
        this.loadClient(this.clientId);
      }
    });
  }

  loadClient(id: string): void {
    this.clientService.getClientById(id).subscribe({
      next: (client) => {
        this.client = client;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du client', err);
      },
    });
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#2D9C6A';
    if (score >= 40) return '#E8621A';
    return '#D94040';
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
