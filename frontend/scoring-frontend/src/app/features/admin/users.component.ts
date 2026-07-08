import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { ModalComponent } from '../../shared/components/ui/modal.component';
import {
  DataTableComponent, CellTemplateDirective, TableColumn, TableRowAction,
} from '../../shared/components/ui/data-table.component';
import { FilterBarComponent, FilterDef, FilterValues, applyTableFilters } from '../../shared/components/ui/filter-bar.component';
import { UserService } from '../../core/services/user.service';
import { CreatedUserResponse, User } from '../../core/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, BadgeComponent, IconComponent,
    PageHeaderComponent, ModalComponent, DataTableComponent, CellTemplateDirective, FilterBarComponent,
  ],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <app-page-header title="Utilisateurs" subtitle="Créez et gérez les comptes et leurs accès">
            <button type="button" class="btn btn-primary" (click)="openCreate()">
              <app-icon name="person_add" [size]="18"></app-icon> Nouvel utilisateur
            </button>
          </app-page-header>

          <div *ngIf="pageMessage" class="page-msg" [class.ok]="pageMessage.type === 'success'" [class.err]="pageMessage.type === 'error'">
            <span>{{ pageMessage.text }}</span>
            <button type="button" class="page-msg-x" (click)="pageMessage = null"><app-icon name="close" [size]="16"></app-icon></button>
          </div>

          <app-data-table
            [columns]="columns" [rows]="filteredRows" [loading]="isLoading"
            [rowActions]="rowActions" [hasToolbar]="true"
            searchPlaceholder="Rechercher par email, nom…"
            emptyIcon="group_off" emptyMessage="Aucun utilisateur trouvé">

            <app-filter-bar toolbar [filters]="filterDefs" [values]="filterValues"
                            (valuesChange)="onFilters($event)"></app-filter-bar>

            <ng-template appCell="role" let-row="row"><span class="role">{{ getRoleLabel(row.role) }}</span></ng-template>
            <ng-template appCell="actif" let-row="row">
              <app-badge [label]="row.actif ? 'Actif' : 'Inactif'" [variant]="row.actif ? 'success' : 'secondary'"></app-badge>
            </ng-template>
          </app-data-table>

        </div>
      </div>
    </div>

    <!-- ── Création / édition ── -->
    <app-modal [open]="formOpen" size="md" [title]="editingUserId ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'" (closed)="formOpen = false">
      <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="uform" autocomplete="off">
        <div class="field">
          <label>Email</label>
          <input type="email" formControlName="email" class="input" name="new-user-email"
                 autocomplete="off" placeholder="prenom.nom@orus.ma"
                 [attr.readonly]="editingUserId ? true : null" />
          <span class="err-text" *ngIf="hasError('email','required')">L'email est requis</span>
          <span class="err-text" *ngIf="hasError('email','email')">Email invalide</span>
        </div>
        <div class="row2">
          <div class="field">
            <label>Prénom</label>
            <input type="text" formControlName="prenom" class="input" autocomplete="off" placeholder="Prénom" />
            <span class="err-text" *ngIf="hasError('prenom','required')">Le prénom est requis</span>
          </div>
          <div class="field">
            <label>Nom</label>
            <input type="text" formControlName="nom" class="input" autocomplete="off" placeholder="Nom" />
            <span class="err-text" *ngIf="hasError('nom','required')">Le nom est requis</span>
          </div>
        </div>
        <div class="field">
          <label>Rôle</label>
          <select formControlName="role" class="input">
            <option value="">— Sélectionner —</option>
            <option value="CHARGE_CLIENTELE">Chargé de Clientèle</option>
            <option value="ANALYSTE">Analyste</option>
            <option value="SUPERVISEUR">Superviseur</option>
          </select>
          <span class="err-text" *ngIf="hasError('role','required')">Le rôle est requis</span>
        </div>
        <div class="field" *ngIf="!editingUserId">
          <label>Mot de passe</label>
          <input type="password" formControlName="password" class="input" name="new-user-password"
                 autocomplete="new-password" placeholder="Laisser vide pour générer automatiquement" />
          <small class="hint">Laisser vide pour générer un mot de passe aléatoire, ou saisir un mot de passe (min. 8 caractères).</small>
          <span class="err-text" *ngIf="hasError('password','passwordTooShort')">Au moins 8 caractères</span>
        </div>

        <div class="modal-err" *ngIf="errorMessage">{{ errorMessage }}</div>

        <div class="uform-actions">
          <button type="button" class="btn btn-secondary" (click)="formOpen = false">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="!userForm.valid || isSaving">
            {{ isSaving ? 'En cours…' : (editingUserId ? 'Enregistrer' : 'Créer') }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1200px; margin: 0 auto; }
    .role { color: var(--ink-700); font-size: 13px; }

    .page-msg {
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
      padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: var(--space-5);
      font-family: var(--font-body); font-size: 13px;
    }
    .page-msg.ok { background: var(--success-tint); color: var(--success); }
    .page-msg.err { background: var(--danger-tint); color: var(--danger); }
    .page-msg-x { border: none; background: transparent; cursor: pointer; color: inherit; display: inline-flex; }

    .uform { display: flex; flex-direction: column; gap: var(--space-4); }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--ink-900); font-family: var(--font-body); }
    .input {
      padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
      font-size: 14px; font-family: var(--font-body); color: var(--ink-900); background: var(--surface);
    }
    .input:focus { outline: none; border-color: var(--sal-orange); box-shadow: 0 0 0 3px var(--sal-orange-tint); }
    .input[readonly] { background: var(--surface-2); color: var(--ink-500); }
    .hint { font-size: 11px; color: var(--ink-500); font-family: var(--font-body); }
    .err-text { font-size: 12px; color: var(--danger); font-family: var(--font-body); }
    .modal-err { padding: 10px 12px; background: var(--danger-tint); color: var(--danger); border-radius: var(--radius-sm); font-size: 13px; font-family: var(--font-body); }
    .uform-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-2); }

    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } .row2 { grid-template-columns: 1fr; } }
  `]
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  userForm: FormGroup;
  editingUserId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  formOpen = false;
  pageMessage: { type: 'success' | 'error'; text: string } | null = null;

  filterValues: FilterValues = {};
  rowActions: TableRowAction[] = [];

  readonly filterDefs: FilterDef[] = [
    { key: 'role', label: 'rôle', type: 'select', allLabel: 'Tous les rôles',
      options: [
        { value: 'CHARGE_CLIENTELE', label: 'Chargé de Clientèle' },
        { value: 'ANALYSTE', label: 'Analyste' },
        { value: 'SUPERVISEUR', label: 'Superviseur' },
        { value: 'ADMINISTRATEUR', label: 'Administrateur' },
      ] },
    { key: 'actif', label: 'statut', type: 'select', allLabel: 'Tous les statuts',
      options: [{ value: 'true', label: 'Actif' }, { value: 'false', label: 'Inactif' }],
      match: (r, v) => String(r.actif) === v },
  ];

  readonly columns: TableColumn[] = [
    { key: 'email', header: 'Email', sortable: true },
    { key: 'nomComplet', header: 'Nom complet', sortable: true, format: (r) => `${r.prenom} ${r.nom}` },
    { key: 'role', header: 'Rôle', sortable: true, format: (r) => this.getRoleLabel(r.role) },
    { key: 'actif', header: 'Statut', sortable: true, format: (r) => (r.actif ? 'Actif' : 'Inactif'), noSearch: true },
  ];

  constructor(private userService: UserService, private fb: FormBuilder) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      role: ['', Validators.required],
      password: ['', this.passwordValidator],
    });
  }

  ngOnInit(): void {
    this.rowActions = [
      { label: 'Modifier', icon: 'edit', variant: 'primary', handler: (u) => this.openEdit(u) },
      { label: 'Désactiver', icon: 'block', variant: 'danger', visible: (u) => !!u.actif, handler: (u) => this.desactivateUser(u) },
      { label: 'Activer', icon: 'check_circle', handler: (u) => this.activateUser(u), visible: (u) => !u.actif },
      { label: 'Réinitialiser le mot de passe', icon: 'key', handler: (u) => this.resetPassword(u) },
    ];
    this.loadUsers();
  }

  private passwordValidator(control: AbstractControl) {
    const value = control.value as string;
    if (!value) return null;
    return value.length >= 8 ? null : { passwordTooShort: true };
  }

  hasError(field: string, error: string): boolean {
    const c = this.userForm.get(field);
    return !!(c?.hasError(error) && c?.touched);
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (data) => { this.users = data; this.isLoading = false; },
      error: (err) => { console.error('Erreur lors du chargement des utilisateurs', err); this.isLoading = false; },
    });
  }

  get filteredRows(): User[] { return applyTableFilters(this.users, this.filterDefs, this.filterValues); }
  onFilters(v: FilterValues): void { this.filterValues = { ...v }; }

  openCreate(): void {
    this.editingUserId = null;
    this.errorMessage = '';
    this.userForm.reset();
    this.userForm.get('email')?.enable();
    this.formOpen = true;
  }

  openEdit(user: User): void {
    this.editingUserId = user.id || null;
    this.errorMessage = '';
    this.userForm.reset();
    this.userForm.patchValue({ email: user.email, nom: user.nom, prenom: user.prenom, role: user.role });
    this.formOpen = true;
  }

  onSubmit(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }
    this.isSaving = true;
    this.errorMessage = '';

    const formData: User = { ...this.userForm.getRawValue(), actif: true };
    if (!formData.password) delete formData.password;

    const request = this.editingUserId
      ? this.userService.updateUser(this.editingUserId, formData)
      : this.userService.createUser(formData);

    request.subscribe({
      next: (user: CreatedUserResponse) => {
        this.isSaving = false;
        if (this.editingUserId) {
          const i = this.users.findIndex((u) => u.id === this.editingUserId);
          if (i >= 0) this.users[i] = user;
          this.pageMessage = { type: 'success', text: 'Utilisateur modifié avec succès.' };
        } else {
          this.users = [user, ...this.users];
          this.pageMessage = {
            type: 'success',
            text: user.generatedPassword
              ? `Utilisateur créé. Mot de passe généré : ${user.generatedPassword}`
              : 'Utilisateur créé avec succès.',
          };
        }
        this.formOpen = false;
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde';
      },
    });
  }

  activateUser(user: User): void {
    if (!user.id) return;
    this.userService.activerUser(user.id).subscribe({
      next: () => { user.actif = true; this.users = [...this.users]; },
      error: (err) => console.error('Erreur', err),
    });
  }

  desactivateUser(user: User): void {
    if (!user.id) return;
    this.userService.desactiverUser(user.id).subscribe({
      next: () => { user.actif = false; this.users = [...this.users]; },
      error: (err) => console.error('Erreur', err),
    });
  }

  resetPassword(user: User): void {
    if (!user.id) return;
    this.userService.reinitialiserMotDePasse(user.id).subscribe({
      next: () => { this.pageMessage = { type: 'success', text: `Mot de passe réinitialisé pour ${user.email} (envoyé par email).` }; },
      error: (err) => console.error('Erreur', err),
    });
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
