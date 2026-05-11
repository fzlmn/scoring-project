import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 70px;
      background: white;
      border-bottom: 1px solid #E5E5EA;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 30px;
      margin-left: 280px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .topbar-left {
      flex: 1;
    }

    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1A1A2E;
      margin: 0;
      font-family: 'Sora', sans-serif;
    }

    /* removed top-right user info styles since username now appears in the sidebar */
  `]
})
export class TopbarComponent implements OnInit {
  user: User | null = null;
  pageTitle = 'Dashboard';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  getRoleLabel(role?: string): string {
    const labels: { [key: string]: string } = {
      'CHARGE_CLIENTELE': 'Chargé de Clientèle',
      'ANALYSTE': 'Analyste',
      'SUPERVISEUR': 'Superviseur',
      'ADMINISTRATEUR': 'Administrateur',
    };
    return labels[role || ''] || '';
  }
}
