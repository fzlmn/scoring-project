import { Score } from "./score.model";

export interface Client {
  id?: string;
  nom: string;
  prenom: string;
  cin: string;
  dateNaissance: string;
  age?: number;
  situationPro: string;
  revenusMensuels: number;
  chargesMensuelles: number;
  tauxEndettement?: number;
  historiqueFinancier?: string;

  // ── Données bureau de crédit / auto-déclaration ──────────────────────
  nbRetards3059Jours?: number;
  nbRetards6089Jours?: number;
  nbRetards90JoursPlus?: number;
  nbCreditsOuverts?: number;
  nbPretsImmobiliers?: number;
  nbPersonnesACharge?: number;
  utilisationCreditRenouvelable?: number;

  // ── Score et métadonnées ─────────────────────────────────────────────
  dernierScore?: Score | null;
  createdAt?: string;
}

export interface ClientFilters {
  nom?: string;
  cin?: string;
  status?: string;
}
