import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { KpiCardComponent } from '../../shared/components/ui/kpi-card.component';
import { ChartCardComponent } from '../../shared/components/ui/chart-card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state.component';
import { TableCardComponent } from '../../shared/components/ui/table-card.component';
import { Periode } from '../../shared/components/ui/time-filter.component';
import { DashboardWidgetComponent } from '../../shared/components/ui/dashboard-widget.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardEvolutionService } from '../../core/services/dashboard-evolution.service';
import { ClientService } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { AlerteService } from '../../core/services/alerte.service';
import { ToastService } from '../../core/services/toast.service';
import { BRANDING } from '../../core/branding';
import { CategoryCount, DashboardData, DecisionPoint } from '../../core/models/dashboard.model';
import { Client } from '../../core/models/client.model';
import { User } from '../../core/models/user.model';

interface KpiCard {
  icon: string; tint: string; iconColor: string; label: string; value: number | string;
  link?: string; queryParams?: Record<string, unknown>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, SidebarComponent, BadgeComponent, IconComponent,
    PageHeaderComponent, KpiCardComponent, ChartCardComponent, EmptyStateComponent,
    TableCardComponent, DashboardWidgetComponent, AdminDashboardComponent,
  ],
  template: `
    <!-- L'administrateur a un tableau de bord dédié (utilisateurs / système). -->
    <app-admin-dashboard *ngIf="isAdmin"></app-admin-dashboard>

    <div class="layout" *ngIf="!isAdmin">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content" *ngIf="dashboardData as d">

          <div class="print-header">
            <div class="ph-brand">{{ brand.namePrimary }}<span>{{ brand.nameAccent }}</span></div>
            <div class="ph-meta">
              <div class="ph-title">{{ title }}</div>
              <div>{{ subtitle }}</div>
              <div>Généré le {{ now | date:'dd/MM/yyyy à HH:mm' }} — {{ getRoleLabel() }}</div>
            </div>
          </div>

          <app-page-header [title]="title" [subtitle]="subtitle">
            <a *ngIf="isSuperviseur" routerLink="/alertes" class="bell no-print"
               [attr.aria-label]="unreadAlertes + ' alerte(s) non lue(s)'" title="Alertes non lues">
              <app-icon name="notifications" [size]="20"></app-icon>
              <span class="bell-badge" *ngIf="unreadAlertes > 0">{{ unreadAlertes > 99 ? '99+' : unreadAlertes }}</span>
            </a>
            <button *ngIf="isSuperviseur" type="button" class="btn btn-secondary no-print" (click)="generateReport()">
              <app-icon name="description" [size]="18"></app-icon> Générer un rapport
            </button>
            <button type="button" class="btn btn-secondary no-print" (click)="refresh()"
                    [disabled]="isRefreshing" title="Recharger les données du tableau de bord">
              <app-icon name="refresh" [size]="18" [class.spin]="isRefreshing"></app-icon> Rafraîchir
            </button>
          </app-page-header>

          <!-- ── KPIs ── -->
          <div class="kpi-grid">
            <app-kpi-card *ngFor="let kpi of kpis"
              [icon]="kpi.icon" [tint]="kpi.tint" [iconColor]="kpi.iconColor"
              [label]="kpi.label" [value]="kpi.value"
              [link]="kpi.link" [queryParams]="kpi.queryParams"></app-kpi-card>
          </div>

          <!-- ══════════ CHARGÉ DE CLIENTÈLE ══════════ -->
          <div class="charts-grid" *ngIf="isConseiller">
            <app-chart-card title="Répartition par niveau de risque">
              <ng-container *ngTemplateOutlet="donut; context: { $implicit: d }"></ng-container>
            </app-chart-card>
            <app-chart-card title="Répartition par situation professionnelle">
              <ng-container *ngTemplateOutlet="hbars; context: { $implicit: d.repartitionSituationPro, nav: 'situation' }"></ng-container>
            </app-chart-card>
            <app-chart-card title="Répartition par tranche de revenus">
              <ng-container *ngTemplateOutlet="hbars; context: { $implicit: d.repartitionRevenus }"></ng-container>
            </app-chart-card>
            <app-chart-card title="Répartition par tranche d'âge">
              <ng-container *ngTemplateOutlet="vbars; context: { $implicit: d.repartitionAge }"></ng-container>
            </app-chart-card>
            <app-dashboard-widget title="Évolution du nombre de clients créés" [wide]="true"
                                  [loader]="loadClientsEvolution" [defaultPeriode]="'mois'">
              <ng-template let-data="data">
                <ng-container *ngTemplateOutlet="vbars; context: { $implicit: data }"></ng-container>
              </ng-template>
            </app-dashboard-widget>
          </div>

          <!-- ══════════ SUPERVISEUR ══════════ -->
          <div class="charts-grid" *ngIf="isSuperviseur">
            <app-chart-card title="Répartition par niveau de risque">
              <ng-container *ngTemplateOutlet="donut; context: { $implicit: d }"></ng-container>
            </app-chart-card>
            <app-chart-card title="Répartition des validations">
              <ng-container *ngTemplateOutlet="hbars; context: { $implicit: d.repartitionValidations, colored: true, nav: 'validation' }"></ng-container>
            </app-chart-card>
            <app-dashboard-widget title="Évolution des validations" [wide]="true"
                                  [loader]="loadValidations" [defaultPeriode]="'jour'">
              <ng-template let-data="data">
                <ng-container *ngTemplateOutlet="dualbars; context: { $implicit: data }"></ng-container>
              </ng-template>
            </app-dashboard-widget>
            <app-dashboard-widget title="Évolution des alertes" [wide]="true"
                                  [loader]="loadAlertes" [defaultPeriode]="'jour'">
              <ng-template let-data="data">
                <ng-container *ngTemplateOutlet="vbars; context: { $implicit: data, accent: 'var(--danger)' }"></ng-container>
              </ng-template>
            </app-dashboard-widget>
          </div>

          <!-- ══════════ ANALYSTE (analytique, lecture seule) ══════════ -->
          <div class="charts-grid" *ngIf="isAnalyste">
            <app-chart-card title="Répartition par niveau de risque">
              <ng-container *ngTemplateOutlet="donut; context: { $implicit: d }"></ng-container>
            </app-chart-card>
            <app-chart-card title="Répartition des validations">
              <ng-container *ngTemplateOutlet="hbars; context: { $implicit: d.repartitionValidations, colored: true, nav: 'validation' }"></ng-container>
            </app-chart-card>
            <app-dashboard-widget title="Volume des scores calculés" [wide]="true"
                                  [loader]="loadScores" [defaultPeriode]="'jour'">
              <ng-template let-data="data">
                <ng-container *ngTemplateOutlet="vbars; context: { $implicit: data, accent: 'var(--chart-1)' }"></ng-container>
              </ng-template>
            </app-dashboard-widget>
          </div>

          <!-- ── Table clients à haut risque (hors admin) ── -->
          <div class="section">
            <app-table-card title="Clients à haut risque" subtitle="Clients dont le dernier score indique un risque élevé">
              <a toolbar class="btn btn-sm btn-secondary no-print" routerLink="/clients" [queryParams]="{ risque: 'ELEVE' }">Voir tout</a>
              <table class="data-table" *ngIf="highRiskClients.length; else noHigh">
                <thead>
                  <tr><th>Client</th><th>Situation</th><th>Revenus</th><th>Score</th><th>Taux d'endettement</th><th class="no-print"></th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let c of highRiskClients">
                    <td class="strong">{{ c.prenom }} {{ c.nom }}</td>
                    <td>{{ formatSituationPro(c.situationPro) }}</td>
                    <td>{{ c.revenusMensuels | number:'1.0-0' }} DH</td>
                    <td><strong style="color:var(--danger)">{{ c.dernierScore?.valeurScore | number:'1.0-0' }}/100</strong></td>
                    <td>{{ (c.tauxEndettement || 0) | number:'1.0-1' }}%</td>
                    <td class="no-print"><a [routerLink]="'/clients/' + c.id" class="tlink">Détail</a></td>
                  </tr>
                </tbody>
              </table>
              <ng-template #noHigh><app-empty-state icon="verified" message="Aucun client à haut risque dans votre périmètre"></app-empty-state></ng-template>
            </app-table-card>
          </div>


        </div>
      </div>
    </div>

    <!-- ─────────── Templates de graphiques ─────────── -->
    <ng-template #donut let-d>
      <div class="donut-block">
        <div class="donut-chart" *ngIf="totalRisques > 0; else noRisk">
          <svg viewBox="0 0 200 200">
            <circle *ngFor="let s of donutSlices()" cx="100" cy="100" r="80" fill="none"
              [attr.stroke]="s.couleur" stroke-width="34" [attr.stroke-dasharray]="s.dash"
              [attr.stroke-dashoffset]="s.offset" transform="rotate(-90 100 100)"/>
            <text x="100" y="94" text-anchor="middle" class="donut-total">{{ totalRisques }}</text>
            <text x="100" y="116" text-anchor="middle" class="donut-sub">clients</text>
          </svg>
        </div>
        <ng-template #noRisk><app-empty-state message="Aucune donnée de risque"></app-empty-state></ng-template>
        <div class="legend">
          <div class="legend-item" *ngFor="let r of d.repartitionRisques || []">
            <span class="dot" [style.background]="r.couleur"></span>
            <span>{{ formatNiveau(r.niveau) }}</span>
            <strong>{{ r.count }}</strong>
          </div>
        </div>
      </div>
    </ng-template>

    <ng-template #hbars let-list let-colored="colored" let-nav="nav">
      <div class="hbars" *ngIf="totalOf(list) > 0; else noData">
        <div class="hbar-row" [class.clickable]="nav" *ngFor="let item of list; let i = index" (click)="nav && navBar(nav, item.label)">
          <span class="hbar-label">{{ item.label }}</span>
          <div class="hbar-track">
            <div class="hbar-fill" [style.width.%]="barPct(item.count, maxOf(list))"
                 [style.background]="colored ? validationColor(item.label) : palette[i % palette.length]"></div>
          </div>
          <span class="hbar-value">{{ item.count }}</span>
        </div>
      </div>
      <ng-template #noData><app-empty-state message="Aucune donnée"></app-empty-state></ng-template>
    </ng-template>

    <ng-template #vbars let-list let-accent="accent">
      <div class="vbars">
        <div class="vbar-col" *ngFor="let item of list">
          <span class="vbar-value" [class.muted]="item.count === 0">{{ item.count }}</span>
          <div class="vbar-track"><div class="vbar-fill" [style.background]="accent || 'var(--chart-1)'" [style.height.%]="vbarPct(item.count, maxOf(list))"></div></div>
          <span class="vbar-label">{{ item.label }}</span>
        </div>
      </div>
    </ng-template>

    <ng-template #dualbars let-points>
      <div class="legend-inline">
        <span class="legend-item"><span class="dot" style="background:var(--success)"></span>Validés</span>
        <span class="legend-item"><span class="dot" style="background:var(--danger)"></span>Rejetés</span>
      </div>
      <div class="dual-chart" *ngIf="evolutionMax(points) > 0; else noEvo">
        <div class="dual-col" *ngFor="let p of points">
          <div class="dual-pair">
            <div class="vbar-track sm">
              <div class="vbar-fill" style="background:var(--success)"
                   [style.height.%]="vbarPct(p.valides, evolutionMax(points))" [title]="p.valides + ' validé(s)'"></div>
            </div>
            <div class="vbar-track sm">
              <div class="vbar-fill" style="background:var(--danger)"
                   [style.height.%]="vbarPct(p.rejetes, evolutionMax(points))" [title]="p.rejetes + ' rejeté(s)'"></div>
            </div>
          </div>
          <span class="vbar-label">{{ p.periode }}</span>
        </div>
      </div>
      <ng-template #noEvo><app-empty-state message="Aucune décision sur la période"></app-empty-state></ng-template>
    </ng-template>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1320px; margin: 0 auto; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-5); margin-bottom: var(--space-7); }
    .charts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-6); }
    .section { margin-top: var(--space-6); }

    .donut-block { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
    .donut-chart { flex-shrink: 0; }
    .donut-chart svg { width: 180px; height: 180px; }
    .donut-total { font-family: var(--font-display); font-weight: 700; font-size: 34px; fill: var(--ink-900); }
    .donut-sub { font-family: var(--font-body); font-size: 13px; fill: var(--ink-500); }
    .legend { display: flex; flex-direction: column; gap: 12px; flex: 1; min-width: 160px; }
    .legend-item { display: flex; align-items: center; gap: 10px; font-size: 14px; font-family: var(--font-body); color: var(--ink-700); }
    .legend-item strong { margin-left: auto; color: var(--ink-900); font-family: var(--font-display); }
    .dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
    .legend-inline { display: flex; gap: 20px; margin: -8px 0 18px 0; }
    .legend-inline .legend-item { font-size: 13px; }

    .hbars { display: flex; flex-direction: column; gap: 16px; }
    .hbar-row { display: grid; grid-template-columns: 150px 1fr 36px; align-items: center; gap: 14px; }
    .hbar-row.clickable { cursor: pointer; padding: 4px 6px; margin: -4px -6px; border-radius: var(--radius-sm); transition: background var(--transition); }
    .hbar-row.clickable:hover { background: var(--surface-2); }
    .hbar-label { font-size: 13px; color: var(--ink-700); font-family: var(--font-body); }
    .hbar-track { height: 12px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
    .hbar-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease; }
    .hbar-value { font-size: 14px; font-weight: 700; color: var(--ink-900); text-align: right; font-family: var(--font-display); }

    .vbars { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; height: 200px; }
    .vbar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; gap: 8px; }
    .vbar-value { font-size: 13px; font-weight: 700; color: var(--ink-900); font-family: var(--font-display); }
    .vbar-value.muted { color: var(--ink-300); }
    .vbar-track { flex: 1; width: 60%; max-width: 46px; background: var(--surface-2); border-radius: 8px 8px 4px 4px; display: flex; align-items: flex-end; overflow: hidden; }
    .vbar-track.sm { width: 16px; flex: 0 0 16px; height: 100%; }
    .vbar-fill { width: 100%; border-radius: 8px 8px 4px 4px; transition: height 0.5s ease; }
    .vbar-label { font-size: 11px; color: var(--ink-500); font-family: var(--font-body); white-space: nowrap; }

    .dual-chart { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; height: 200px; }
    .dual-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; gap: 8px; }
    .dual-pair { flex: 1; display: flex; align-items: flex-end; gap: 3px; }

    .alerts-list { display: flex; flex-direction: column; gap: 12px; }
    .alert-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px; background: var(--surface-2); border-radius: 10px; }
    .alert-content { flex: 1; min-width: 0; }
    .alert-type { font-size: 13px; font-weight: 600; color: var(--ink-900); margin: 0 0 4px 0; font-family: var(--font-body); }
    .alert-desc { font-size: 12px; color: var(--ink-500); margin: 0; font-family: var(--font-body); }

    .data-table .strong { font-weight: 600; color: var(--ink-900); }
    .tlink { color: var(--info); font-weight: 500; font-size: 13px; }

    .bell { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--ink-700); text-decoration: none; transition: all var(--transition); }
    .bell:hover { border-color: var(--sal-orange); color: var(--sal-orange); }
    .bell-badge { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--danger); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px var(--surface); }
    .spin { animation: db-spin 1s linear infinite; }
    @keyframes db-spin { to { transform: rotate(360deg); } }

    .quick-actions h3 { margin: 0 0 var(--space-4) 0; font-size: 16px; font-weight: 600; color: var(--ink-900); font-family: var(--font-display); }
    .qa-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); }
    .qa-btn { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--ink-700); font-size: 14px; font-weight: 600; font-family: var(--font-body); cursor: pointer; text-decoration: none; transition: all var(--transition); }
    .qa-btn:hover { border-color: var(--sal-orange); color: var(--sal-orange); box-shadow: var(--shadow-sm); }
    .qa-btn app-icon { color: var(--sal-orange); }

    .print-header { display: none; }
    .print-header .ph-brand { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: var(--ink-900); }
    .print-header .ph-brand span { color: var(--sal-orange); }
    .print-header .ph-meta { font-size: 12px; color: var(--ink-500); margin-top: 4px; }
    .print-header .ph-title { font-weight: 600; color: var(--ink-900); font-size: 14px; }

    @media (max-width: 1024px) { .charts-grid { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } .hbar-row { grid-template-columns: 110px 1fr 30px; } }
    @media print {
      /* Forcer l'impression des fonds/couleurs : sinon les barres (background CSS)
         et les teintes des KPI ressortent vides. Le donut (SVG stroke) s'imprime déjà. */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      app-sidebar { display: none !important; }
      .main-content { margin-left: 0 !important; }
      .content { max-width: none; padding: 0; }
      .no-print { display: none !important; }
      .print-header { display: block !important; border-bottom: 2px solid var(--sal-orange); padding-bottom: 12px; margin-bottom: 20px; }
      .charts-grid { display: block; }
      .charts-grid > * { margin-bottom: 16px; }
      app-kpi-card, app-chart-card, app-table-card, .card { break-inside: avoid; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  user: User | null = null;
  highRiskClients: Client[] = [];
  unreadAlertes = 0;
  now = new Date();

  readonly palette = ['#1A6FD4', '#E8621A', '#2D9C6A', '#9B59B6', '#E8A91A'];

  // Chargeurs par widget (période indépendante, rafraîchissement isolé).
  readonly loadValidations = (p: Periode) => this.evoService.validations(p);
  readonly loadScores = (p: Periode) => this.evoService.scores(p);
  readonly loadAlertes = (p: Periode) => this.evoService.alertes(p);
  readonly loadClientsEvolution = (p: Periode) => this.evoService.clients(p);

  isRefreshing = false;
  readonly brand = BRANDING;

  constructor(
    private dashboardService: DashboardService,
    private evoService: DashboardEvolutionService,
    private clientService: ClientService,
    private authService: AuthService,
    private alerteService: AlerteService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    if (this.isAdmin) return; // l'admin utilise app-admin-dashboard
    this.loadDashboardData();
    this.loadHighRiskClients();
    if (this.isSuperviseur) this.loadAlerteBadge();
  }

  /** Recharge les données du tableau de bord sans recharger l'application. */
  refresh(): void {
    this.isRefreshing = true;
    this.loadDashboardData(() => {
      this.isRefreshing = false;
      this.toast.info('Tableau de bord actualisé.');
    });
    this.loadHighRiskClients();
    if (this.isSuperviseur) this.loadAlerteBadge();
  }

  loadAlerteBadge(): void {
    this.alerteService.getAlerteSummary().subscribe({
      next: (s) => { this.unreadAlertes = s?.nonLues ?? 0; },
      error: () => { this.unreadAlertes = 0; },
    });
  }

  loadDashboardData(done?: () => void): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => { this.dashboardData = data; done?.(); },
      error: (err) => {
        console.error('Erreur lors du chargement du dashboard', err);
        this.isRefreshing = false;
        this.toast.error('Erreur réseau — impossible de charger le tableau de bord.');
      },
    });
  }

  loadHighRiskClients(): void {
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.highRiskClients = clients
          .filter(c => c.dernierScore?.niveauRisque === 'ELEVE')
          .sort((a, b) => (b.dernierScore?.valeurScore ?? 0) - (a.dernierScore?.valeurScore ?? 0))
          .slice(0, 8);
      },
      error: () => { this.highRiskClients = []; },
    });
  }

  // ── Rôles ────────────────────────────────────────────────────────────
  get isConseiller(): boolean { return this.user?.role === 'CHARGE_CLIENTELE'; }
  get isSuperviseur(): boolean { return this.user?.role === 'SUPERVISEUR'; }
  get isAnalyste(): boolean { return this.user?.role === 'ANALYSTE'; }
  get isAdmin(): boolean { return this.user?.role === 'ADMINISTRATEUR'; }

  getRoleLabel(): string {
    const labels: Record<string, string> = {
      CHARGE_CLIENTELE: 'Chargé de clientèle', ANALYSTE: 'Analyste', SUPERVISEUR: 'Superviseur', ADMINISTRATEUR: 'Administrateur',
    };
    return labels[this.user?.role || ''] || '';
  }

  get title(): string {
    switch (this.user?.role) {
      case 'CHARGE_CLIENTELE': return 'Mon portefeuille';
      case 'ANALYSTE':         return 'Tableau de bord — Analyse';
      default:                 return 'Tableau de bord';
    }
  }
  get subtitle(): string {
    switch (this.user?.role) {
      case 'CHARGE_CLIENTELE': return 'Vue d’ensemble de vos clients et de leurs scores';
      case 'ANALYSTE':         return 'Analyse des risques et des scores du portefeuille';
      default:                 return 'Pilotage des validations et des risques';
    }
  }

  // ── Valeurs dérivées ─────────────────────────────────────────────────
  get nouveauxClientsCeMois(): number {
    const list = this.dashboardData?.clientsParMois || [];
    return list.length ? list[list.length - 1].count : 0;
  }
  get validationTotals(): { valides: number; rejetes: number; enAttente: number } {
    const list = this.dashboardData?.repartitionValidations || [];
    const find = (l: string) => list.find(x => x.label === l)?.count ?? 0;
    return { valides: find('Validés'), rejetes: find('Rejetés'), enAttente: find('En attente') };
  }
  get tauxValidation(): number {
    const { valides, rejetes } = this.validationTotals;
    const decided = valides + rejetes;
    return decided === 0 ? 0 : Math.round((valides / decided) * 100);
  }

  /**
   * KPIs par rôle. Clickabilité : les KPIs mènent à des données navigables.
   * "Taux de validation" reste informatif (non cliquable). Les KPIs de validation
   * (Décisions en attente / Validés / Rejetés) pointent vers la page Scores filtrée
   * par statut — et non vers "Valider Scores" (page d'action superviseur).
   */
  get kpis(): KpiCard[] {
    const d = this.dashboardData;
    if (!d) return [];
    switch (this.user?.role) {
      case 'CHARGE_CLIENTELE':
        return [
          { icon: 'group',           tint: 'var(--info-tint)',    iconColor: 'var(--info)',    label: 'Total clients',            value: d.mesClients ?? 0,        link: '/clients' },
          { icon: 'hourglass_empty', tint: 'var(--warning-tint)', iconColor: 'var(--warning)', label: 'En attente de scoring',    value: d.mesScoresEnAttente ?? 0, link: '/clients', queryParams: { statut: 'EN_ATTENTE' } },
          { icon: 'warning',         tint: 'var(--danger-tint)',  iconColor: 'var(--danger)',  label: 'Clients à haut risque',    value: d.clientsEleveRisque ?? 0, link: '/clients', queryParams: { risque: 'ELEVE' } },
          { icon: 'person_add',      tint: 'var(--success-tint)', iconColor: 'var(--success)', label: 'Nouveaux clients ce mois', value: this.nouveauxClientsCeMois, link: '/clients', queryParams: { periode: 'mois' } },
        ];
      case 'ANALYSTE':
        return [
          { icon: 'group',  tint: 'var(--info-tint)',    iconColor: 'var(--info)',    label: 'Total clients',  value: d.totalClients ?? 0,        link: '/clients' },
          { icon: 'shield', tint: 'var(--success-tint)', iconColor: 'var(--success)', label: 'Risque faible',  value: d.clientsFaibleRisque ?? 0, link: '/clients', queryParams: { risque: 'FAIBLE' } },
          { icon: 'remove', tint: 'var(--warning-tint)', iconColor: 'var(--warning)', label: 'Risque moyen',   value: d.clientsMoyenRisque ?? 0,  link: '/clients', queryParams: { risque: 'MOYEN' } },
          { icon: 'warning', tint: 'var(--danger-tint)', iconColor: 'var(--danger)',  label: 'Risque élevé',   value: d.clientsEleveRisque ?? 0,  link: '/clients', queryParams: { risque: 'ELEVE' } },
        ];
      default: // SUPERVISEUR — KPIs opérationnels : charge de validation + risque à traiter
        return [
          { icon: 'hourglass_empty', tint: 'var(--warning-tint)', iconColor: 'var(--warning)', label: 'Décisions en attente',  value: d.decisionsEnAttente ?? 0, link: '/scores', queryParams: { statut: 'EN_ATTENTE' } },
          { icon: 'refresh',         tint: 'var(--info-tint)',    iconColor: 'var(--info)',    label: 'Recalculs à valider', value: d.scoresRecalculesEnAttente ?? 0, link: '/scores', queryParams: { statut: 'EN_ATTENTE' } },
          { icon: 'warning',         tint: 'var(--danger-tint)',  iconColor: 'var(--danger)',  label: 'Clients à haut risque', value: d.clientsEleveRisque ?? 0, link: '/clients', queryParams: { risque: 'ELEVE' } },
          { icon: 'percent',         tint: 'var(--info-tint)',    iconColor: 'var(--info)',    label: 'Taux de validation',    value: this.tauxValidation + '%' },
        ];
    }
  }

  // ── Navigation depuis les graphiques (uniquement données navigables) ──
  navBar(nav: string, label: string): void {
    if (nav === 'situation') {
      const code = this.situationCode(label);
      if (code) this.router.navigate(['/clients'], { queryParams: { situation: code } });
    } else if (nav === 'validation') {
      const statut = this.validationStatut(label);
      if (statut) this.router.navigate(['/scores'], { queryParams: { statut } });
    }
  }
  private situationCode(label: string): string {
    switch (label) {
      case 'CDI': return 'CDI';
      case 'CDD': return 'CDD';
      case 'Indépendant': return 'INDEPENDANT';
      case 'Sans emploi': return 'SANS_EMPLOI';
      default: return '';
    }
  }
  private validationStatut(label: string): string {
    switch (label) {
      case 'Validés':    return 'VALIDE';
      case 'Rejetés':    return 'REJETE';
      case 'En attente': return 'EN_ATTENTE';
      default:           return '';
    }
  }

  generateReport(): void { this.now = new Date(); setTimeout(() => window.print(), 150); }

  // ── Donut ─────────────────────────────────────────────────────────────
  get totalRisques(): number {
    return (this.dashboardData?.repartitionRisques || []).reduce((sum, r) => sum + r.count, 0);
  }
  donutSlices(): { couleur: string; dash: string; offset: number }[] {
    const C = 2 * Math.PI * 80;
    const total = this.totalRisques;
    const slices: { couleur: string; dash: string; offset: number }[] = [];
    if (total === 0) return slices;
    let cumul = 0;
    for (const r of this.dashboardData?.repartitionRisques || []) {
      const len = (r.count / total) * C;
      slices.push({ couleur: r.couleur, dash: `${len} ${C - len}`, offset: -cumul });
      cumul += len;
    }
    return slices;
  }

  // ── Helpers barres ────────────────────────────────────────────────────
  totalOf(list: CategoryCount[] | undefined): number { return (list || []).reduce((s, x) => s + x.count, 0); }
  maxOf(list: CategoryCount[] | undefined): number { return Math.max(...(list || []).map(x => x.count), 1); }
  barPct(count: number, max: number): number { return count === 0 ? 0 : Math.max(4, Math.round((count / max) * 100)); }
  vbarPct(count: number, max: number): number { return count === 0 ? 0 : Math.max(6, Math.round((count / max) * 100)); }
  evolutionMax(points: DecisionPoint[] | undefined): number { return Math.max(...(points || []).flatMap(p => [p.valides, p.rejetes]), 1); }
  validationColor(label: string): string {
    switch (label) {
      case 'Validés':    return '#2D9C6A';
      case 'Rejetés':    return '#D94040';
      case 'En attente': return '#E8621A';
      default:           return '#1A6FD4';
    }
  }

  // ── Formatage ─────────────────────────────────────────────────────────
  formatNiveau(niveau: string): string {
    switch (niveau) { case 'FAIBLE': return 'Faible'; case 'MOYEN': return 'Moyen'; case 'ELEVE': return 'Élevé'; default: return niveau; }
  }
  formatSituationPro(s: string): string {
    switch (s) { case 'CDI': return 'Salarié (CDI)'; case 'CDD': return 'Salarié (CDD)'; case 'INDEPENDANT': return 'Indépendant'; case 'SANS_EMPLOI': return 'Sans emploi'; default: return s; }
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
  getBadgeVariant(criticite: string): 'danger' | 'warning' | 'info' | 'success' {
    switch (criticite) { case 'CRITIQUE': return 'danger'; case 'ELEVEE': return 'warning'; case 'MOYENNE': return 'info'; default: return 'success'; }
  }
}
