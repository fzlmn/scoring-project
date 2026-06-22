import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { ClientService } from '../../core/services/client.service';
import { Client } from '../../core/models/client.model';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <h2>{{ clientId ? 'Modifier Client' : 'Créer Client' }}</h2>

          <form [formGroup]="clientForm" (ngSubmit)="onSubmit()" class="form">
            <div class="form-row">
              <div class="form-group">
                <label>Prénom</label>
                <input type="text" formControlName="prenom" class="form-input" />
                <span *ngIf="clientForm.get('prenom')?.hasError('required') && clientForm.get('prenom')?.touched" class="error">
                  Le prénom est requis
                </span>
              </div>

              <div class="form-group">
                <label>Nom</label>
                <input type="text" formControlName="nom" class="form-input" />
                <span *ngIf="clientForm.get('nom')?.hasError('required') && clientForm.get('nom')?.touched" class="error">
                  Le nom est requis
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>CIN</label>
                <input type="text" formControlName="cin" class="form-input" />
                <span *ngIf="clientForm.get('cin')?.hasError('required') && clientForm.get('cin')?.touched" class="error">
                  Le CIN est requis
                </span>
              </div>

              <div class="form-group">
                <label>Date de Naissance</label>
                <input type="date" formControlName="dateNaissance" class="form-input" />
                <span *ngIf="clientForm.get('dateNaissance')?.hasError('required') && clientForm.get('dateNaissance')?.touched" class="error">
                  La date de naissance est requise
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Situation Professionnelle</label>
                <select formControlName="situationPro" class="form-input">
                  <option value="">-- Sélectionner --</option>
                  <option value="CDI">Salarié (CDI)</option>
                  <option value="CDD">Salarié (CDD)</option>
                  <option value="INDEPENDANT">Indépendant</option>
                  <option value="SANS_EMPLOI">Sans emploi</option>
                </select>
                <span *ngIf="clientForm.get('situationPro')?.hasError('required') && clientForm.get('situationPro')?.touched" class="error">
                  La situation professionnelle est requise
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Revenus Mensuels (DH)</label>
                <input type="number" formControlName="revenusMensuels" class="form-input" />
                <span *ngIf="clientForm.get('revenusMensuels')?.hasError('required') && clientForm.get('revenusMensuels')?.touched" class="error">
                  Les revenus sont requis
                </span>
              </div>

              <div class="form-group">
                <label>Charges Mensuelles (DH)</label>
                <input type="number" formControlName="chargesMensuelles" class="form-input" (change)="calculateTauxEndettement()" />
                <span *ngIf="clientForm.get('chargesMensuelles')?.hasError('required') && clientForm.get('chargesMensuelles')?.touched" class="error">
                  Les charges sont requises
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Taux d'Endettement (%)</label>
                <input type="number" formControlName="tauxEndettement" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label>Historique Financier</label>
              <select formControlName="historiqueFinancier" class="form-input">
                  <option value="">-- Sélectionner --</option>
                  <option value="BON">Bon</option>
                  <option value="MOYEN">Moyen</option>
                  <option value="MAUVAIS">Mauvais</option>
              </select>            
            </div>

            <div class="info-box">
              <p><strong>ℹ️ Note :</strong> Le score client sera calculé automatiquement par le système après création.</p>
            </div>

            <div class="form-actions">
              <button type="button" (click)="onCancel()" class="btn-secondary">Annuler</button>
              <button type="submit" [disabled]="!clientForm.valid || isLoading" class="btn-primary">
                {{ isLoading ? 'En cours...' : clientId ? 'Modifier' : 'Créer' }}
              </button>
            </div>

            <div *ngIf="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>
            <div *ngIf="successMessage" class="success-message">
              {{ successMessage }}
            </div>
          </form>
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

    .form {
      background: white;
      padding: 30px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-row.full {
      grid-template-columns: 1fr;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
      margin-bottom: 8px;
      font-family: 'DM Sans', sans-serif;
    }

    .form-input,
    .form-textarea {
      padding: 10px 12px;
      border: 1px solid #E5E5EA;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      transition: border-color 0.3s;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #E8621A;
      box-shadow: 0 0 0 3px rgba(232, 98, 26, 0.1);
    }

    .form-input:disabled {
      background: #F5F5F7;
      color: #ccc;
    }

    .form-textarea {
      resize: vertical;
    }

    .error {
      font-size: 12px;
      color: #D94040;
      margin-top: 4px;
      font-family: 'DM Sans', sans-serif;
    }

    .info-box {
      background: #E3F0FF;
      border-left: 3px solid #1A6FD4;
      padding: 12px;
      border-radius: 6px;
      margin: 20px 0;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      color: #1A6FD4;
    }

    .info-box p {
      margin: 0;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 30px;
      justify-content: flex-end;
    }

    .btn-primary,
    .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
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

    .error-message {
      margin-top: 15px;
      padding: 10px 12px;
      background: #FCE3E3;
      color: #D94040;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
    }

    .success-message {
      margin-top: 15px;
      padding: 10px 12px;
      background: #E3F5EE;
      color: #2D9C6A;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ClientFormComponent implements OnInit {
  clientForm: FormGroup;
  clientId: string | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.clientForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      cin: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      situationPro: ['', Validators.required],
      revenusMensuels: ['', [Validators.required, Validators.min(0)]],
      chargesMensuelles: ['', [Validators.required, Validators.min(0)]],
      tauxEndettement: [{ value: 0, disabled: true }],
      historiqueFinancier: [''],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.clientId = params.get('id');
      if (this.clientId) {
        this.loadClient(this.clientId);
      }
    });
  }

  loadClient(id: string): void {
    this.clientService.getClientById(id).subscribe({
      next: (client) => {
        this.clientForm.patchValue(client);
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement du client';
      },
    });
  }

  calculateTauxEndettement(): void {
    const revenus = this.clientForm.get('revenusMensuels')?.value || 0;
    const charges = this.clientForm.get('chargesMensuelles')?.value || 0;

    if (revenus > 0) {
      const taux = (charges / revenus) * 100;
      this.clientForm.get('tauxEndettement')?.setValue(Math.round(taux * 100) / 100);
    }
  }

  onSubmit(): void {
    if (this.clientForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = { ...this.clientForm.getRawValue() };
      delete formData.tauxEndettement;

      const request = this.clientId
        ? this.clientService.updateClient(this.clientId, formData)
        : this.clientService.createClient(formData);

      request.subscribe({
        next: (client) => {
          this.isLoading = false;
          this.successMessage = this.clientId ? 'Client modifié avec succès' : 'Client créé avec succès';
          setTimeout(() => {
            this.router.navigate(['/clients']);
          }, 1500);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde';
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/clients']);
  }
}
