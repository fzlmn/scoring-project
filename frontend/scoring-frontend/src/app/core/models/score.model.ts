export interface Score {
  id?: string;
  clientId: string;
  valeurScore: number;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  narration?: string;
  facteurs?: SHAPFactor[];
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  dateCalcul?: string;
  dateValidation?: string;
  validePar?: string;
}

export interface SHAPFactor {
  nom: string;
  valeur: number;
  impact: number;
}

export interface ScoreSummary {
  totalEnAttente: number;
  totalValides: number;
  totalRejetes: number;
  scoreMoyen: number;
}
