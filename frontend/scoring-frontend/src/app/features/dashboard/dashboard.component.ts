import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardData } from '../../core/models/dashboard.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, BadgeComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-icon">👥</div>
              <div class="kpi-content">
                <p class="kpi-label">Total Clients</p>
                <p class="kpi-value">{{ dashboardData?.totalClients || 0 }}</p>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">⏳</div>
              <div class="kpi-content">
                <p class="kpi-label">Scores en Attente</p>
                <p class="kpi-value">{{ dashboardData?.scoresEnAttente || 0 }}</p>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">🔔</div>
              <div class="kpi-content">
                <p class="kpi-label">Alertes Actives</p>
                <p class="kpi-value">{{ dashboardData?.alertesActives || 0 }}</p>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">📊</div>
              <div class="kpi-content">
                <p class="kpi-label">Score Moyen</p>
                <p class="kpi-value">{{ (dashboardData?.scoreMoyen || 0) | number:'1.0-0' }}</p>
              </div>
            </div>
          </div>

          <div class="charts-grid">
            <div class="chart-card">
              <h3>Répartition des Risques</h3>
              <div class="donut-chart">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#2D9C6A" stroke-width="30"
                    stroke-dasharray="125.6 339.3" stroke-dashoffset="0"/>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#E8621A" stroke-width="30"
                    stroke-dasharray="113.1 339.3" stroke-dashoffset="-125.6"/>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#D94040" stroke-width="30"
                    stroke-dasharray="100.7 339.3" stroke-dashoffset="-238.7"/>
                  <text x="100" y="105" text-anchor="middle" font-size="14" font-weight="bold">Risk</text>
                </svg>
              </div>
              <div class="legend">
                <div class="legend-item">
                  <span class="dot" style="background: #2D9C6A;"></span>
                  <span>Faible</span>
                </div>
                <div class="legend-item">
                  <span class="dot" style="background: #E8621A;"></span>
                  <span>Moyen</span>
                </div>
                <div class="legend-item">
                  <span class="dot" style="background: #D94040;"></span>
                  <span>Élevé</span>
                </div>
              </div>
            </div>

            <div class="chart-card">
              <h3>Distribution des Scores</h3>
              <div class="bar-chart">
                <div class="bar-group">
                  <div class="bar-item">
                    <div class="bar" style="height: 60%; background: #2D9C6A;"></div>
                    <span class="bar-label">0-25</span>
                  </div>
                  <div class="bar-item">
                    <div class="bar" style="height: 40%; background: #E8621A;"></div>
                    <span class="bar-label">25-50</span>
                  </div>
                  <div class="bar-item">
                    <div class="bar" style="height: 50%; background: #1A6FD4;"></div>
                    <span class="bar-label">50-75</span>
                  </div>
                  <div class="bar-item">
                    <div class="bar" style="height: 80%; background: #2D9C6A;"></div>
                    <span class="bar-label">75-100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="user?.role === 'SUPERVISEUR' && dashboardData" class="recent-section">
            <div class="section-card">
              <h3>Scores en Attente</h3>
              <div *ngIf="hasRecentScores" class="table">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Score</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let score of dashboardData?.scoresRecents || []">
                      <td>{{ score.clientNom }}</td>
                      <td><strong>{{ score.valeur }}/100</strong></td>
                      <td>{{ score.dateCalcul | date:'short' }}</td>
                      <td><a href="/scores" class="link">Valider</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div *ngIf="!hasRecentScores" class="empty">
                Aucun score en attente
              </div>
            </div>

            <div class="section-card">
              <h3>Alertes Récentes</h3>
              <div *ngIf="hasRecentAlerts" class="alerts-list">
                <div *ngFor="let alerte of dashboardData?.alertesRecentes || []" class="alert-item">
                  <app-badge [label]="alerte.criticite" [variant]="getBadgeVariant(alerte.criticite)"></app-badge>
                  <div class="alert-content">
                    <p class="alert-type">{{ alerte.type }}</p>
                    <p class="alert-desc">{{ alerte.description }}</p>
                  </div>
                </div>
              </div>
              <div *ngIf="!hasRecentAlerts" class="empty">
                Aucune alerte
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

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .kpi-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .kpi-icon {
      font-size: 32px;
    }

    .kpi-content {
      flex: 1;
    }

    .kpi-label {
      font-size: 13px;
      color: #888;
      margin: 0;
      font-family: 'DM Sans', sans-serif;
    }

    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: #1A1A2E;
      margin: 5px 0 0 0;
      font-family: 'Sora', sans-serif;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .chart-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    .chart-card h3 {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .donut-chart {
      display: flex;
      justify-content: center;
      margin-bottom: 15px;
    }

    .donut-chart svg {
      width: 150px;
      height: 150px;
    }

    .donut-chart text {
      font-family: 'Sora', sans-serif;
      font-weight: 700;
      fill: #1A1A2E;
    }

    .legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      color: #666;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      height: 150px;
      padding: 20px 0;
    }

    .bar-group {
      display: flex;
      gap: 15px;
      width: 100%;
      align-items: flex-end;
      height: 100%;
    }

    .bar-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .bar {
      width: 100%;
      min-height: 40px;
      border-radius: 4px;
    }

    .bar-label {
      font-size: 11px;
      color: #666;
      font-family: 'DM Sans', sans-serif;
    }

    .recent-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .section-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    .section-card h3 {
      margin: 0 0 15px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .table {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }

    thead {
      background: #F5F5F7;
    }

    th {
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #1A1A2E;
      border-bottom: 1px solid #E5E5EA;
    }

    td {
      padding: 10px;
      border-bottom: 1px solid #E5E5EA;
      color: #666;
    }

    td strong {
      color: #E8621A;
      font-weight: 600;
    }

    .link {
      color: #1A6FD4;
      text-decoration: none;
      font-weight: 500;
    }

    .link:hover {
      text-decoration: underline;
    }

    .empty {
      text-align: center;
      padding: 20px;
      color: #888;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .alert-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px;
      background: #F5F5F7;
      border-radius: 6px;
    }

    .alert-content {
      flex: 1;
    }

    .alert-type {
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
      margin: 0 0 4px 0;
      font-family: 'DM Sans', sans-serif;
    }

    .alert-desc {
      font-size: 12px;
      color: #666;
      margin: 0;
      font-family: 'DM Sans', sans-serif;
    }

    @media (max-width: 1024px) {
      .recent-section {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  user: User | null = null;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du dashboard', err);
      },
    });
  }

  get hasRecentScores(): boolean {
    return !!this.dashboardData?.scoresRecents?.length;
  }

  get hasRecentAlerts(): boolean {
    return !!this.dashboardData?.alertesRecentes?.length;
  }

  getBadgeVariant(criticite: string): 'danger' | 'warning' | 'info' | 'success' {
    switch (criticite) {
      case 'CRITIQUE':
        return 'danger';
      case 'ELEVE':
        return 'warning';
      case 'MOYEN':
        return 'info';
      default:
        return 'success';
    }
  }
}
