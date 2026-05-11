import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <h2>Administration</h2>
          <div class="admin-menu">
            <a routerLink="/admin/utilisateurs" class="admin-card">
              <div class="icon">👥</div>
              <div class="card-content">
                <h3>Gestion des Utilisateurs</h3>
                <p>Créer, modifier et gérer les utilisateurs du système</p>
              </div>
            </a>
            <a routerLink="/admin/audit-logs" class="admin-card">
              <div class="icon">📋</div>
              <div class="card-content">
                <h3>Audit Logs</h3>
                <p>Consulter l'historique des actions du système</p>
              </div>
            </a>
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
      max-width: 1000px;
      margin: 0 auto;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1A1A2E;
      margin: 0 0 30px 0;
      font-family: 'Sora', sans-serif;
    }

    .admin-menu {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .admin-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
      display: flex;
      gap: 15px;
      align-items: flex-start;
      text-decoration: none;
      transition: all 0.3s;
      cursor: pointer;
    }

    .admin-card:hover {
      border-color: #E8621A;
      box-shadow: 0 4px 12px rgba(232, 98, 26, 0.1);
    }

    .icon {
      font-size: 32px;
      min-width: 40px;
    }

    .card-content {
      flex: 1;
    }

    h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    p {
      margin: 0;
      font-size: 13px;
      color: #666;
      font-family: 'DM Sans', sans-serif;
    }
  `]
})
export class AdminComponent {}
