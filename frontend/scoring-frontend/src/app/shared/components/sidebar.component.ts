import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from './ui/icon.component';
import { BrandLogoComponent } from './ui/brand-logo.component';
import { AuthService } from '../../core/services/auth.service';
import { BRANDING } from '../../core/branding';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, BrandLogoComponent],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <!-- ── En-tête : menu utilisateur ── -->
      <div class="sidebar-header">
        <div class="user-menu" [class.open]="menuOpen">
          <button type="button" class="user-trigger" (click)="toggleMenu($event)"
                  [attr.aria-expanded]="menuOpen" aria-haspopup="menu"
                  [title]="collapsed ? (user?.prenom + ' ' + user?.nom) : ''">
            <span class="avatar">{{ initials }}</span>
            <span class="user-text">
              <span class="username">{{ user?.prenom }} {{ user?.nom }}</span>
              <span class="subtitle">{{ user ? getRoleLabel(user.role) : 'Mon compte' }}</span>
            </span>
            <app-icon class="chevron" name="expand_more" [size]="18"></app-icon>
          </button>

          <div class="user-dropdown" role="menu" *ngIf="menuOpen">
            <a routerLink="/profile" role="menuitem" class="dd-item" (click)="closeMenu()">
              <app-icon name="account_circle" [size]="18"></app-icon><span>Mon profil</span>
            </a>
            <button type="button" role="menuitem" class="dd-item danger" (click)="logout()">
              <app-icon name="logout" [size]="18"></app-icon><span>Déconnexion</span>
            </button>
          </div>
        </div>

        <button type="button" class="collapse-btn" (click)="toggle()"
                [attr.aria-label]="collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'"
                [title]="collapsed ? 'Déplier' : 'Replier'">
          <app-icon [name]="collapsed ? 'chevron_right' : 'chevron_left'" [size]="20"></app-icon>
        </button>
      </div>

      <!-- ── Navigation ── -->
      <nav class="sidebar-nav">
        <a routerLink="/dashboard" class="nav-item" [title]="collapsed ? 'Tableau de bord' : ''">
          <app-icon class="icon" name="dashboard" [size]="20"></app-icon><span class="label">Tableau de bord</span>
        </a>

        <a *ngIf="canViewClients()" routerLink="/clients" class="nav-item" [title]="collapsed ? 'Clients' : ''">
          <app-icon class="icon" name="group" [size]="20"></app-icon><span class="label">Clients</span>
        </a>

        <a *ngIf="user?.role === 'CHARGE_CLIENTELE'" routerLink="/clients/nouveau" class="nav-item" [title]="collapsed ? 'Nouveau client' : ''">
          <app-icon class="icon" name="person_add" [size]="20"></app-icon><span class="label">Nouveau client</span>
        </a>

        <a *ngIf="canViewScores()" routerLink="/scores" class="nav-item" [title]="collapsed ? 'Scores' : ''">
          <app-icon class="icon" name="monitoring" [size]="20"></app-icon><span class="label">Scores</span>
        </a>

        <a *ngIf="user?.role === 'SUPERVISEUR'" routerLink="/scores/validation" class="nav-item" [title]="collapsed ? 'Valider les scores' : ''">
          <app-icon class="icon" name="fact_check" [size]="20"></app-icon><span class="label">Valider les scores</span>
        </a>

        <a *ngIf="user?.role === 'SUPERVISEUR'" routerLink="/alertes" class="nav-item" [title]="collapsed ? 'Alertes' : ''">
          <app-icon class="icon" name="notifications" [size]="20"></app-icon><span class="label">Alertes</span>
        </a>

        <a *ngIf="user?.role === 'SUPERVISEUR'" routerLink="/simulations" class="nav-item" [title]="collapsed ? 'Simulations' : ''">
          <app-icon class="icon" name="science" [size]="20"></app-icon><span class="label">Simulations</span>
        </a>

        <a *ngIf="user?.role === 'SUPERVISEUR'" routerLink="/simulations/historique" class="nav-item" [title]="collapsed ? 'Historique des simulations' : ''">
          <app-icon class="icon" name="history" [size]="20"></app-icon><span class="label">Historique des simulations</span>
        </a>

        <a *ngIf="user?.role === 'ADMINISTRATEUR'" routerLink="/admin/utilisateurs" class="nav-item" [title]="collapsed ? 'Utilisateurs' : ''">
          <app-icon class="icon" name="manage_accounts" [size]="20"></app-icon><span class="label">Utilisateurs</span>
        </a>

        <a *ngIf="user?.role === 'ADMINISTRATEUR'" routerLink="/admin/audit-logs" class="nav-item" [title]="collapsed ? 'Journal d’audit' : ''">
          <app-icon class="icon" name="receipt_long" [size]="20"></app-icon><span class="label">Journal d’audit</span>
        </a>
      </nav>

      <!-- ── Pied : marque (centralisée via core/branding.ts) ── -->
      <div class="sidebar-footer">
        <app-brand-logo [size]="collapsed ? 'sm' : 'md'" [title]="brandName"></app-brand-logo>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      background: #1A1A2E;
      color: #fff;
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      border-right: 1px solid #2C2C44;
      overflow: visible;
      transition: width var(--transition);
      z-index: 30;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      border-bottom: 1px solid #2C2C44;
    }

    /* ── User menu ── */
    .user-menu { position: relative; flex: 1; min-width: 0; }
    .user-trigger {
      display: flex; align-items: center; gap: 10px; width: 100%;
      background: transparent; border: 1px solid transparent; border-radius: 10px;
      padding: 8px; cursor: pointer; color: inherit; text-align: left;
      transition: background var(--transition), border-color var(--transition);
      font-family: 'DM Sans', sans-serif;
    }
    .user-trigger:hover, .user-menu.open .user-trigger { background: #252541; border-color: #33334f; }

    .avatar {
      flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px;
      background: var(--sal-orange); color: #fff;
      display: inline-flex; align-items: center; justify-content: center;
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 15px;
    }
    .avatar.sm { width: 34px; height: 34px; font-size: 13px; border-radius: 8px; }

    .user-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .username { font-size: 14px; font-weight: 700; color: #fff; font-family: 'Sora', sans-serif; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .subtitle { font-size: 11px; color: #8A8AA3; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chevron { color: #8A8AA3; flex-shrink: 0; transition: transform var(--transition); }
    .user-menu.open .chevron { transform: rotate(180deg); }

    .user-dropdown {
      position: absolute; top: calc(100% + 6px); left: 0; right: 0;
      background: #23233b; border: 1px solid #33334f; border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.4); padding: 6px; z-index: 40;
      animation: dd-in 0.14s ease;
    }
    @keyframes dd-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .dd-item {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 9px 10px; border-radius: 8px; border: none; background: transparent;
      color: #C7C7D9; font-size: 13px; font-family: 'DM Sans', sans-serif; cursor: pointer;
      text-decoration: none; transition: background var(--transition), color var(--transition);
    }
    .dd-item:hover { background: #2C2C48; color: #fff; }
    .dd-item.danger:hover { background: rgba(217,64,64,0.15); color: #ff8a8a; }

    .collapse-btn {
      flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px;
      border: 1px solid #2C2C44; background: transparent; color: #8A8AA3;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      transition: all var(--transition);
    }
    .collapse-btn:hover { color: var(--sal-orange); border-color: var(--sal-orange); }

    /* ── Nav ── */
    .sidebar-nav { flex: 1; padding: 14px 0; overflow-y: auto; overflow-x: hidden; }
    .nav-item {
      display: flex; align-items: center; gap: 14px; padding: 12px 20px;
      color: #C7C7D9; text-decoration: none; border-left: 3px solid transparent;
      font-size: 14px; font-family: 'DM Sans', sans-serif; white-space: nowrap;
      transition: background var(--transition), color var(--transition), border-color var(--transition);
    }
    .nav-item:hover, .nav-item.active { background: #252541; color: var(--sal-orange); border-left-color: var(--sal-orange); }
    .icon { width: 22px; flex-shrink: 0; }
    .label { overflow: hidden; }

    /* ── Footer / brand ── */
    .sidebar-footer { padding: 10px; border-top: 1px solid #2C2C44; }

    /* ── Collapsed rail ── */
    .sidebar.collapsed .sidebar-header { flex-direction: column; gap: 10px; padding: 16px 8px; }
    .sidebar.collapsed .user-menu { width: 100%; display: flex; justify-content: center; }
    .sidebar.collapsed .user-trigger { justify-content: center; padding: 6px; }
    .sidebar.collapsed .user-text, .sidebar.collapsed .chevron { display: none; }
    .sidebar.collapsed .user-dropdown { left: 8px; right: auto; width: 210px; }
    .sidebar.collapsed .nav-item { justify-content: center; gap: 0; padding: 12px 0; }
    .sidebar.collapsed .label { display: none; }
    .sidebar.collapsed .sidebar-footer { padding: 10px 8px; text-align: center; }

    @media print { .sidebar { display: none !important; } }
  `]
})
export class SidebarComponent implements OnInit {
  user: User | null = null;
  collapsed = false;
  menuOpen = false;
  readonly brandName = BRANDING.fullName;

  private static readonly STORAGE_KEY = 'sidebar-collapsed';
  private static readonly W_EXPANDED = '280px';
  private static readonly W_COLLAPSED = '80px';

  constructor(private authService: AuthService, private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.collapsed = localStorage.getItem(SidebarComponent.STORAGE_KEY) === 'true';
    this.applyWidth();
  }

  get initials(): string {
    const p = this.user?.prenom?.charAt(0) || '';
    const n = this.user?.nom?.charAt(0) || '';
    return (p + n).toUpperCase() || 'SS';
  }

  // ── User menu ──
  toggleMenu(e: Event): void { e.stopPropagation(); this.menuOpen = !this.menuOpen; }
  closeMenu(): void { this.menuOpen = false; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.menuOpen && !this.host.nativeElement.contains(e.target as Node)) this.menuOpen = false;
  }
  @HostListener('document:keydown.escape')
  onEsc(): void { this.menuOpen = false; }

  // ── Collapse ──
  toggle(): void {
    this.collapsed = !this.collapsed;
    localStorage.setItem(SidebarComponent.STORAGE_KEY, String(this.collapsed));
    this.applyWidth();
  }

  private applyWidth(): void {
    document.documentElement.style.setProperty(
      '--sidebar-width', this.collapsed ? SidebarComponent.W_COLLAPSED : SidebarComponent.W_EXPANDED);
  }

  canViewClients(): boolean {
    const role = this.user?.role;
    return role === 'CHARGE_CLIENTELE' || role === 'ANALYSTE' || role === 'SUPERVISEUR';
  }

  canViewScores(): boolean {
    const role = this.user?.role;
    return role === 'ANALYSTE' || role === 'SUPERVISEUR';
  }

  getRoleLabel(role?: string): string {
    const labels: { [key: string]: string } = {
      'CHARGE_CLIENTELE': 'Chargé de Clientèle',
      'ANALYSTE': 'Analyste',
      'SUPERVISEUR': 'Superviseur',
      'ADMINISTRATEUR': 'Administrateur',
    };
    return labels[role || ''] || 'Mon compte';
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
