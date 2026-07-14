import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { KpiCardComponent } from '../../shared/components/ui/kpi-card.component';
import { ChartCardComponent } from '../../shared/components/ui/chart-card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state.component';
import { TableCardComponent } from '../../shared/components/ui/table-card.component';
import { TimeFilterComponent, Periode } from '../../shared/components/ui/time-filter.component';
import { UserService } from '../../core/services/user.service';
import { AuditLogService } from '../../core/services/audit-log.service';
import { DashboardPeriodService } from '../../core/services/dashboard-period.service';
import { bucketCategory, Cat } from '../../core/utils/chart-aggregation';
import { User } from '../../core/models/user.model';
import { AuditLog } from '../../core/models/audit-log.model';
import { BRANDING } from '../../core/branding';

interface KpiCard { icon: string; tint: string; iconColor: string; label: string; value: number | string; link?: string; }

/** Tableau de bord administrateur : centré utilisateurs / système (pas d'opérationnel métier). */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, SidebarComponent, BadgeComponent,
    PageHeaderComponent, KpiCardComponent, ChartCardComponent, EmptyStateComponent,
    TableCardComponent, TimeFilterComponent,
  ],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <div class="print-header">
            <div class="ph-brand">{{ brand.namePrimary }}<span>{{ brand.nameAccent }}</span></div>
            <div class="ph-meta">
              <div class="ph-title">Tableau de bord — Administration</div>
              <div>Généré le {{ now | date:'dd/MM/yyyy à HH:mm' }} — Administrateur</div>
            </div>
          </div>

          <app-page-header title="Tableau de bord — Administration"
                           subtitle="Supervision des utilisateurs et de l’activité du système">
          </app-page-header>

          <!-- KPIs -->
          <div class="kpi-grid">
            <app-kpi-card *ngFor="let kpi of kpis"
              [icon]="kpi.icon" [tint]="kpi.tint" [iconColor]="kpi.iconColor"
              [label]="kpi.label" [value]="kpi.value" [link]="kpi.link"></app-kpi-card>
          </div>

          <!-- Charts -->
          <div class="charts-grid">
            <app-chart-card title="Utilisateurs par rôle">
              <ng-container *ngTemplateOutlet="hbars; context: { $implicit: usersByRole }"></ng-container>
            </app-chart-card>

            <app-chart-card title="Activité d’audit récente" [subtitle]="periodeLabel">
              <app-time-filter actions [value]="periode" (valueChange)="setPeriode($event)"></app-time-filter>
              <ng-container *ngTemplateOutlet="vbars; context: { $implicit: auditActivityView, accent: 'var(--chart-4)' }"></ng-container>
            </app-chart-card>

            <app-chart-card title="Création de comptes utilisateurs" [wide]="true" [subtitle]="periodeLabel">
              <app-time-filter actions [value]="periode" (valueChange)="setPeriode($event)"></app-time-filter>
              <ng-container *ngTemplateOutlet="vbars; context: { $implicit: creationView, accent: 'var(--chart-1)' }"></ng-container>
            </app-chart-card>
          </div>

          <!-- Tables -->
          <div class="section">
            <app-table-card title="Utilisateurs récemment créés">
              <a toolbar class="btn btn-sm btn-secondary no-print" routerLink="/admin/utilisateurs">Gérer</a>
              <table class="data-table" *ngIf="recentUsers.length; else noUsers">
                <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Créé le</th></tr></thead>
                <tbody>
                  <tr *ngFor="let u of recentUsers">
                    <td class="strong">{{ u.prenom }} {{ u.nom }}</td>
                    <td>{{ u.email }}</td>
                    <td><app-badge [label]="roleLabel(u.role)" variant="info"></app-badge></td>
                    <td><app-badge [label]="u.actif ? 'Actif' : 'Désactivé'" [variant]="u.actif ? 'success' : 'neutral'"></app-badge></td>
                    <td>{{ created(u) ? (created(u) | date:'dd/MM/yyyy') : '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <ng-template #noUsers><app-empty-state icon="group" message="Aucun utilisateur"></app-empty-state></ng-template>
            </app-table-card>
          </div>

          <div class="section">
            <app-table-card title="Événements d’audit récents">
              <a toolbar class="btn btn-sm btn-secondary no-print" routerLink="/admin/audit-logs">Voir tout</a>
              <table class="data-table" *ngIf="recentAudit.length; else noAudit">
                <thead><tr><th>Action</th><th>Ressource</th><th>Utilisateur</th><th>Date</th></tr></thead>
                <tbody>
                  <tr *ngFor="let a of recentAudit">
                    <td class="strong">{{ a.action }}</td>
                    <td>{{ a.entite || '—' }}<span class="muted" *ngIf="a.entiteId"> #{{ a.entiteId }}</span></td>
                    <td>{{ auditUser(a) }}</td>
                    <td>{{ a.createdAt ? (a.createdAt | date:'dd/MM/yyyy HH:mm') : '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <ng-template #noAudit><app-empty-state icon="history" message="Aucun événement d’audit"></app-empty-state></ng-template>
            </app-table-card>
          </div>

        </div>
      </div>
    </div>

    <ng-template #hbars let-list>
      <div class="hbars" *ngIf="totalOf(list) > 0; else noData">
        <div class="hbar-row" *ngFor="let item of list; let i = index">
          <span class="hbar-label">{{ item.label }}</span>
          <div class="hbar-track"><div class="hbar-fill" [style.width.%]="barPct(item.count, maxOf(list))" [style.background]="palette[i % palette.length]"></div></div>
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
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1320px; margin: 0 auto; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-5); margin-bottom: var(--space-7); }
    .charts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-6); }
    .section { margin-top: var(--space-6); }

    .hbars { display: flex; flex-direction: column; gap: 16px; }
    .hbar-row { display: grid; grid-template-columns: 160px 1fr 36px; align-items: center; gap: 14px; }
    .hbar-label { font-size: 13px; color: var(--ink-700); font-family: var(--font-body); }
    .hbar-track { height: 12px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
    .hbar-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease; }
    .hbar-value { font-size: 14px; font-weight: 700; color: var(--ink-900); text-align: right; font-family: var(--font-display); }

    .vbars { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; height: 200px; }
    .vbar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; gap: 8px; }
    .vbar-value { font-size: 13px; font-weight: 700; color: var(--ink-900); font-family: var(--font-display); }
    .vbar-value.muted { color: var(--ink-300); }
    .vbar-track { flex: 1; width: 60%; max-width: 46px; background: var(--surface-2); border-radius: 8px 8px 4px 4px; display: flex; align-items: flex-end; overflow: hidden; }
    .vbar-fill { width: 100%; border-radius: 8px 8px 4px 4px; transition: height 0.5s ease; }
    .vbar-label { font-size: 11px; color: var(--ink-500); font-family: var(--font-body); white-space: nowrap; }

    .data-table .strong { font-weight: 600; color: var(--ink-900); }
    .data-table .muted { color: var(--ink-500); }

    .print-header { display: none; }
    .print-header .ph-brand { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: var(--ink-900); }
    .print-header .ph-brand span { color: var(--sal-orange); }
    .print-header .ph-meta { font-size: 12px; color: var(--ink-500); margin-top: 4px; }
    .print-header .ph-title { font-weight: 600; color: var(--ink-900); font-size: 14px; }

    @media (max-width: 1024px) { .charts-grid { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      app-sidebar { display: none !important; }
      .main-content { margin-left: 0 !important; }
      .content { max-width: none; padding: 0; }
      .no-print { display: none !important; }
      .print-header { display: block !important; border-bottom: 2px solid var(--sal-orange); padding-bottom: 12px; margin-bottom: 20px; }
      .charts-grid { display: block; }
      .charts-grid > * { margin-bottom: 16px; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  users: User[] = [];
  auditLogs: AuditLog[] = [];
  usersById = new Map<string, User>();
  readonly brand = BRANDING;
  now = new Date();
  periode: Periode = 'jour';

  private auditByDay: Cat[] = [];
  private creationByMonth: Cat[] = [];
  readonly palette = ['#1A6FD4', '#E8621A', '#2D9C6A', '#9B59B6', '#E8A91A'];

  constructor(
    private userService: UserService,
    private auditLogService: AuditLogService,
    private periodService: DashboardPeriodService,
  ) {}

  ngOnInit(): void {
    this.periode = this.periodService.current;
    this.userService.getUsers().subscribe({
      next: (u) => {
        this.users = u;
        this.usersById = new Map(u.map(x => [String(x.id), x]));
        this.creationByMonth = this.monthlyBuckets(u.map(x => this.created(x)), 6);
      },
      error: (e) => console.error('Erreur chargement utilisateurs', e),
    });
    this.auditLogService.getAuditLogs().subscribe({
      next: (a) => {
        this.auditLogs = a;
        this.auditByDay = this.dailyBuckets(a.map(x => x.createdAt), 14);
      },
      error: (e) => console.error('Erreur chargement audit', e),
    });
  }

  setPeriode(p: Periode): void { this.periode = p; this.periodService.set(p); }
  get periodeLabel(): string {
    return { jour: 'Par jour', semaine: 'Par semaine', mois: 'Par mois', annee: 'Par année' }[this.periode];
  }
  get auditActivityView(): Cat[] { return bucketCategory(this.auditByDay, this.periode, 'jour'); }
  get creationView(): Cat[] { return bucketCategory(this.creationByMonth, this.periode, 'mois'); }

  // ── KPIs ────────────────────────────────────────────────────────────
  get kpis(): KpiCard[] {
    const total = this.users.length;
    const active = this.users.filter(u => u.actif).length;
    return [
      { icon: 'group',          tint: 'var(--info-tint)',    iconColor: 'var(--info)',    label: 'Total utilisateurs',     value: total, link: '/admin/utilisateurs' },
      { icon: 'verified_user',  tint: 'var(--success-tint)', iconColor: 'var(--success)', label: 'Utilisateurs actifs',    value: active, link: '/admin/utilisateurs' },
      { icon: 'block',          tint: 'var(--danger-tint)',  iconColor: 'var(--danger)',  label: 'Utilisateurs désactivés', value: total - active, link: '/admin/utilisateurs' },
      { icon: 'person_add',     tint: 'var(--warning-tint)', iconColor: 'var(--warning)', label: 'Nouveaux ce mois',       value: this.newThisMonth },
    ];
  }

  get newThisMonth(): number {
    const now = new Date();
    return this.users.filter(u => {
      const d = this.created(u); if (!d) return false;
      const dt = new Date(d);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).length;
  }

  get usersByRole(): Cat[] {
    const roles: { role: User['role']; label: string }[] = [
      { role: 'CHARGE_CLIENTELE', label: 'Chargé de clientèle' },
      { role: 'ANALYSTE', label: 'Analyste' },
      { role: 'SUPERVISEUR', label: 'Superviseur' },
      { role: 'ADMINISTRATEUR', label: 'Administrateur' },
    ];
    return roles.map(r => ({ label: r.label, count: this.users.filter(u => u.role === r.role).length }));
  }

  get recentUsers(): User[] {
    return [...this.users]
      .sort((a, b) => (this.created(b) || '').localeCompare(this.created(a) || ''))
      .slice(0, 6);
  }
  get recentAudit(): AuditLog[] {
    return [...this.auditLogs]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 8);
  }

  auditUser(a: AuditLog): string {
    if (a.userNomComplet) return a.userId ? `#${a.userId} — ${a.userNomComplet}` : a.userNomComplet;
    return a.userId ? `#${a.userId}` : 'Système';
  }

  // ── Helpers date / buckets ──────────────────────────────────────────
  created(u: User): string { return (u as any).createdAt || u.dateCreation || ''; }

  private monthlyBuckets(dates: (string | undefined)[], nbMois: number): Cat[] {
    const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const counts = new Map<string, number>();
    for (const d of dates) {
      if (!d) continue;
      const dt = new Date(d);
      const key = dt.getFullYear() + '-' + dt.getMonth();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const now = new Date();
    const out: Cat[] = [];
    for (let i = nbMois - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = dt.getFullYear() + '-' + dt.getMonth();
      out.push({ label: MOIS[dt.getMonth()] + ' ' + String(dt.getFullYear() % 100).padStart(2, '0'), count: counts.get(key) || 0 });
    }
    return out;
  }

  private dailyBuckets(dates: (string | undefined)[], nbJours: number): Cat[] {
    const counts = new Map<string, number>();
    for (const d of dates) {
      if (!d) continue;
      const dt = new Date(d);
      const key = dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const now = new Date();
    const out: Cat[] = [];
    for (let i = nbJours - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate();
      const label = String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
      out.push({ label, count: counts.get(key) || 0 });
    }
    return out;
  }

  roleLabel(role: string): string {
    return ({ CHARGE_CLIENTELE: 'Chargé de clientèle', ANALYSTE: 'Analyste', SUPERVISEUR: 'Superviseur', ADMINISTRATEUR: 'Administrateur' } as Record<string, string>)[role] || role;
  }

  totalOf(list: Cat[] | undefined): number { return (list || []).reduce((s, x) => s + x.count, 0); }
  maxOf(list: Cat[] | undefined): number { return Math.max(...(list || []).map(x => x.count), 1); }
  barPct(count: number, max: number): number { return count === 0 ? 0 : Math.max(4, Math.round((count / max) * 100)); }
  vbarPct(count: number, max: number): number { return count === 0 ? 0 : Math.max(6, Math.round((count / max) * 100)); }
}
