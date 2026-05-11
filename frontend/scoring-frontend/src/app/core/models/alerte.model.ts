export interface Alerte {
  id?: string;
  clientId: string;
  type: string;
  description: string;
  criticite: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  statut: 'NON_LUE' | 'LUE' | 'TRAITEE';
  dateCreation?: string;
  dateTraitement?: string;
}

export interface AlerteSummary {
  total: number;
  nonLues: number;
  critiques: number;
}
