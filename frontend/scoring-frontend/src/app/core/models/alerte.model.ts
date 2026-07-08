export interface Alerte {
  id?: number;
  clientId?: number;
  clientNomComplet?: string;
  scoreId?: number;
  typeAlerte: string;
  description: string;
  criticite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE' | 'CRITIQUE';
  statut: 'NON_LUE' | 'LUE' | 'TRAITEE';
  createdAt?: string;
}

export interface AlerteSummary {
  total: number;
  nonLues: number;
  critiques: number;
}
