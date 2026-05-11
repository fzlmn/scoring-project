import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { UserService } from '../../core/services/user.service';
import { CreatedUserResponse, User } from '../../core/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, TopbarComponent, BadgeComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <h2>Gestion des Utilisateurs</h2>

          <div class="users-container">
            <div class="form-card">
              <h3>{{ editingUserId ? 'Modifier' : 'Créer' }} Utilisateur</h3>

              <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" formControlName="email" class="form-input" />
                  <span *ngIf="userForm.get('email')?.hasError('required') && userForm.get('email')?.touched" class="error">
                    L'email est requis
                  </span>
                </div>

                <div class="form-group">
                  <label>Nom</label>
                  <input type="text" formControlName="nom" class="form-input" />
                  <span *ngIf="userForm.get('nom')?.hasError('required') && userForm.get('nom')?.touched" class="error">
                    Le nom est requis
                  </span>
                </div>

                <div class="form-group">
                  <label>Prénom</label>
                  <input type="text" formControlName="prenom" class="form-input" />
                  <span *ngIf="userForm.get('prenom')?.hasError('required') && userForm.get('prenom')?.touched" class="error">
                    Le prénom est requis
                  </span>
                </div>

                <div class="form-group">
                  <label>Rôle</label>
                  <select formControlName="role" class="form-input">
                    <option value="">-- Sélectionner --</option>
                    <option value="CHARGE_CLIENTELE">Chargé de Clientèle</option>
                    <option value="ANALYSTE">Analyste</option>
                    <option value="SUPERVISEUR">Superviseur</option>
                  </select>
                  <span *ngIf="userForm.get('role')?.hasError('required') && userForm.get('role')?.touched" class="error">
                    Le rôle est requis
                  </span>
                </div>

                <div class="form-group" *ngIf="!editingUserId">
                  <label>Mot de passe</label>
                  <input type="password" formControlName="password" class="form-input" />
                  <small class="help-text">Laisser vide pour générer un mot de passe aléatoire, ou entrer un mot de passe personnalisé.</small>
                  <span *ngIf="userForm.get('password')?.hasError('passwordTooShort') && userForm.get('password')?.touched" class="error">
                    Le mot de passe doit contenir au moins 8 caractères
                  </span>
                </div>

                <div class="form-actions">
                  <button type="button" (click)="resetForm()" class="btn-secondary">Annuler</button>
                  <button type="submit" [disabled]="!userForm.valid || isLoading" class="btn-primary">
                    {{ isLoading ? 'En cours...' : editingUserId ? 'Modifier' : 'Créer' }}
                  </button>
                </div>

                <div *ngIf="successMessage" class="success-message">
                  {{ successMessage }}
                </div>
                <div *ngIf="errorMessage" class="error-message">
                  {{ errorMessage }}
                </div>
              </form>
            </div>

            <div class="list-card">
              <h3>Liste des Utilisateurs</h3>
              <div class="table-container">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Nom Complet</th>
                      <th>Rôle</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let user of users">
                      <td>{{ user.email }}</td>
                      <td>{{ user.prenom }} {{ user.nom }}</td>
                      <td>{{ getRoleLabel(user.role) }}</td>
                      <td>
                        <app-badge
                          [label]="user.actif ? 'Actif' : 'Inactif'"
                          [variant]="user.actif ? 'success' : 'secondary'"
                        ></app-badge>
                      </td>
                      <td>
                        <div class="actions">
                          <button (click)="editUser(user)" class="action-link">Modifier</button>
                          <button
                            *ngIf="user.actif"
                            (click)="desactivateUser(user)"
                            class="action-link danger"
                          >
                            Désactiver
                          </button>
                          <button
                            *ngIf="!user.actif"
                            (click)="activateUser(user)"
                            class="action-link success"
                          >
                            Activer
                          </button>
                          <button (click)="resetPassword(user)" class="action-link warning">
                            Réinit. MDP
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div *ngIf="users.length === 0" class="empty-state">
                Aucun utilisateur trouvé
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
      max-width: 1200px;
      margin: 0 auto;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1A1A2E;
      margin: 0 0 30px 0;
      font-family: 'Sora', sans-serif;
    }

    .users-container {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 20px;
    }

    .form-card,
    .list-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    h3 {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1A1A2E;
      font-family: 'Sora', sans-serif;
    }

    .form-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
      margin-bottom: 6px;
      font-family: 'DM Sans', sans-serif;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #E5E5EA;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #E8621A;
      box-shadow: 0 0 0 3px rgba(232, 98, 26, 0.1);
    }

    .error {
      display: block;
      font-size: 11px;
      color: #D94040;
      margin-top: 4px;
      font-family: 'DM Sans', sans-serif;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .btn-primary,
    .btn-secondary {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #E8621A;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #d14d0a;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #F5F5F7;
      color: #1A1A2E;
      border: 1px solid #E5E5EA;
    }

    .btn-secondary:hover {
      background: #E5E5EA;
    }

    .success-message {
      margin-top: 15px;
      padding: 10px 12px;
      background: #E3F5EE;
      color: #2D9C6A;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    .error-message {
      margin-top: 15px;
      padding: 10px 12px;
      background: #FCE3E3;
      color: #D94040;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    .table-container {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
    }

    thead {
      background: #F5F5F7;
    }

    th {
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #1A1A2E;
      border-bottom: 1px solid #E5E5EA;
    }

    td {
      padding: 10px;
      border-bottom: 1px solid #E5E5EA;
      color: #666;
    }

    .actions {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }

    .action-link {
      padding: 4px 8px;
      background: white;
      border: 1px solid #E8621A;
      color: #E8621A;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.3s;
    }

    .action-link:hover {
      background: #E8621A;
      color: white;
    }

    .action-link.danger {
      border-color: #D94040;
      color: #D94040;
    }

    .action-link.danger:hover {
      background: #D94040;
      color: white;
    }

    .action-link.success {
      border-color: #2D9C6A;
      color: #2D9C6A;
    }

    .action-link.success:hover {
      background: #2D9C6A;
      color: white;
    }

    .action-link.warning {
      border-color: #E8621A;
      color: #E8621A;
    }

    .action-link.warning:hover {
      background: #E8621A;
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #888;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }

    @media (max-width: 1024px) {
      .users-container {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  userForm: FormGroup;
  editingUserId: string | null = null;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      role: ['', Validators.required],
      password: ['', this.passwordValidator],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  private passwordValidator(control: AbstractControl) {
    const value = control.value as string;
    if (!value) {
      return null;
    }
    return value.length >= 8 ? null : { passwordTooShort: true };
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
      },
    });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData: User = {
        ...this.userForm.value,
        actif: true,
      };

      if (!formData.password) {
        delete formData.password;
      }

      const request = this.editingUserId
        ? this.userService.updateUser(this.editingUserId, formData)
        : this.userService.createUser(formData);

      request.subscribe({
        next: (user: CreatedUserResponse) => {
          this.isLoading = false;
          if (this.editingUserId) {
            const index = this.users.findIndex((u) => u.id === this.editingUserId);
            if (index >= 0) {
              this.users[index] = user;
            }
          } else {
            this.users.unshift(user);
          }
          if (this.editingUserId) {
            this.successMessage = 'Utilisateur modifié';
          } else {
            this.successMessage = user.generatedPassword
              ? `Utilisateur créé. Mot de passe : ${user.generatedPassword}`
              : 'Utilisateur créé';
          }
          this.resetForm();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde';
        },
      });
    }
  }

  editUser(user: User): void {
    this.editingUserId = user.id || null;
    this.userForm.patchValue(user);
  }

  resetForm(): void {
    this.userForm.reset();
    this.editingUserId = null;
  }

  activateUser(user: User): void {
    if (user.id) {
      this.userService.activerUser(user.id).subscribe({
        next: () => {
          user.actif = true;
        },
        error: (err) => {
          console.error('Erreur', err);
        },
      });
    }
  }

  desactivateUser(user: User): void {
    if (user.id) {
      this.userService.desactiverUser(user.id).subscribe({
        next: () => {
          user.actif = false;
        },
        error: (err) => {
          console.error('Erreur', err);
        },
      });
    }
  }

  resetPassword(user: User): void {
    if (user.id) {
      this.userService.reinitialiserMotDePasse(user.id).subscribe({
        next: () => {
          alert('Mot de passe réinitialisé et envoyé par email');
        },
        error: (err) => {
          console.error('Erreur', err);
        },
      });
    }
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
