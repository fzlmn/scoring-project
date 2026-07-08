import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { PageHeaderComponent } from '../../shared/components/ui/page-header.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { SimulationService } from '../../core/services/simulation.service';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/toast.service';
import { Simulation } from '../../core/models/simulation.model';
import { Client } from '../../core/models/client.model';

interface SimForm {
  revenusSimules: number;
  chargesSimulees: number;
  situationPro: string;
  historiqueFinancier: string;
  nbRetards3059Jours: number;
  nbRetards6089Jours: number;
  nbRetards90JoursPlus: number;
  nbCreditsOuverts: number;
  nbPretsImmobiliers: number;
  nbPersonnesACharge: number;
  utilisationCreditRenouvelable: number;
}

@Component({
  selector: 'app-simulations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, PageHeaderComponent, IconComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <div class="content">

          <app-page-header title="Simulations de scénarios"
            subtitle="Modifiez les données financières et de scoring d'un client pour observer l'impact sur le score. Les données réelles ne sont jamais modifiées.">
          </app-page-header>

          <div class="sim-layout">

            <!-- ── Formulaire de simulation ── -->
            <div class="card form-card">
              <h3 class="card-title">Nouvelle simulation</h3>

              <div class="field">
                <label>Client <span class="req">*</span></label>
                <select [(ngModel)]="selectedClientId" class="input" (ngModelChange)="onClientSelected($event)">
                  <option value="">— Sélectionner un client —</option>
                  <option *ngFor="let client of clients" [value]="client.id">
                    {{ client.prenom }} {{ client.nom }} ({{ client.cin }})
                  </option>
                </select>
              </div>

              <ng-container *ngIf="selectedClient as c">
                <!-- Identité (non modifiable) -->
                <div class="identity">
                  <div class="section-label">Identité — non modifiable</div>
                  <div class="identity-grid">
                    <div><span>Nom complet</span><strong>{{ c.prenom }} {{ c.nom }}</strong></div>
                    <div><span>CIN</span><strong class="mono">{{ c.cin }}</strong></div>
                    <div><span>Date de naissance</span><strong>{{ c.dateNaissance | date:'dd/MM/yyyy' }}</strong></div>
                    <div><span>Âge</span><strong>{{ c.age ?? '—' }} ans</strong></div>
                    <div *ngIf="c.dernierScore?.statut === 'VALIDE'">
                      <span>Score actuel (validé)</span>
                      <strong [style.color]="scoreColor(c.dernierScore!.valeurScore!)">{{ c.dernierScore!.valeurScore | number:'1.0-0' }}/100</strong>
                    </div>
                    <div *ngIf="c.dernierScore?.statut !== 'VALIDE'">
                      <span>Score actuel</span><strong class="muted">Non validé</strong>
                    </div>
                  </div>
                </div>

                <!-- Situation professionnelle -->
                <div class="section-label">Situation professionnelle</div>
                <div class="field">
                  <label>Situation professionnelle</label>
                  <select [(ngModel)]="form.situationPro" class="input">
                    <option *ngFor="let o of situationProOptions" [value]="o.value">{{ o.label }}</option>
                  </select>
                </div>

                <!-- Données financières -->
                <div class="section-label">Données financières</div>
                <div class="grid-2">
                  <div class="field">
                    <label>Revenus mensuels (DH) <span class="req">*</span></label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.revenusSimules" (ngModelChange)="recalcTaux()" />
                  </div>
                  <div class="field">
                    <label>Charges mensuelles (DH) <span class="req">*</span></label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.chargesSimulees" (ngModelChange)="recalcTaux()" />
                  </div>
                  <div class="field">
                    <label>Historique financier</label>
                    <select [(ngModel)]="form.historiqueFinancier" class="input">
                      <option *ngFor="let o of historiqueOptions" [value]="o.value">{{ o.label }}</option>
                    </select>
                  </div>
                </div>

                <!-- Crédit renouvelable — même saisie que la fiche client :
                     plafond + solde, le taux est calculé automatiquement -->
                <div class="section-label">Crédit renouvelable</div>
                <div class="grid-3">
                  <div class="field">
                    <label>Plafond (DH)</label>
                    <input type="number" min="0" class="input" [(ngModel)]="simPlafond" (input)="calculerUtilisationCredit()" />
                  </div>
                  <div class="field">
                    <label>Solde utilisé (DH)</label>
                    <input type="number" min="0" class="input" [(ngModel)]="simSolde" (input)="calculerUtilisationCredit()" />
                  </div>
                  <div class="field">
                    <label>Taux d'utilisation (%)</label>
                    <input type="number" class="input readonly" [ngModel]="form.utilisationCreditRenouvelable" readonly />
                  </div>
                </div>
                <div class="hint">Le taux est calculé automatiquement (solde ÷ plafond). Tant que le plafond n'est pas saisi,
                  la valeur actuelle du client ({{ selectedClient?.utilisationCreditRenouvelable ?? 0 | number:'1.0-2' }} %) est conservée.</div>

                <!-- Crédits & prêts -->
                <div class="section-label">Crédits &amp; prêts</div>
                <div class="grid-3">
                  <div class="field">
                    <label>Crédits ouverts</label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.nbCreditsOuverts" />
                  </div>
                  <div class="field">
                    <label>Prêts immobiliers</label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.nbPretsImmobiliers" />
                  </div>
                  <div class="field">
                    <label>Personnes à charge</label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.nbPersonnesACharge" />
                  </div>
                </div>

                <!-- Incidents de paiement -->
                <div class="section-label">Incidents de paiement</div>
                <div class="grid-3">
                  <div class="field">
                    <label>Retards 30–59 j</label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.nbRetards3059Jours" />
                  </div>
                  <div class="field">
                    <label>Retards 60–89 j</label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.nbRetards6089Jours" />
                  </div>
                  <div class="field">
                    <label>Retards 90 j et +</label>
                    <input type="number" min="0" class="input" [(ngModel)]="form.nbRetards90JoursPlus" />
                  </div>
                </div>

                <div class="taux-preview">
                  <span>Taux d'endettement simulé</span>
                  <strong [class.danger]="tauxSimule >= 50" [class.warning]="tauxSimule >= 35 && tauxSimule < 50">
                    {{ tauxSimule | number:'1.0-1' }}%
                  </strong>
                </div>

                <button class="btn btn-primary block" (click)="createSimulation()"
                        [disabled]="!canSubmit() || isLoading">
                  {{ isLoading ? 'Calcul en cours…' : '▶ Lancer la simulation' }}
                </button>

                <!-- Résultat -->
                <div *ngIf="lastSimulation as r" class="result">
                  <div class="section-label success">Résultat de la simulation</div>
                  <div class="result-row"><span>Score simulé</span>
                    <strong [style.color]="scoreColor(r.scoreSimule || 0)">{{ r.scoreSimule | number:'1.0-0' }}/100</strong></div>
                  <div class="result-row" *ngIf="r.scoreReel != null"><span>Score réel</span>
                    <strong class="muted">{{ r.scoreReel | number:'1.0-0' }}/100</strong></div>
                  <div class="result-row" *ngIf="r.niveauRisqueSimule"><span>Niveau simulé</span>
                    <strong [style.color]="riskColor(r.niveauRisqueSimule)">{{ formatNiveau(r.niveauRisqueSimule) }}</strong></div>
                  <div class="result-row" *ngIf="r.tauxEndettementSimule"><span>Taux d'endettement simulé</span>
                    <strong>{{ r.tauxEndettementSimule | number:'1.0-1' }}%</strong></div>
                  <div class="narration" *ngIf="r.narrationSimulee">
                    <div class="section-label">Analyse simulée</div>
                    <p>{{ r.narrationSimulee }}</p>
                  </div>
                </div>

                <div *ngIf="successMessage" class="msg success">{{ successMessage }}</div>
                <div *ngIf="errorMessage" class="msg error">{{ errorMessage }}</div>
              </ng-container>
            </div>

            <!-- ── Historique (3 dernières) ── -->
            <div class="card history-card">
              <div class="history-head-row">
                <h3 class="card-title">Simulations récentes</h3>
                <a routerLink="/simulations/historique" class="see-all">Voir tout <app-icon name="arrow_forward" [size]="15"></app-icon></a>
              </div>
              <div *ngIf="recentSimulations.length; else emptyHistory" class="history-list">
                <div *ngFor="let sim of recentSimulations" class="history-item">
                  <div class="history-head">
                    <span class="hclient">{{ sim.clientNomComplet || clientName(sim.clientId) }}</span>
                    <span class="hdate">{{ (sim.createdAt || sim.dateCreation) | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <div class="history-body">
                    <div class="hrow"><span>Revenus / charges</span>
                      <span>{{ sim.revenusSimules | number:'1.0-0' }} / {{ sim.chargesSimulees | number:'1.0-0' }} DH</span></div>
                    <div class="hrow"><span>Taux d'endettement</span>
                      <span>{{ (sim.tauxEndettementSimule || 0) | number:'1.0-1' }}%</span></div>
                    <div class="hrow"><span>Score simulé</span>
                      <strong [style.color]="scoreColor(sim.scoreSimule || 0)">{{ sim.scoreSimule | number:'1.0-0' }}/100</strong></div>
                    <div class="hrow" *ngIf="sim.scoreReel != null"><span>Score réel</span>
                      <span class="muted">{{ sim.scoreReel | number:'1.0-0' }}/100</span></div>
                    <div class="hrow" *ngIf="sim.niveauRisqueSimule"><span>Niveau</span>
                      <strong [style.color]="riskColor(sim.niveauRisqueSimule)">{{ formatNiveau(sim.niveauRisqueSimule) }}</strong></div>
                  </div>
                </div>
              </div>
              <ng-template #emptyHistory>
                <div class="empty">Aucune simulation enregistrée</div>
              </ng-template>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .content { padding: var(--space-7); max-width: 1320px; margin: 0 auto; }

    .sim-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: var(--space-6); align-items: start; }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-6); }
    .card-title { margin: 0 0 var(--space-5) 0; font-size: 16px; font-weight: 600; color: var(--ink-900); font-family: var(--font-display); padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); }

    .section-label { font-size: 11px; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.5px; margin: var(--space-5) 0 var(--space-3); font-family: var(--font-body); }
    .section-label.success { color: var(--success); }

    .field { margin-bottom: var(--space-3); display: flex; flex-direction: column; }
    label { font-size: 13px; font-weight: 600; color: var(--ink-700); margin-bottom: 5px; font-family: var(--font-body); }
    .req { color: var(--danger); }
    .input { width: 100%; padding: 9px 11px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; font-family: var(--font-body); color: var(--ink-900); background: var(--surface); box-sizing: border-box; }
    .input:focus { outline: none; border-color: var(--sal-orange); box-shadow: 0 0 0 3px var(--sal-orange-tint); }
    .input.readonly { background: var(--surface-2); color: var(--ink-500); cursor: not-allowed; }
    .hint { font-size: 11px; color: var(--ink-500); font-family: var(--font-body); margin: -4px 0 var(--space-3); line-height: 1.5; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }

    .identity { background: var(--surface-2); border-radius: var(--radius-sm); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-2); }
    .identity .section-label { margin-top: 0; }
    .identity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .identity-grid > div { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-500); font-family: var(--font-body); }
    .identity-grid strong { color: var(--ink-900); }
    .mono { font-family: 'Courier New', monospace; }
    .muted { color: var(--ink-300); }

    .taux-preview { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--surface-2); border-radius: var(--radius-sm); font-size: 13px; color: var(--ink-700); font-family: var(--font-body); margin: var(--space-4) 0; }
    .taux-preview .warning { color: var(--sal-orange); }
    .taux-preview .danger { color: var(--danger); }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; font-family: var(--font-body); cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: var(--sal-orange); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--sal-orange-dark); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .block { width: 100%; }

    .result { margin-top: var(--space-4); padding: var(--space-4); background: var(--success-tint); border-radius: var(--radius-sm); border-left: 3px solid var(--success); }
    .result .section-label { margin-top: 0; }
    .result-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: var(--ink-700); font-family: var(--font-body); }
    .narration { margin-top: 10px; padding: 10px; background: var(--surface); border-radius: var(--radius-sm); }
    .narration p { margin: 0; font-size: 12px; color: var(--ink-700); line-height: 1.6; white-space: pre-line; font-family: var(--font-body); }

    .msg { margin-top: var(--space-3); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 13px; font-family: var(--font-body); }
    .msg.success { background: var(--success-tint); color: var(--success); }
    .msg.error { background: var(--danger-tint); color: var(--danger); }

    .history-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); }
    .history-head-row .card-title { margin: 0; padding: 0; border: none; }
    .see-all { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--sal-orange); text-decoration: none; }
    .see-all:hover { color: var(--sal-orange-dark); }
    .history-list { display: flex; flex-direction: column; gap: var(--space-3); }
    .history-item { border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
    .history-head { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: var(--surface-2); }
    .hclient { font-size: 13px; font-weight: 600; color: var(--ink-900); font-family: var(--font-body); }
    .hdate { font-size: 11px; color: var(--ink-500); font-family: var(--font-body); }
    .history-body { padding: 9px 12px; }
    .hrow { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: var(--ink-700); font-family: var(--font-body); }
    .empty { text-align: center; padding: var(--space-8) var(--space-5); color: var(--ink-500); font-size: 13px; font-family: var(--font-body); }

    @media (max-width: 1024px) { .sim-layout { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { .main-content { margin-left: 0; } .content { padding: var(--space-5); } .grid-2, .grid-3 { grid-template-columns: 1fr; } }
  `]
})
export class SimulationsComponent implements OnInit {
  clients: Client[] = [];
  simulations: Simulation[] = [];
  selectedClientId = '';
  selectedClient: Client | null = null;

  form: SimForm = this.emptyForm();
  tauxSimule = 0;
  // Saisie du crédit renouvelable en plafond/solde (comme la fiche client) ;
  // le % envoyé au backend reste form.utilisationCreditRenouvelable (payload inchangé).
  simPlafond = 0;
  simSolde = 0;
  lastSimulation: Simulation | null = null;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  readonly situationProOptions = [
    { value: 'CDI', label: 'Salarié (CDI)' },
    { value: 'CDD', label: 'Salarié (CDD)' },
    { value: 'INDEPENDANT', label: 'Indépendant' },
    { value: 'SANS_EMPLOI', label: 'Sans emploi' },
  ];
  readonly historiqueOptions = [
    { value: 'BON', label: 'Bon' },
    { value: 'MOYEN', label: 'Moyen' },
    { value: 'MAUVAIS', label: 'Mauvais' },
  ];

  constructor(
    private simulationService: SimulationService,
    private clientService: ClientService,
    private route: ActivatedRoute,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadClients();
    this.loadSimulations();
    // Pré-sélection du client via ?clientId= (raccourci « Nouvelle simulation »
    // depuis la fiche client) — le superviseur n'a pas à rechercher le client.
    const clientId = this.route.snapshot.queryParamMap.get('clientId');
    if (clientId) {
      this.selectedClientId = clientId;
      this.onClientSelected(clientId);
    }
  }

  /** Les 3 simulations les plus récentes (la liste complète est sur /simulations/historique). */
  get recentSimulations(): Simulation[] { return this.simulations.slice(0, 3); }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (data) => { this.clients = data; },
      error: (err) => console.error('Erreur chargement clients', err),
    });
  }

  loadSimulations(): void {
    this.simulationService.getSimulations().subscribe({
      next: (data) => { this.simulations = data; },
      error: (err) => console.error('Erreur chargement simulations', err),
    });
  }

  onClientSelected(clientId: string): void {
    this.lastSimulation = null;
    this.errorMessage = '';
    this.successMessage = '';
    if (!clientId) {
      this.selectedClient = null;
      this.form = this.emptyForm();
      this.tauxSimule = 0;
      return;
    }
    this.clientService.getClientById(clientId).subscribe({
      next: (client) => {
        this.selectedClient = client;
        this.simPlafond = 0;
        this.simSolde = 0;
        this.form = {
          revenusSimules: client.revenusMensuels,
          chargesSimulees: client.chargesMensuelles,
          situationPro: client.situationPro || 'CDI',
          historiqueFinancier: client.historiqueFinancier || 'MOYEN',
          nbRetards3059Jours: client.nbRetards3059Jours ?? 0,
          nbRetards6089Jours: client.nbRetards6089Jours ?? 0,
          nbRetards90JoursPlus: client.nbRetards90JoursPlus ?? 0,
          nbCreditsOuverts: client.nbCreditsOuverts ?? 0,
          nbPretsImmobiliers: client.nbPretsImmobiliers ?? 0,
          nbPersonnesACharge: client.nbPersonnesACharge ?? 0,
          utilisationCreditRenouvelable: client.utilisationCreditRenouvelable ?? 0,
        };
        this.recalcTaux();
      },
      error: (err) => console.error('Erreur chargement client', err),
    });
  }

  recalcTaux(): void {
    const r = Number(this.form.revenusSimules);
    const c = Number(this.form.chargesSimulees);
    this.tauxSimule = r > 0 ? Math.round((c / r) * 10000) / 100 : 0;
  }

  /** Même règle que la fiche client (client-form) : taux = min(solde/plafond × 100, 100),
   *  arrondi à 2 décimales. Tant qu'aucun plafond n'est saisi, la valeur actuelle du
   *  client est conservée (comportement identique au mode édition de la fiche client). */
  calculerUtilisationCredit(): void {
    if (Number(this.simPlafond) > 0) {
      const ratio = Math.min((Number(this.simSolde) / Number(this.simPlafond)) * 100, 100);
      this.form.utilisationCreditRenouvelable = Math.round(ratio * 100) / 100;
    } else {
      this.form.utilisationCreditRenouvelable = 0;
    }
  }

  canSubmit(): boolean {
    return !!this.selectedClientId && Number(this.form.revenusSimules) > 0 && Number(this.form.chargesSimulees) >= 0;
  }

  createSimulation(): void {
    if (!this.canSubmit()) {
      this.errorMessage = 'Veuillez sélectionner un client et saisir des revenus valides.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.simulationService.createSimulation({ clientId: this.selectedClientId, ...this.form }).subscribe({
      next: (sim) => {
        this.isLoading = false;
        this.lastSimulation = sim;
        this.simulations.unshift(sim);
        this.successMessage = 'Simulation enregistrée avec succès.';
        this.toast.success('Simulation terminée avec succès.');
        setTimeout(() => { this.successMessage = ''; }, 4000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la simulation.';
        this.toast.error(this.errorMessage);
      },
    });
  }

  clientName(clientId: string): string {
    const c = this.clients.find(cl => String(cl.id) === String(clientId));
    return c ? `${c.prenom} ${c.nom}` : `Client #${clientId}`;
  }

  scoreColor(score: number): string {
    if (score <= 30) return 'var(--success)';
    if (score <= 60) return 'var(--sal-orange)';
    return 'var(--danger)';
  }

  riskColor(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return 'var(--success)';
      case 'MOYEN': return 'var(--sal-orange)';
      case 'ELEVE': return 'var(--danger)';
      default: return 'var(--ink-500)';
    }
  }

  formatNiveau(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return 'Risque faible';
      case 'MOYEN': return 'Risque modéré';
      case 'ELEVE': return 'Risque élevé';
      default: return niveau;
    }
  }

  private emptyForm(): SimForm {
    return {
      revenusSimules: 0, chargesSimulees: 0, situationPro: '', historiqueFinancier: '',
      nbRetards3059Jours: 0, nbRetards6089Jours: 0, nbRetards90JoursPlus: 0,
      nbCreditsOuverts: 0, nbPretsImmobiliers: 0, nbPersonnesACharge: 0,
      utilisationCreditRenouvelable: 0,
    };
  }
}
