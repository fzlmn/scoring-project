import { Score } from "./score.model";

export interface Client {
  id?: string;
  nom: string;
  prenom: string;
  cin: string;
  dateNaissance: string;
  situationPro: string;
  revenusMensuels: number;
  chargesMensuelles: number;
  historiqueFinancier?: string;
  tauxEndettement?: number;
  dernierScore?: Score | null;
  dateCreation?: string;
  dateModification?: string;
}

export interface ClientFilters {
  nom?: string;
  cin?: string;
  status?: string;
}
