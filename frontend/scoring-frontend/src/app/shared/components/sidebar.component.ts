import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <a routerLink="/profile" class="profile-link">
          <div class="username">{{ user?.prenom }} {{ user?.nom }}</div>
          <p class="subtitle">{{ user ? getRoleLabel(user.role) : 'Mon Profil' }}</p>
        </a>
      </div>

      <nav class="sidebar-nav">
        <a routerLink="/dashboard" class="nav-item">
          <span class="icon">📊</span>
          <span>Dashboard</span>
        </a>

        <a *ngIf="canViewClients()" routerLink="/clients" class="nav-item">
          <span class="icon">👥</span>
          <span>Clients</span>
        </a>

        <a *ngIf="user?.role === 'CHARGE_CLIENTELE'" routerLink="/clients/nouveau" class="nav-item">
          <span class="icon">➕</span>
          <span>Nouveau Client</span>
        </a>

        <a *ngIf="user?.role === 'SUPERVISEUR'" routerLink="/scores" class="nav-item">
          <span class="icon">✓</span>
          <span>Valider Scores</span>
        </a>

        <a *ngIf="user?.role === 'SUPERVISEUR'" routerLink="/alertes" class="nav-item">
          <span class="icon">🔔</span>
          <span>Alertes</span>
        </a>

        <a *ngIf="user?.role === 'SUPERVISEUR'" routerLink="/simulations" class="nav-item">
          <span class="icon">🔄</span>
          <span>Simulations</span>
        </a>

        <a *ngIf="user?.role === 'ADMINISTRATEUR'" routerLink="/admin/utilisateurs" class="nav-item">
          <span class="icon">⚙️</span>
          <span>Utilisateurs</span>
        </a>

        <a *ngIf="user?.role === 'ADMINISTRATEUR'" routerLink="/admin/audit-logs" class="nav-item">
          <span class="icon">📋</span>
          <span>Audit Logs</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <button (click)="logout()" class="logout-btn">Déconnexion</button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 280px;
      background: #1A1A2E;
      color: #fff;
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 0;
      position: fixed;
      left: 0;
      top: 0;
      border-right: 1px solid #333;
    }

    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid #333;
      text-align: center;
    }

    .profile-link {
      display: inline-block;
      text-decoration: none;
      color: inherit;
    }

    .username {
      font-size: 20px;
      font-weight: 700;
      color: #E8621A;
      font-family: 'Sora', sans-serif;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 12px;
      color: #888;
      margin: 4px 0 0 0;
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 0;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      color: #ccc;
      text-decoration: none;
      transition: all 0.3s ease;
      border-left: 3px solid transparent;
      font-size: 14px;
      font-family: 'DM Sans', sans-serif;
    }

    .nav-item:hover {
      background: #252541;
      color: #E8621A;
      border-left-color: #E8621A;
    }

    .nav-item.active {
      background: #252541;
      color: #E8621A;
      border-left-color: #E8621A;
    }

    .icon {
      font-size: 18px;
    }

    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid #333;
    }

    .logout-btn {
      width: 100%;
      padding: 10px;
      background: #E8621A;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      transition: background 0.3s ease;
    }

    .logout-btn:hover {
      background: #d14d0a;
    }
  `]
})
export class SidebarComponent implements OnInit {
  user: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  canViewClients(): boolean {
    const role = this.user?.role;
    return role === 'CHARGE_CLIENTELE' || role === 'ANALYSTE' || role === 'SUPERVISEUR';
  }

  getRoleLabel(role?: string): string {
    const labels: { [key: string]: string } = {
      'CHARGE_CLIENTELE': 'Chargé de Clientèle',
      'ANALYSTE': 'Analyste',
      'SUPERVISEUR': 'Superviseur',
      'ADMINISTRATEUR': 'Administrateur',
    };
    return labels[role || ''] || 'Mon Profil';
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
