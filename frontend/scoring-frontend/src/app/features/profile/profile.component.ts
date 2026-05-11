import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, SidebarComponent, TopbarComponent],
    template: `
        <div class="layout">
        <app-sidebar></app-sidebar>
        <div class="main-content">
            <app-topbar></app-topbar>
            <div class="content">
            <h2>Mon Profil</h2>

            <div class="profile-card" *ngIf="user">
                <div class="profile-header">
                <div class="avatar">
                    {{ user.prenom.charAt(0) }}{{ user.nom.charAt(0) }}
                </div>
                <div class="user-info">
                    <h3>{{ user.prenom }} {{ user.nom }}</h3>
                    <p>{{ user.email }}</p>
                    <span class="role-badge">{{ getRoleLabel(user.role) }}</span>
                </div>
                </div>

                <div class="profile-details">
                <div class="detail-row">
                    <span class="label">Email</span>
                    <span class="value">{{ user.email }}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Prénom</span>
                    <span class="value">{{ user.prenom }}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Nom</span>
                    <span class="value">{{ user.nom }}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Rôle</span>
                    <span class="value">{{ getRoleLabel(user.role) }}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Statut</span>
                    <span class="value">{{ user.actif ? 'Actif' : 'Inactif' }}</span>
                </div>
                <div class="detail-row" *ngIf="user.dateCreation">
                    <span class="label">Date de création</span>
                    <span class="value">{{ user.dateCreation | date:'longDate' }}</span>
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
    max-width: 800px;
    margin: 0 auto;
    }

    h2 {
    font-size: 24px;
    font-weight: 600;
    color: #1A1A2E;
    margin: 0 0 30px 0;
    font-family: 'Sora', sans-serif;
    }

    .profile-card {
    background: white;
    padding: 30px;
    border-radius: 12px;
    border: 1px solid #E5E5EA;
    }

    .profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #E5E5EA;
    }

    .avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #E8621A;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 600;
    margin-right: 20px;
    font-family: 'Sora', sans-serif;
    }

    .user-info h3 {
    margin: 0 0 5px 0;
    font-size: 20px;
    font-weight: 600;
    color: #1A1A2E;
    font-family: 'Sora', sans-serif;
    }

    .user-info p {
    margin: 0 0 10px 0;
    color: #666;
    font-family: 'DM Sans', sans-serif;
    }

    .role-badge {
    display: inline-block;
    padding: 4px 12px;
    background: #E3F5EE;
    color: #2D9C6A;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    }

    .profile-details {
    display: grid;
    gap: 15px;
    }

    .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #F5F5F7;
    }

    .detail-row:last-child {
    border-bottom: none;
    }

    .label {
    font-weight: 600;
    color: #1A1A2E;
    font-family: 'DM Sans', sans-serif;
    }

    .value {
    color: #666;
    font-family: 'DM Sans', sans-serif;
    }

    @media (max-width: 768px) {
    .profile-header {
        flex-direction: column;
        text-align: center;
    }

    .avatar {
        margin-right: 0;
        margin-bottom: 15px;
    }

    .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
    }
    }
`]
})
export class ProfileComponent implements OnInit {
user: User | null = null;

constructor(private authService: AuthService) {}

ngOnInit(): void {
    this.user = this.authService.getUser();
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