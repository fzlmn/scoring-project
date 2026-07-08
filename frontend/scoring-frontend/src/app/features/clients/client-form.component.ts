import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { BackButtonComponent } from '../../shared/components/ui/back-button.component';
import { ClientService } from '../../core/services/client.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, PageHeaderComponent, IconComponent, BackButtonComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <app-page-header [title]="clientId ? 'Modifier le client' : 'Nouveau client'"
                           [subtitle]="clientId ? 'Mettez à jour les informations du client' : 'Renseignez le dossier en trois étapes'">
            <app-back-button [fallback]="'/clients'"></app-back-button>
          </app-page-header>

          <!-- ── Stepper ── -->
          <div class="stepper">
            <div class="stepper-track"><div class="stepper-fill" [style.width.%]="progress"></div></div>
            <div class="steps">
              <button type="button" class="step" *ngFor="let s of steps"
                      [class.active]="step === s.n" [class.done]="isDone(s.n)"
                      (click)="goTo(s.n)">
                <span class="step-dot">
                  <app-icon *ngIf="isDone(s.n)" name="check" [size]="18"></app-icon>
                  <span *ngIf="!isDone(s.n)">{{ s.n }}</span>
                </span>
                <span class="step-label">
                  <span class="step-eyebrow">Étape {{ s.n }}</span>
                  <span class="step-title">{{ s.title }}</span>
                </span>
              </button>
            </div>
          </div>

          <form [formGroup]="clientForm" (ngSubmit)="onSubmit()" class="wizard-card">

            <!-- ══ Étape 1 : Identité ══ -->
            <section *ngIf="step === 1" class="step-panel">
              <h3 class="panel-title"><app-icon name="person" [size]="20"></app-icon> Informations personnelles</h3>
              <div class="grid-2">
                <div class="field">
                  <label>Prénom <span class="req">*</span></label>
                  <input type="text" formControlName="prenom" class="input" placeholder="Prénom" />
                  <span class="err" *ngIf="hasError('prenom','required')">Le prénom est requis</span>
                </div>
                <div class="field">
                  <label>Nom <span class="req">*</span></label>
                  <input type="text" formControlName="nom" class="input" placeholder="Nom" />
                  <span class="err" *ngIf="hasError('nom','required')">Le nom est requis</span>
                </div>
                <div class="field">
                  <label>CIN <span class="req">*</span></label>
                  <input type="text" formControlName="cin" class="input" placeholder="AB123456" [attr.readonly]="clientId ? true : null" />
                  <span class="err" *ngIf="hasError('cin','required')">Le CIN est requis</span>
                </div>
                <div class="field">
                  <label>Date de naissance <span class="req">*</span></label>
                  <input type="date" formControlName="dateNaissance" class="input" />
                  <span class="err" *ngIf="hasError('dateNaissance','required')">La date de naissance est requise</span>
                </div>
                <div class="field">
                  <label>Situation professionnelle <span class="req">*</span></label>
                  <select formControlName="situationPro" class="input">
                    <option value="">— Sélectionner —</option>
                    <option value="CDI">Salarié (CDI)</option>
                    <option value="CDD">Salarié (CDD)</option>
                    <option value="INDEPENDANT">Indépendant / Auto-entrepreneur</option>
                    <option value="SANS_EMPLOI">Sans emploi</option>
                  </select>
                  <span class="err" *ngIf="hasError('situationPro','required')">La situation professionnelle est requise</span>
                </div>
                <div class="field">
                  <label>Personnes à charge <span class="req">*</span></label>
                  <input type="number" formControlName="nbPersonnesACharge" class="input" min="0" max="20" />
                  <span class="hint">Enfants, parents ou toute personne dépendant financièrement.</span>
                  <span class="err" *ngIf="hasError('nbPersonnesACharge','required')">Ce champ est requis</span>
                  <span class="err" *ngIf="hasError('nbPersonnesACharge','min') || hasError('nbPersonnesACharge','max')">Valeur entre 0 et 20</span>
                </div>
              </div>
            </section>

            <!-- ══ Étape 2 : Finances ══ -->
            <section *ngIf="step === 2" class="step-panel">
              <h3 class="panel-title"><app-icon name="payments" [size]="20"></app-icon> Données financières</h3>
              <div class="grid-2">
                <div class="field">
                  <label>Revenus mensuels nets (DH) <span class="req">*</span></label>
                  <input type="number" formControlName="revenusMensuels" class="input" min="0" placeholder="0" (input)="calculerTauxEndettement()" />
                  <span class="err" *ngIf="hasError('revenusMensuels','required')">Les revenus sont requis</span>
                  <span class="err" *ngIf="hasError('revenusMensuels','min')">Valeur positive ou nulle</span>
                </div>
                <div class="field">
                  <label>Charges mensuelles totales (DH) <span class="req">*</span></label>
                  <input type="number" formControlName="chargesMensuelles" class="input" min="0" placeholder="0" (input)="calculerTauxEndettement()" />
                  <span class="hint">Loyer, remboursements en cours, autres charges fixes.</span>
                  <span class="err" *ngIf="hasError('chargesMensuelles','required')">Les charges sont requises</span>
                  <span class="err" *ngIf="hasError('chargesMensuelles','min')">Valeur positive ou nulle</span>
                </div>
                <div class="field">
                  <label>Taux d'endettement (%)</label>
                  <input type="number" formControlName="tauxEndettement" class="input readonly" readonly />
                  <span class="hint">Calculé automatiquement : charges / revenus × 100.</span>
                </div>
                <div class="field">
                  <label>Historique financier <span class="req">*</span></label>
                  <select formControlName="historiqueFinancier" class="input">
                    <option value="">— Sélectionner —</option>
                    <option value="BON">Bon — aucun incident connu</option>
                    <option value="MOYEN">Moyen — quelques retards passés</option>
                    <option value="MAUVAIS">Mauvais — incidents significatifs</option>
                  </select>
                  <span class="err" *ngIf="hasError('historiqueFinancier','required')">L'historique financier est requis</span>
                </div>
              </div>
            </section>

            <!-- ══ Étape 3 : Crédit ══ -->
            <section *ngIf="step === 3" class="step-panel">
              <h3 class="panel-title">
                <app-icon name="credit_score" [size]="20"></app-icon> Données de crédit
                <span class="panel-badge">Bureau ESM / Déclaration client</span>
              </h3>
              <p class="panel-desc">Issues du rapport de solvabilité ou déclarées sur l'honneur. Saisir 0 si aucun incident ou engagement.</p>

              <div class="subsection">Retards de paiement passés</div>
              <div class="grid-3">
                <div class="field">
                  <label>Retards 30–59 j <span class="req">*</span></label>
                  <input type="number" formControlName="nbRetards3059Jours" class="input" min="0" max="98" />
                  <span class="err" *ngIf="hasError('nbRetards3059Jours','required')">Requis (0 si aucun)</span>
                  <span class="err" *ngIf="hasError('nbRetards3059Jours','min') || hasError('nbRetards3059Jours','max')">Entre 0 et 98</span>
                </div>
                <div class="field">
                  <label>Retards 60–89 j <span class="req">*</span></label>
                  <input type="number" formControlName="nbRetards6089Jours" class="input" min="0" max="98" />
                  <span class="err" *ngIf="hasError('nbRetards6089Jours','required')">Requis (0 si aucun)</span>
                  <span class="err" *ngIf="hasError('nbRetards6089Jours','min') || hasError('nbRetards6089Jours','max')">Entre 0 et 98</span>
                </div>
                <div class="field">
                  <label>Retards 90 j et + <span class="req">*</span></label>
                  <input type="number" formControlName="nbRetards90JoursPlus" class="input" min="0" max="98" />
                  <span class="err" *ngIf="hasError('nbRetards90JoursPlus','required')">Requis (0 si aucun)</span>
                  <span class="err" *ngIf="hasError('nbRetards90JoursPlus','min') || hasError('nbRetards90JoursPlus','max')">Entre 0 et 98</span>
                </div>
              </div>

              <div class="subsection">Engagements de crédit en cours</div>
              <div class="grid-2">
                <div class="field">
                  <label>Crédits ouverts (toutes institutions) <span class="req">*</span></label>
                  <input type="number" formControlName="nbCreditsOuverts" class="input" min="0" max="58" />
                  <span class="hint">Prêts conso, crédit auto, crédit perso, etc.</span>
                  <span class="err" *ngIf="hasError('nbCreditsOuverts','required')">Requis (0 si aucun)</span>
                  <span class="err" *ngIf="hasError('nbCreditsOuverts','min') || hasError('nbCreditsOuverts','max')">Entre 0 et 58</span>
                </div>
                <div class="field">
                  <label>Prêts immobiliers en cours <span class="req">*</span></label>
                  <input type="number" formControlName="nbPretsImmobiliers" class="input" min="0" max="54" />
                  <span class="hint">Crédit hypothécaire, crédit logement, etc.</span>
                  <span class="err" *ngIf="hasError('nbPretsImmobiliers','required')">Requis (0 si aucun)</span>
                  <span class="err" *ngIf="hasError('nbPretsImmobiliers','min') || hasError('nbPretsImmobiliers','max')">Entre 0 et 54</span>
                </div>
              </div>

              <div class="subsection">Crédit renouvelable</div>
              <div class="grid-3">
                <div class="field">
                  <label>Plafond (DH)</label>
                  <input type="number" class="input" min="0" [(ngModel)]="plafondCredit" [ngModelOptions]="{standalone: true}" (input)="calculerUtilisationCredit()" />
                  <span class="hint">Carte revolving. 0 si aucune.</span>
                </div>
                <div class="field">
                  <label>Solde utilisé (DH)</label>
                  <input type="number" class="input" min="0" [(ngModel)]="soldeCredit" [ngModelOptions]="{standalone: true}" (input)="calculerUtilisationCredit()" />
                  <span class="hint">Montant actuellement emprunté.</span>
                </div>
                <div class="field">
                  <label>Taux d'utilisation (%) <span class="req">*</span></label>
                  <input type="number" formControlName="utilisationCreditRenouvelable" class="input readonly" readonly />
                  <span class="hint">Calculé automatiquement.</span>
                </div>
              </div>

              <div class="info-box">
                <app-icon name="smart_toy" [size]="18"></app-icon>
                <p>Dès l'enregistrement, le modèle IA calcule le score de risque et sa narration ; le score est soumis à la validation du superviseur.</p>
              </div>
            </section>

            <!-- ── Messages ── -->
            <div *ngIf="errorMessage" class="alert err"><app-icon name="error" [size]="18"></app-icon><span>{{ errorMessage }}</span></div>
            <div *ngIf="successMessage" class="alert ok"><app-icon name="check_circle" [size]="18"></app-icon><span>{{ successMessage }}</span></div>

            <!-- ── Navigation ── -->
            <div class="wizard-nav">
              <button type="button" class="btn btn-secondary" *ngIf="step > 1" (click)="prev()">
                <app-icon name="chevron_left" [size]="18"></app-icon> Précédent
              </button>
              <button type="button" class="btn btn-secondary" *ngIf="step === 1" (click)="onCancel()">Annuler</button>
              <span class="nav-spacer"></span>
              <span class="nav-progress">Étape {{ step }} / {{ steps.length }}</span>
              <button type="button" class="btn btn-primary" *ngIf="step < steps.length" (click)="next()">
                Suivant <app-icon name="chevron_right" [size]="18"></app-icon>
              </button>
              <button type="submit" class="btn btn-primary" *ngIf="step === steps.length" [disabled]="!clientForm.valid || isLoading">
                <app-icon *ngIf="isLoading" class="spin" name="progress_activity" [size]="18"></app-icon>
                {{ isLoading ? 'Enregistrement…' : (clientId ? 'Enregistrer les modifications' : 'Créer le client') }}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 940px; margin: 0 auto; }

    /* Stepper */
    .stepper { position: relative; margin-bottom: var(--space-6); }
    .stepper-track { position: absolute; top: 19px; left: 8%; right: 8%; height: 3px; background: var(--surface-2); border-radius: 3px; z-index: 0; }
    .stepper-fill { height: 100%; background: var(--sal-orange); border-radius: 3px; transition: width var(--transition); }
    .steps { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); z-index: 1; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 10px; background: transparent; border: none; cursor: pointer; padding: 0; font-family: var(--font-body); }
    .step-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--surface); border: 2px solid var(--border-strong); color: var(--ink-500); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; transition: all var(--transition); }
    .step.active .step-dot { border-color: var(--sal-orange); color: var(--sal-orange); box-shadow: 0 0 0 4px var(--sal-orange-tint); }
    .step.done .step-dot { background: var(--success); border-color: var(--success); color: #fff; }
    .step-label { display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .step-eyebrow { font-size: 11px; color: var(--ink-300); text-transform: uppercase; letter-spacing: 0.4px; }
    .step-title { font-size: 13px; font-weight: 600; color: var(--ink-700); text-align: center; }
    .step.active .step-title { color: var(--ink-900); }

    /* Card */
    .wizard-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-6); }
    .panel-title { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-weight: 600; font-size: 17px; color: var(--ink-900); margin: 0 0 var(--space-3); }
    .panel-title app-icon { color: var(--sal-orange); }
    .panel-badge { font-size: 11px; font-weight: 600; background: var(--info-tint); color: var(--info); padding: 3px 9px; border-radius: 20px; }
    .panel-desc { font-size: 13px; color: var(--ink-500); margin: 0 0 var(--space-5); font-family: var(--font-body); line-height: 1.5; }
    .subsection { font-size: 12px; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.5px; margin: var(--space-5) 0 var(--space-3); font-family: var(--font-body); }
    .step-panel > .grid-2:first-of-type, .step-panel > .grid-3:first-of-type { margin-top: var(--space-4); }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4) var(--space-5); }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4) var(--space-5); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 13px; font-weight: 600; color: var(--ink-900); font-family: var(--font-body); }
    .req { color: var(--danger); }
    .input { padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font-size: 14px; font-family: var(--font-body); color: var(--ink-900); background: var(--surface); }
    .input:focus { outline: none; border-color: var(--sal-orange); box-shadow: 0 0 0 3px var(--sal-orange-tint); }
    .input.readonly, .input[readonly] { background: var(--surface-2); color: var(--ink-500); }
    .input.ng-invalid.ng-touched { border-color: var(--danger); }
    .hint { font-size: 11px; color: var(--ink-500); font-family: var(--font-body); line-height: 1.4; }
    .err { font-size: 12px; color: var(--danger); font-family: var(--font-body); }

    .info-box { display: flex; align-items: flex-start; gap: 10px; margin-top: var(--space-6); padding: 13px 15px; background: var(--info-tint); border-left: 3px solid var(--info); border-radius: var(--radius-sm); }
    .info-box app-icon { color: var(--info); flex-shrink: 0; margin-top: 1px; }
    .info-box p { margin: 0; font-size: 13px; color: var(--info); line-height: 1.5; font-family: var(--font-body); }

    .alert { display: flex; align-items: center; gap: 8px; margin-top: var(--space-5); padding: 11px 13px; border-radius: var(--radius-sm); font-size: 13px; font-family: var(--font-body); }
    .alert.err { background: var(--danger-tint); color: var(--danger); }
    .alert.ok { background: var(--success-tint); color: var(--success); }

    .wizard-nav { display: flex; align-items: center; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--border); }
    .nav-spacer { flex: 1; }
    .nav-progress { font-size: 13px; color: var(--ink-500); font-family: var(--font-body); }
    .spin { animation: cf-spin 1s linear infinite; }
    @keyframes cf-spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .main-content { margin-left: 0; }
      .content { padding: var(--space-5); }
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
      .step-title { display: none; }
      .step-eyebrow { display: none; }
    }
  `]
})
export class ClientFormComponent implements OnInit {
  clientForm: FormGroup;
  clientId: string | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  step = 1;
  readonly steps = [
    { n: 1, title: 'Informations personnelles' },
    { n: 2, title: 'Données financières' },
    { n: 3, title: 'Données de crédit' },
  ];
  private readonly stepControls: Record<number, string[]> = {
    1: ['prenom', 'nom', 'cin', 'dateNaissance', 'situationPro', 'nbPersonnesACharge'],
    2: ['revenusMensuels', 'chargesMensuelles', 'historiqueFinancier'],
    3: ['nbRetards3059Jours', 'nbRetards6089Jours', 'nbRetards90JoursPlus', 'nbCreditsOuverts', 'nbPretsImmobiliers', 'utilisationCreditRenouvelable'],
  };

  // Champs intermédiaires pour le calcul du taux d'utilisation crédit renouvelable
  plafondCredit = 0;
  soldeCredit = 0;

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
      nbPersonnesACharge: [0, [Validators.required, Validators.min(0), Validators.max(20)]],

      revenusMensuels: [null, [Validators.required, Validators.min(0)]],
      chargesMensuelles: [null, [Validators.required, Validators.min(0)]],
      tauxEndettement: [{ value: 0, disabled: true }],
      historiqueFinancier: ['', Validators.required],

      nbRetards3059Jours: [0, [Validators.required, Validators.min(0), Validators.max(98)]],
      nbRetards6089Jours: [0, [Validators.required, Validators.min(0), Validators.max(98)]],
      nbRetards90JoursPlus: [0, [Validators.required, Validators.min(0), Validators.max(98)]],
      nbCreditsOuverts: [0, [Validators.required, Validators.min(0), Validators.max(58)]],
      nbPretsImmobiliers: [0, [Validators.required, Validators.min(0), Validators.max(54)]],
      utilisationCreditRenouvelable: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.clientId = params.get('id');
      if (this.clientId && this.clientId !== 'nouveau') {
        this.loadClient(this.clientId);
      } else {
        this.clientId = null;
      }
    });
  }

  loadClient(id: string): void {
    this.clientService.getClientById(id).subscribe({
      next: (client) => {
        this.clientForm.patchValue({
          prenom: client.prenom,
          nom: client.nom,
          cin: client.cin,
          dateNaissance: client.dateNaissance,
          situationPro: client.situationPro,
          nbPersonnesACharge: client.nbPersonnesACharge ?? 0,
          revenusMensuels: client.revenusMensuels,
          chargesMensuelles: client.chargesMensuelles,
          tauxEndettement: client.tauxEndettement ?? 0,
          historiqueFinancier: client.historiqueFinancier ?? '',
          nbRetards3059Jours: client.nbRetards3059Jours ?? 0,
          nbRetards6089Jours: client.nbRetards6089Jours ?? 0,
          nbRetards90JoursPlus: client.nbRetards90JoursPlus ?? 0,
          nbCreditsOuverts: client.nbCreditsOuverts ?? 0,
          nbPretsImmobiliers: client.nbPretsImmobiliers ?? 0,
          utilisationCreditRenouvelable: client.utilisationCreditRenouvelable ?? 0,
        });
        this.clientForm.get('cin')?.disable();
      },
      error: () => { this.errorMessage = 'Impossible de charger le client.'; },
    });
  }

  // ── Wizard navigation ──
  get progress(): number { return ((this.step - 1) / (this.steps.length - 1)) * 100; }

  isStepValid(n: number): boolean {
    return this.stepControls[n].every((name) => {
      const c = this.clientForm.get(name);
      return !c || c.disabled || c.valid;
    });
  }

  isDone(n: number): boolean { return n < this.step && this.isStepValid(n); }

  private markStepTouched(n: number): void {
    this.stepControls[n].forEach((name) => this.clientForm.get(name)?.markAsTouched());
  }

  next(): void {
    if (this.isStepValid(this.step)) {
      this.step = Math.min(this.step + 1, this.steps.length);
      this.scrollTop();
    } else {
      this.markStepTouched(this.step);
    }
  }

  prev(): void { this.step = Math.max(this.step - 1, 1); this.scrollTop(); }

  goTo(n: number): void {
    if (n === this.step) return;
    if (n < this.step) { this.step = n; this.scrollTop(); return; }
    for (let i = this.step; i < n; i++) {
      if (!this.isStepValid(i)) { this.markStepTouched(i); this.step = i; return; }
    }
    this.step = n;
    this.scrollTop();
  }

  private scrollTop(): void {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
  }

  // ── Calculs (inchangés) ──
  calculerTauxEndettement(): void {
    const revenus = this.clientForm.get('revenusMensuels')?.value ?? 0;
    const charges = this.clientForm.get('chargesMensuelles')?.value ?? 0;
    const taux = revenus > 0 ? Math.round((charges / revenus) * 10000) / 100 : 0;
    this.clientForm.get('tauxEndettement')?.setValue(taux);
  }

  calculerUtilisationCredit(): void {
    if (this.plafondCredit > 0) {
      const ratio = Math.min((this.soldeCredit / this.plafondCredit) * 100, 100);
      this.clientForm.get('utilisationCreditRenouvelable')?.setValue(Math.round(ratio * 100) / 100);
    } else {
      this.clientForm.get('utilisationCreditRenouvelable')?.setValue(0);
    }
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.clientForm.get(field);
    return !!(ctrl?.hasError(error) && ctrl?.touched);
  }

  onSubmit(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      // Aller à la première étape invalide pour montrer l'erreur.
      const firstInvalid = this.steps.map((s) => s.n).find((n) => !this.isStepValid(n));
      if (firstInvalid) this.step = firstInvalid;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const raw = this.clientForm.getRawValue();
    const { tauxEndettement, ...formData } = raw;

    const request = this.clientId
      ? this.clientService.updateClient(this.clientId, formData)
      : this.clientService.createClient(formData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = this.clientId
          ? 'Client modifié avec succès.'
          : 'Client créé avec succès. Le score est en cours de calcul.';
        setTimeout(() => this.router.navigate(['/clients']), 1400);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde.';
      },
    });
  }

  onCancel(): void { this.router.navigate(['/clients']); }
}

