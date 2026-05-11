import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { ClientService } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { Client } from '../../core/models/client.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, TopbarComponent, BadgeComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <div class="header-section">
            <h2>Clients</h2>
            <a *ngIf="user?.role === 'CHARGE_CLIENTELE'" routerLink="/clients/nouveau" class="btn-primary">
              + Nouveau Client
            </a>
          </div>

          <div class="filters-section">
            <input
              type="text"
              [(ngModel)]="searchNom"
              placeholder="Rechercher par nom..."
              class="search-input"
              (keyup)="filterClients()"
            />
            <input
              type="text"
              [(ngModel)]="searchCin"
              placeholder="Rechercher par CIN..."
              class="search-input"
              (keyup)="filterClients()"
            />
          </div>

          <div class="table-container">
            <table class="clients-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>CIN</th>
                  <th>Situation Pro</th>
                  <th>Revenus</th>
                  <th>Taux Endettement</th>
                  <th>Score</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let client of filteredClients">
                  <td>{{ client.prenom }} {{ client.nom }}</td>
                  <td>{{ client.cin }}</td>
                  <td>{{ client.situationPro }}</td>
                  <td>{{ client.revenusMensuels | number:'1.0-0' }} DH</td>
                  <td>{{ (client.tauxEndettement || 0) | number:'1.0-0' }}%</td>
                  <td>
                    <strong *ngIf="client.dernierScore" [style.color]="getScoreColor(client.dernierScore.valeur)">
                      {{ client.dernierScore.valeur || 0 }}/100
                    </strong>
                    <span *ngIf="!client.dernierScore" class="no-score">N/A</span>
                  </td>
                  <td>
                    <app-badge
                      *ngIf="client.dernierScore"
                      [label]="client.dernierScore.statut"
                      [variant]="getScoreBadgeVariant(client.dernierScore.statut)"
                    ></app-badge>
                  </td>
                  <td>
                    <a [routerLink]="'/clients/' + client.id" class="link">Détail</a>
                    <a *ngIf="user?.role === 'CHARGE_CLIENTELE' && client.id" [routerLink]="'/clients/' + client.id" class="link">
                      Modifier
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="filteredClients.length === 0" class="empty-state">
            Aucun client trouvé
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

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .header-section h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
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

    .filters-section {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }

    .search-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #E5E5EA;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
    }

    .search-input:focus {
      outline: none;
      border-color: #E8621A;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
      overflow-x: auto;
    }

    .clients-table {
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

    td strong {
      font-weight: 600;
      color: #1A1A2E;
    }

    .no-score {
      color: #888;
    }

    .link {
      color: #1A6FD4;
      text-decoration: none;
      font-weight: 500;
      margin-right: 10px;
    }

    .link:hover {
      text-decoration: underline;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #888;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
    }
  `]
})
export class ClientsListComponent implements OnInit {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  searchNom = '';
  searchCin = '';
  user: User | null = null;

  constructor(
    private clientService: ClientService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadClients();
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (data) => {
        this.clients = data;
        this.filteredClients = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des clients', err);
      },
    });
  }

  filterClients(): void {
    this.filteredClients = this.clients.filter((client) => {
      const nomMatch =
        `${client.prenom} ${client.nom}`.toLowerCase().includes(this.searchNom.toLowerCase()) ||
        this.searchNom === '';
      const cinMatch = client.cin.includes(this.searchCin) || this.searchCin === '';
      return nomMatch && cinMatch;
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
