import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, SidebarComponent, PageHeaderComponent, IconComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content" *ngIf="user as u">

          <app-page-header title="Mon profil" subtitle="Informations de votre compte"></app-page-header>

          <!-- ── Hero ── -->
          <div class="card hero">
            <div class="avatar">{{ initials }}</div>
            <div class="hero-id">
              <h2>{{ u.prenom }} {{ u.nom }}</h2>
              <p class="email"><app-icon name="mail" [size]="16"></app-icon>{{ u.email }}</p>
              <div class="hero-badges">
                <span class="badge role"><app-icon name="badge" [size]="14"></app-icon>{{ getRoleLabel(u.role) }}</span>
                <span class="badge" [ngClass]="u.actif ? 'ok' : 'off'">
                  <app-icon [name]="u.actif ? 'check_circle' : 'cancel'" [size]="14"></app-icon>
                  {{ u.actif ? 'Compte actif' : 'Compte inactif' }}
                </span>
              </div>
            </div>
          </div>

          <!-- ── Informations du compte ── -->
          <div class="card info">
            <h3 class="card-title">Informations du compte</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="k"><app-icon name="person" [size]="16"></app-icon>Prénom</span>
                <span class="v">{{ u.prenom }}</span>
              </div>
              <div class="info-item">
                <span class="k"><app-icon name="person" [size]="16"></app-icon>Nom</span>
                <span class="v">{{ u.nom }}</span>
              </div>
              <div class="info-item">
                <span class="k"><app-icon name="mail" [size]="16"></app-icon>Email</span>
                <span class="v">{{ u.email }}</span>
              </div>
              <div class="info-item">
                <span class="k"><app-icon name="badge" [size]="16"></app-icon>Rôle</span>
                <span class="v">{{ getRoleLabel(u.role) }}</span>
              </div>
              <div class="info-item">
                <span class="k"><app-icon name="toggle_on" [size]="16"></app-icon>Statut</span>
                <span class="v">{{ u.actif ? 'Actif' : 'Inactif' }}</span>
              </div>
              <div class="info-item" *ngIf="u.dateCreation">
                <span class="k"><app-icon name="calendar_month" [size]="16"></app-icon>Membre depuis</span>
                <span class="v">{{ u.dateCreation | date:'longDate' }}</span>
              </div>
            </div>
            <p class="note">
              <app-icon name="info" [size]="16"></app-icon>
              Pour modifier vos informations ou réinitialiser votre mot de passe, contactez un administrateur.
            </p>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 900px; margin: 0 auto; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-6); }

    .hero { display: flex; align-items: center; gap: var(--space-6); margin-bottom: var(--space-5); background: linear-gradient(120deg, var(--surface) 60%, var(--sal-orange-tint) 140%); }
    .avatar { width: 84px; height: 84px; border-radius: 20px; background: var(--sal-orange); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; font-size: 32px; flex-shrink: 0; box-shadow: var(--shadow-sm); }
    .hero-id h2 { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--ink-900); margin: 0 0 6px; }
    .email { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: 14px; color: var(--ink-500); margin: 0 0 12px; }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 20px; font-family: var(--font-body); font-size: 12px; font-weight: 600; }
    .badge.role { background: var(--info-tint); color: var(--info); }
    .badge.ok { background: var(--success-tint); color: var(--success); }
    .badge.off { background: var(--surface-2); color: var(--ink-500); }

    .card-title { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--ink-900); margin: 0 0 var(--space-5); padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4) var(--space-6); }
    .info-item { display: flex; flex-direction: column; gap: 5px; padding: 4px 0; }
    .k { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-body); font-size: 12px; font-weight: 600; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.4px; }
    .k app-icon { color: var(--ink-300); }
    .v { font-family: var(--font-body); font-size: 15px; color: var(--ink-900); }
    .note { display: flex; align-items: center; gap: 8px; margin: var(--space-5) 0 0; padding: 11px 13px; background: var(--surface-2); border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 13px; color: var(--ink-500); }
    .note app-icon { color: var(--info); flex-shrink: 0; }

    @media (max-width: 640px) {
      .main-content { margin-left: 0; }
      .content { padding: var(--space-5); }
      .hero { flex-direction: column; text-align: center; }
      .info-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  get initials(): string {
    const p = this.user?.prenom?.charAt(0) || '';
    const n = this.user?.nom?.charAt(0) || '';
    return (p + n).toUpperCase();
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'CHARGE_CLIENTELE': 'Chargé de Clientèle',
      'ANALYSTE': 'Analyste',
      'SUPERVISEUR': 'Superviseur',
      'ADMINISTRATEUR': 'Administrateur',
    };
    return labels[role] || role;
  }
}
