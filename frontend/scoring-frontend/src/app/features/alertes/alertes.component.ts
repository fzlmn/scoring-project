import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { AlerteService } from '../../core/services/alerte.service';
import { ToastService } from '../../core/services/toast.service';
import { Alerte } from '../../core/models/alerte.model';

@Component({
  selector: 'app-alertes',
  standalone: true,
  imports: [CommonModule, SidebarComponent, BadgeComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">        <div class="content">
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
            <button class="refresh-btn" (click)="refresh()" [disabled]="isRefreshing"
                    title="Recharger les alertes (filtre conservé)">
              <span [class.spin]="isRefreshing">⟳</span> Rafraîchir
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
                      [label]="formatCriticite(alerte.criticite)"
                      [variant]="getBadgeVariant(alerte.criticite)"
                    ></app-badge>
                  </td>
                  <td>{{ formatType(alerte.typeAlerte) }}</td>
                  <!-- Alerte actionnable : cliquer la description ouvre l'objet concerné -->
                  <td class="description">
                    <a *ngIf="hasTarget(alerte); else plainDesc" class="alerte-link"
                       (click)="ouvrirAlerte(alerte)" title="Ouvrir l'élément concerné">
                      {{ alerte.description }}
                    </a>
                    <ng-template #plainDesc>{{ alerte.description }}</ng-template>
                  </td>
                  <td>{{ formatStatut(alerte.statut) }}</td>
                  <td>{{ alerte.createdAt | date:'short' }}</td>
                  <td>
                    <div class="actions">
                      <button
                        *ngIf="hasTarget(alerte)"
                        (click)="ouvrirAlerte(alerte)"
                        class="action-btn examine"
                        title="Ouvrir le score ou la fiche client concernés"
                      >
                        Examiner →
                      </button>
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
      margin-left: var(--sidebar-width);
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

    .refresh-btn {
      margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid #E5E5EA; border-radius: 6px;
      background: white; color: #1A1A2E; font-size: 13px; font-weight: 600;
      font-family: 'DM Sans', sans-serif; cursor: pointer;
    }
    .refresh-btn:hover:not(:disabled) { background: #F5F5F7; }
    .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .refresh-btn .spin, .spin { display: inline-block; animation: al-spin 1s linear infinite; }
    @keyframes al-spin { to { transform: rotate(360deg); } }

    .alerte-link { color: #1A6FD4; cursor: pointer; text-decoration: none; }
    .alerte-link:hover { text-decoration: underline; }
    .action-btn.examine { background: #1A6FD4; }
    .action-btn.examine:hover { background: #1559ad; }
  `]
})
export class AlertesComponent implements OnInit {
  alertes: Alerte[] = [];
  filteredAlertes: Alerte[] = [];
  filtreStatut = 'all';
  isRefreshing = false;

  constructor(
    private alerteService: AlerteService,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadAlertes();
  }

  loadAlertes(notify = false): void {
    this.isRefreshing = true;
    this.alerteService.getAlertes().subscribe({
      next: (data) => {
        this.alertes = data;
        this.applyFilter();
        this.isRefreshing = false;
        if (notify) this.toast.info('Alertes actualisées.');
      },
      error: (err) => {
        console.error('Erreur lors du chargement des alertes', err);
        this.isRefreshing = false;
        this.toast.error('Erreur réseau — impossible de charger les alertes.');
      },
    });
  }

  /** Recharge sans recharger la page — le filtre courant est conservé. */
  refresh(): void { this.loadAlertes(true); }

  /** Une alerte est actionnable si elle référence un score ou un client. */
  hasTarget(alerte: Alerte): boolean {
    return alerte.scoreId != null || alerte.clientId != null;
  }

  /** Navigation contextuelle (4.5) :
   *  - alerte liée à un score → file de validation, score présélectionné
   *    (les scores déjà traités s'y affichent en lecture seule) ;
   *  - alerte liée à un client → fiche client.
   *  L'alerte non lue est marquée LUE au passage. */
  ouvrirAlerte(alerte: Alerte): void {
    if (alerte.statut === 'NON_LUE' && alerte.id) {
      this.alerteService.updateStatut(alerte.id, 'LUE').subscribe({
        next: () => { alerte.statut = 'LUE'; },
        error: () => { /* navigation prioritaire — le statut sera re-synchronisé au retour */ },
      });
    }
    if (alerte.scoreId != null) {
      this.router.navigate(['/scores/validation'], { queryParams: { scoreId: alerte.scoreId } });
    } else if (alerte.clientId != null) {
      this.router.navigate(['/clients', alerte.clientId]);
    }
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
          this.toast.success('Alerte marquée comme lue.');
        },
        error: (err) => {
          console.error('Erreur', err);
          this.toast.error("Échec de la mise à jour de l'alerte.");
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
          this.toast.success('Alerte marquée comme traitée.');
        },
        error: (err) => {
          console.error('Erreur', err);
          this.toast.error("Échec de la mise à jour de l'alerte.");
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
      case 'CRITIQUE': return 'danger';
      case 'ELEVEE':   return 'warning';
      case 'MOYENNE':  return 'info';
      default:         return 'success';
    }
  }

  formatCriticite(criticite: string): string {
    switch (criticite) {
      case 'CRITIQUE': return 'Critique';
      case 'ELEVEE':   return 'Élevée';
      case 'MOYENNE':  return 'Moyenne';
      case 'FAIBLE':   return 'Faible';
      default:         return criticite;
    }
  }

  formatStatut(statut: string): string {
    switch (statut) {
      case 'NON_LUE': return 'Non lue';
      case 'LUE':     return 'Lue';
      case 'TRAITEE': return 'Traitée';
      default:        return statut;
    }
  }

  formatType(type: string): string {
    switch (type) {
      case 'SCORE_ELEVE':           return 'Risque élevé';
      case 'DONNEES_INCOHERENTES':  return 'Données incohérentes';
      case 'VALIDATION_EN_ATTENTE': return 'Validation en attente';
      case 'SCORE_A_REVOIR':        return 'Score à revoir';
      case 'ANALYSE_EXPIREE':       return 'Analyse expirée';
      case 'SCORE_RECALCULE':       return 'Score recalculé';
      case 'DOCUMENTS_MANQUANTS':   return 'Documents manquants';
      case 'ENDETTEMENT_ELEVE':     return 'Endettement élevé';
      default:                      return type;
    }
  }
}
