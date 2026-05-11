import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { SimulationService } from '../../core/services/simulation.service';
import { ClientService } from '../../core/services/client.service';
import { Simulation } from '../../core/models/simulation.model';
import { Client } from '../../core/models/client.model';

@Component({
  selector: 'app-simulations',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <h2>Simulations</h2>

          <div class="simulation-container">
            <div class="form-card">
              <h3>Créer une Simulation</h3>

              <div class="form-group">
                <label>Client</label>
                <select [(ngModel)]="selectedClientId" class="form-input">
                  <option value="">-- Sélectionner un client --</option>
                  <option *ngFor="let client of clients" [value]="client.id">
                    {{ client.prenom }} {{ client.nom }}
                  </option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Revenus Simulés (DH)</label>
                  <input
                    type="number"
                    [(ngModel)]="newSimulation.revenusSimules"
                    placeholder="0"
                    class="form-input"
                    min="0"
                  />
                </div>
                <div class="form-group">
                  <label>Charges Simulées (DH)</label>
                  <input
                    type="number"
                    [(ngModel)]="newSimulation.chargesSimulees"
                    placeholder="0"
                    class="form-input"
                    min="0"
                  />
                </div>
              </div>

              <button (click)="createSimulation()" class="btn-primary" [disabled]="!selectedClientId || isLoading">
                {{ isLoading ? 'En cours...' : 'Créer Simulation' }}
              </button>

              <div *ngIf="successMessage" class="success-message">
                {{ successMessage }}
              </div>
              <div *ngIf="errorMessage" class="error-message">
                {{ errorMessage }}
              </div>
            </div>

            <div class="list-card">
              <h3>Historique des Simulations</h3>
              <div class="table-container">
                <table class="simulations-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Revenus Simulés</th>
                      <th>Charges Simulées</th>
                      <th>Taux d'Endettement</th>
                      <th>Score Résultat</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let sim of simulations">
                      <td>{{ getClientName(sim.clientId) }}</td>
                      <td>{{ sim.revenusSimules | number:'1.0-0' }} DH</td>
                      <td>{{ sim.chargesSimulees | number:'1.0-0' }} DH</td>
                      <td>{{ (sim.tauxEndettementSimule || 0) | number:'1.0-0' }}%</td>
                      <td>
                        <strong *ngIf="sim.scoreResultat" [style.color]="getScoreColor(sim.scoreResultat)">
                          {{ sim.scoreResultat }}/100
                        </strong>
                      </td>
                      <td>{{ sim.dateCreation | date:'short' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div *ngIf="simulations.length === 0" class="empty-state">
                Aucune simulation trouvée
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
      max-width: 1200px;
      margin: 0 auto;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1A1A2E;
      margin: 0 0 30px 0;
      font-family: 'Sora', sans-serif;
    }

    .simulation-container {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 20px;
    }

    .form-card,
    .list-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    h3 {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .form-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
      margin-bottom: 6px;
      font-family: 'DM Sans', sans-serif;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #E5E5EA;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #E8621A;
      box-shadow: 0 0 0 3px rgba(232, 98, 26, 0.1);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .btn-primary {
      width: 100%;
      padding: 10px;
      background: #E8621A;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: background 0.3s;
      margin-top: 10px;
    }

    .btn-primary:hover:not(:disabled) {
      background: #d14d0a;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .success-message {
      margin-top: 15px;
      padding: 10px 12px;
      background: #E3F5EE;
      color: #2D9C6A;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    .error-message {
      margin-top: 15px;
      padding: 10px 12px;
      background: #FCE3E3;
      color: #D94040;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    .table-container {
      overflow-x: auto;
    }

    .simulations-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
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

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #888;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }

    @media (max-width: 1024px) {
      .simulation-container {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SimulationsComponent implements OnInit {
  clients: Client[] = [];
  simulations: Simulation[] = [];
  selectedClientId: string | null = null;
  newSimulation: Partial<Simulation> = {
    revenusSimules: 0,
    chargesSimulees: 0,
  };
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private simulationService: SimulationService,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.loadClients();
    this.loadSimulations();
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (data) => {
        this.clients = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des clients', err);
      },
    });
  }

  loadSimulations(): void {
    this.simulationService.getSimulations().subscribe({
      next: (data) => {
        this.simulations = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des simulations', err);
      },
    });
  }

  createSimulation(): void {
    if (!this.selectedClientId || !this.newSimulation.revenusSimules || !this.newSimulation.chargesSimulees) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.simulationService
      .createSimulation({
        clientId: this.selectedClientId,
        revenusSimules: this.newSimulation.revenusSimules || 0,
        chargesSimulees: this.newSimulation.chargesSimulees || 0,
      })
      .subscribe({
        next: (sim) => {
          this.isLoading = false;
          this.simulations.unshift(sim);
          this.successMessage = 'Simulation créée avec succès';
          this.newSimulation = { revenusSimules: 0, chargesSimulees: 0 };
          this.selectedClientId = null;
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la création';
        },
      });
  }

  getClientName(clientId: string): string {
    const client = this.clients.find((c) => c.id === clientId);
    return client ? `${client.prenom} ${client.nom}` : clientId;
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#2D9C6A';
    if (score >= 40) return '#E8621A';
    return '#D94040';
  }
}
