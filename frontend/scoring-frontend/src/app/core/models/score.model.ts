export interface Score {
  id?: string;
  clientId: string;
  valeurScore: number;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  narration?: string;
  explications?: Explication[];
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  createdAt?: string;
  dateValidation?: string;
  validePar?: string;
}

/** Facteur d'explication SHAP (aligné sur ExplicationResponse côté backend). */
export interface Explication {
  featureName: string;
  shapValue: number;
  direction: boolean;      // true = augmente le risque, false = facteur protecteur
  ordreImportance: number;
}

export interface ScoreSummary {
  totalEnAttente: number;
  totalValides: number;
  totalRejetes: number;
  scoreMoyen: number;
}

/** Ligne allégée renvoyée par GET /api/scores (historique) — sans narration ni SHAP. */
export interface ScoreListItem {
  id: number;
  clientId: number;
  clientNomComplet: string;
  valeurScore: number;
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  versionModele?: string;
  createdAt: string;
  decidedAt?: string | null;
}

/** Enveloppe de pagination alignée sur PageResponse<T> côté backend. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Paramètres optionnels de recherche paginée des scores. */
export interface ScoreQuery {
  statut?: string;
  niveauRisque?: string;
  clientId?: number | string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}
