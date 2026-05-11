import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { AlerteService } from '../../core/services/alerte.service';
import { Alerte } from '../../core/models/alerte.model';

@Component({
  selector: 'app-alertes',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, BadgeComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <h2>Alertes Clients</h2>

          <div class="filters">
            <button
              (click)="filterStatut('all')"
              [class.active]="filtreStatut === 'all'"
              class="filter-btn"
            >
              Toutes ({{ getTotalCount() }})
            </button>
            <button
              (click)="filterStatut('NON_LUE')"
              [class.active]="filtreStatut === 'NON_LUE'"
              class="filter-btn"
            >
              Non Lues ({{ getCountByStatus('NON_LUE') }})
            </button>
            <button
              (click)="filterStatut('LUE')"
              [class.active]="filtreStatut === 'LUE'"
              class="filter-btn"
            >
              Lues ({{ getCountByStatus('LUE') }})
            </button>
            <button
              (click)="filterStatut('TRAITEE')"
              [class.active]="filtreStatut === 'TRAITEE'"
              class="filter-btn"
            >
              Traitées ({{ getCountByStatus('TRAITEE') }})
            </button>
          </div>

          <div class="table-container">
            <table class="alertes-table">
              <thead>
                <tr>
                  <th>Criticité</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let alerte of filteredAlertes" [class.non-lue]="alerte.statut === 'NON_LUE'">
                  <td>
                    <app-badge
                      [label]="alerte.criticite"
                      [variant]="getBadgeVariant(alerte.criticite)"
                    ></app-badge>
                  </td>
                  <td>{{ alerte.type }}</td>
                  <td class="description">{{ alerte.description }}</td>
                  <td>{{ alerte.statut }}</td>
                  <td>{{ alerte.dateCreation | date:'short' }}</td>
                  <td>
                    <div class="actions">
                      <button
                        *ngIf="alerte.statut === 'NON_LUE'"
                        (click)="marquerLue(alerte)"
                        class="action-btn"
                        title="Marquer comme lue"
                      >
                        Lue
                      </button>
                      <button
                        *ngIf="alerte.statut !== 'TRAITEE'"
                        (click)="marquerTraitee(alerte)"
                        class="action-btn"
                        title="Marquer comme traitée"
                      >
                        Traitée
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="filteredAlertes.length === 0" class="empty-state">
            Aucune alerte trouvée
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

    .filters {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 8px 16px;
      background: white;
      border: 1px solid #E5E5EA;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.3s;
      color: #666;
    }

    .filter-btn:hover {
      border-color: #E8621A;
      color: #E8621A;
    }

    .filter-btn.active {
      background: #E8621A;
      color: white;
      border-color: #E8621A;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
      overflow-x: auto;
    }

    .alertes-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }

    thead {
      background: #F5F5F7;
    }

    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #1A1A2E;
      border-bottom: 1px solid #E5E5EA;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #E5E5EA;
      color: #666;
    }

    tr.non-lue {
      background: #FFFBF5;
    }

    tr.non-lue td {
      font-weight: 500;
    }

    .description {
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: flex;
      gap: 5px;
    }

    .action-btn {
      padding: 4px 8px;
      background: #E8621A;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: background 0.3s;
    }

    .action-btn:hover {
      background: #d14d0a;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #888;
      font-family: 'DM Sans', sans-serif;
    }
  `]
})
export class AlertesComponent implements OnInit {
  alertes: Alerte[] = [];
  filteredAlertes: Alerte[] = [];
  filtreStatut = 'all';

  constructor(private alerteService: AlerteService) {}

  ngOnInit(): void {
    this.loadAlertes();
  }

  loadAlertes(): void {
    this.alerteService.getAlertes().subscribe({
      next: (data) => {
        this.alertes = data;
        this.applyFilter();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des alertes', err);
      },
    });
  }

  filterStatut(statut: string): void {
    this.filtreStatut = statut;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.filtreStatut === 'all') {
      this.filteredAlertes = this.alertes;
    } else {
      this.filteredAlertes = this.alertes.filter((a) => a.statut === this.filtreStatut);
    }
  }

  marquerLue(alerte: Alerte): void {
    if (alerte.id) {
      this.alerteService.updateStatut(alerte.id, 'LUE').subscribe({
        next: () => {
          alerte.statut = 'LUE';
          this.applyFilter();
        },
        error: (err) => {
          console.error('Erreur', err);
        },
      });
    }
  }

  marquerTraitee(alerte: Alerte): void {
    if (alerte.id) {
      this.alerteService.updateStatut(alerte.id, 'TRAITEE').subscribe({
        next: () => {
          alerte.statut = 'TRAITEE';
          this.applyFilter();
        },
        error: (err) => {
          console.error('Erreur', err);
        },
      });
    }
  }

  getTotalCount(): number {
    return this.alertes.length;
  }

  getCountByStatus(status: string): number {
    return this.alertes.filter((a) => a.statut === status).length;
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
