import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { IconButtonComponent } from '../../shared/components/ui/icon-button.component';
import { AlerteService } from '../../core/services/alerte.service';
import { ToastService } from '../../core/services/toast.service';
import { Alerte } from '../../core/models/alerte.model';

@Component({
  selector: 'app-alertes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, BadgeComponent, IconComponent, IconButtonComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">        <div class="content">
          <h2>Alertes Clients</h2>

          <div class="filters">
            <button (click)="filterStatut('A_TRAITER')" [class.active]="filtreStatut === 'A_TRAITER'" class="filter-btn">
              À traiter ({{ countATraiter() }})
            </button>
            <button (click)="filterStatut('TRAITEE')" [class.active]="filtreStatut === 'TRAITEE'" class="filter-btn">
              Traitées ({{ getCountByStatus('TRAITEE') }})
            </button>
            <button (click)="filterStatut('all')" [class.active]="filtreStatut === 'all'" class="filter-btn">
              Toutes ({{ getTotalCount() }})
            </button>
            <div class="date-filter">
              <label>Du <input type="date" [(ngModel)]="dateFrom" (ngModelChange)="onDateChange()" /></label>
              <label>Au <input type="date" [(ngModel)]="dateTo" (ngModelChange)="onDateChange()" /></label>
              <button *ngIf="dateFrom || dateTo" type="button" class="clear-dates" (click)="clearDates()"
                      title="Effacer les dates">✕</button>
            </div>
            <app-icon-button icon="refresh" tooltip="Rafraîchir" [loading]="isRefreshing"
                             (clicked)="refresh()"></app-icon-button>
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
                <!-- Toute la ligne est cliquable : « ouvrir » l'alerte la marque lue
                     automatiquement (et navigue vers l'objet concerné si applicable). -->
                <tr *ngFor="let alerte of pagedAlertes" [class.non-lue]="alerte.statut === 'NON_LUE'"
                    class="alerte-row" (click)="openAlerte(alerte)"
                    [title]="hasTarget(alerte) ? 'Ouvrir l’élément concerné' : 'Marquer comme lue'">
                  <td>
                    <app-badge
                      [label]="formatCriticite(alerte.criticite)"
                      [variant]="getBadgeVariant(alerte.criticite)"
                    ></app-badge>
                  </td>
                  <td>{{ formatType(alerte.typeAlerte) }}</td>
                  <td class="description">
                    {{ alerte.description }}
                    <app-icon *ngIf="hasTarget(alerte)" name="open_in_new" [size]="14" class="desc-open"></app-icon>
                  </td>
                  <td>{{ formatStatut(alerte.statut) }}</td>
                  <td>{{ alerte.createdAt | date:'short' }}</td>
                  <td>
                    <div class="actions">
                      <!-- Seule action explicite : résoudre. Le « lu » est automatique. -->
                      <button
                        *ngIf="alerte.statut !== 'TRAITEE'"
                        (click)="marquerTraitee(alerte); $event.stopPropagation()"
                        class="action-btn"
                        title="Marquer comme traitée (résolue)"
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

          <!-- Pagination -->
          <div class="pagination" *ngIf="totalPages > 1">
            <button type="button" (click)="goToPage(page - 1)" [disabled]="page === 0">‹ Précédent</button>
            <span class="page-info">
              Page {{ page + 1 }} / {{ totalPages }}
              <span class="muted">({{ filteredAlertes.length }} alerte(s))</span>
            </span>
            <button type="button" (click)="goToPage(page + 1)" [disabled]="page >= totalPages - 1">Suivant ›</button>
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
      align-items: center;
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

    /* Alerte non lue : fond ambré + liseré orange à gauche (visible), comme une
       notification non consultée. Disparaît à la prochaine ouverture de la page. */
    tr.non-lue {
      background: #FFF4E0;
      box-shadow: inset 3px 0 0 0 #E8621A;
    }
    tr.non-lue:hover { background: #FFEFD3; }

    tr.non-lue td {
      font-weight: 600;
    }
    tr.non-lue td:first-child { position: relative; }

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

    .date-filter { margin-left: auto; display: inline-flex; align-items: center; gap: 10px; }
    .date-filter label { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #666; font-family: 'DM Sans', sans-serif; }
    .date-filter input { padding: 6px 8px; border: 1px solid #E5E5EA; border-radius: 6px; font-size: 12px; font-family: 'DM Sans', sans-serif; color: #1A1A2E; }
    .clear-dates { width: 26px; height: 26px; border-radius: 6px; border: 1px solid #E5E5EA; background: #fff; color: #888; cursor: pointer; font-size: 12px; }
    .clear-dates:hover { background: #F5F5F7; color: #D94040; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 18px; font-family: 'DM Sans', sans-serif; }
    .pagination button { padding: 7px 14px; border: 1px solid #E5E5EA; border-radius: 6px; background: #fff; color: #1A1A2E; font-size: 13px; font-weight: 600; cursor: pointer; }
    .pagination button:hover:not(:disabled) { background: #F5F5F7; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { font-size: 13px; color: #666; }
    .page-info .muted { color: #aaa; }

    .alerte-row { cursor: pointer; transition: background 0.12s; }
    .alerte-row:hover td { background: #F8F9FA; }
    .desc-open { color: #1A6FD4; vertical-align: middle; margin-left: 4px; opacity: 0.7; }
  `]
})
export class AlertesComponent implements OnInit {
  alertes: Alerte[] = [];
  filteredAlertes: Alerte[] = [];
  pagedAlertes: Alerte[] = [];
  filtreStatut: 'A_TRAITER' | 'TRAITEE' | 'all' = 'A_TRAITER';
  dateFrom = '';
  dateTo = '';
  page = 0;
  readonly pageSize = 10;
  isRefreshing = false;

  get totalPages(): number { return Math.ceil(this.filteredAlertes.length / this.pageSize); }

  constructor(
    private alerteService: AlerteService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    // Restaure le contexte (filtre / dates / page) depuis l'URL — préservé au retour (#2).
    const p = this.route.snapshot.queryParamMap;
    const f = p.get('filtre');
    if (f === 'A_TRAITER' || f === 'TRAITEE' || f === 'all') this.filtreStatut = f;
    this.dateFrom = p.get('du') || '';
    this.dateTo = p.get('au') || '';
    this.page = Math.max(0, Number(p.get('page')) || 0);
    this.loadAlertes();
  }

  /** Écrit le contexte courant dans l'URL (replaceUrl) pour qu'un « Retour » le restaure. */
  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        filtre: this.filtreStatut !== 'A_TRAITER' ? this.filtreStatut : null,
        du: this.dateFrom || null,
        au: this.dateTo || null,
        page: this.page > 0 ? this.page : null,
      },
      replaceUrl: true,
    });
  }

  loadAlertes(notify = false): void {
    this.isRefreshing = true;
    this.alerteService.getAlertes().subscribe({
      next: (data) => {
        // Tri par défaut : plus récentes en premier ; une nouvelle alerte apparaît en tête.
        this.alertes = [...data].sort((a, b) => this.ts(b.createdAt) - this.ts(a.createdAt));
        this.applyFilter();
        this.isRefreshing = false;
        if (notify) this.toast.info('Alertes actualisées.');
        // Note : l'ouverture de la page ne marque PAS les alertes comme lues.
        // Une alerte devient LUE uniquement quand l'utilisateur l'ouvre/clique
        // (openAlerte), comme dans un système de notifications (LinkedIn, Outlook…).
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

  /** Horodatage (ms) d'une alerte pour le tri ; 0 si date absente. */
  private ts(v?: string): number {
    return v ? new Date(v).getTime() : 0;
  }

  /** Une alerte est actionnable si elle référence un score ou un client. */
  hasTarget(alerte: Alerte): boolean {
    return alerte.scoreId != null || alerte.clientId != null;
  }

  /** Navigation contextuelle (4.5) :
   *  - alerte liée à un score → file de validation, score présélectionné
   *    (les scores déjà traités s'y affichent en lecture seule) ;
   *  - alerte liée à un client → fiche client.
   *  L'alerte non lue est marquée LUE au passage. */
  openAlerte(alerte: Alerte): void {
    // #4 : « ouvrir » marque automatiquement l'alerte comme lue (comportement notification).
    if (alerte.statut === 'NON_LUE' && alerte.id) {
      this.alerteService.updateStatut(alerte.id, 'LUE').subscribe({
        next: () => { alerte.statut = 'LUE'; if (!this.hasTarget(alerte)) this.applyFilter(); },
        error: () => { /* navigation prioritaire — le statut sera re-synchronisé au retour */ },
      });
    }
    if (alerte.scoreId != null) {
      this.router.navigate(['/scores/validation'], { queryParams: { scoreId: alerte.scoreId } });
    } else if (alerte.clientId != null) {
      this.router.navigate(['/clients', alerte.clientId]);
    }
  }

  filterStatut(statut: 'A_TRAITER' | 'TRAITEE' | 'all'): void {
    this.filtreStatut = statut;
    this.page = 0;
    this.applyFilter();
    this.syncUrl();
  }

  /** Nombre d'alertes non résolues (à traiter). */
  countATraiter(): number {
    return this.alertes.filter((a) => a.statut !== 'TRAITEE').length;
  }

  onDateChange(): void {
    this.page = 0;
    this.applyFilter();
    this.syncUrl();
  }

  clearDates(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.onDateChange();
  }

  goToPage(p: number): void {
    this.page = Math.max(0, Math.min(p, this.totalPages - 1));
    this.updatePaged();
    this.syncUrl();
  }

  applyFilter(): void {
    let list = this.alertes;
    // « À traiter » = non résolues (NON_LUE ou LUE) ; « Traitées » = résolues.
    if (this.filtreStatut === 'A_TRAITER') {
      list = list.filter((a) => a.statut !== 'TRAITEE');
    } else if (this.filtreStatut === 'TRAITEE') {
      list = list.filter((a) => a.statut === 'TRAITEE');
    }
    // Filtre par plage de dates (inclusif ; borne haute = fin de journée)
    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      list = list.filter((a) => a.createdAt && new Date(a.createdAt).getTime() >= from);
    }
    if (this.dateTo) {
      const to = new Date(this.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      list = list.filter((a) => a.createdAt && new Date(a.createdAt).getTime() <= to);
    }
    this.filteredAlertes = list;
    // Conserve la page courante si elle reste valide (restauration depuis l'URL) ;
    // sinon revient sur la dernière page disponible.
    if (this.page >= this.totalPages) this.page = Math.max(0, this.totalPages - 1);
    this.updatePaged();
  }

  private updatePaged(): void {
    const start = this.page * this.pageSize;
    this.pagedAlertes = this.filteredAlertes.slice(start, start + this.pageSize);
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
