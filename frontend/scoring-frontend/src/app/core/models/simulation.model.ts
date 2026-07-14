export interface Simulation {
  id?: string;
  clientId: string;
  clientNomComplet?: string;
  revenusSimules: number;
  chargesSimulees: number;
  scoreSimule?: number;
  scoreReel?: number;
  tauxEndettementSimule?: number;
  niveauRisqueSimule?: string;
  narrationSimulee?: string;
  /** Instantané des paramètres effectivement simulés (what-if complet). */
  parametresSimules?: Record<string, unknown>;
  createdAt?: string;
  dateCreation?: string;
  creePar?: string;
}

/**
 * Requête de simulation « what-if » : le client cible est immuable (identité),
 * mais toute donnée financière / de scoring peut être surchargée. Les champs
 * omis conservent la valeur réelle du client.
 */
export interface SimulationRequest {
  clientId: string | number;
  revenusSimules: number;
  chargesSimulees: number;
  situationPro?: string;
  historiqueFinancier?: string;
  nbRetards3059Jours?: number;
  nbRetards6089Jours?: number;
  nbRetards90JoursPlus?: number;
  nbCreditsOuverts?: number;
  nbPretsImmobiliers?: number;
  nbPersonnesACharge?: number;
  utilisationCreditRenouvelable?: number;
  plafondCredit?: number | null;
  soldeCredit?: number | null;
}
