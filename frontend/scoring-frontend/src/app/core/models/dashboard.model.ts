export interface DashboardData {
  role?: string;
  totalClients: number;
  scoresEnAttente: number;
  scoresValides: number;
  scoresRejetes: number;
  alertesActives: number;
  clientsFaibleRisque: number;
  clientsMoyenRisque: number;
  clientsEleveRisque: number;

  // ── Chargé de clientèle (portefeuille) ──────────────────────────────────
  mesClients: number;
  mesScoresEnAttente: number;
  mesScoresValides: number;
  mesScoresRejetes: number;
  repartitionSituationPro: CategoryCount[];
  repartitionRevenus: CategoryCount[];
  repartitionAge: CategoryCount[];
  clientsParMois: CategoryCount[];

  // ── Superviseur (pilotage) ──────────────────────────────────────────────
  decisionsEnAttente: number;
  scoresValidesAujourdhui: number;
  scoresRejetesAujourdhui: number;
  clientsHautRisque: number;
  repartitionValidations: CategoryCount[];
  scoresParJour: CategoryCount[];
  evolutionValidations: DecisionPoint[];

  // ── Administrateur ──────────────────────────────────────────────────────
  totalUtilisateurs: number;
  utilisateursActifs: number;
  totalSimulations: number;
  totalAlertes: number;

  repartitionRisques: RiskDistribution[];
  scoresRecents: RecentScore[];
  alertesRecentes: RecentAlerte[];
}

export interface RiskDistribution {
  niveau: string;
  count: number;
  couleur: string;
}

/** Couple libellé / valeur générique pour les graphiques (barres, parts, séries). */
export interface CategoryCount {
  label: string;
  count: number;
}

/** Point d'une série temporelle de décisions (validés vs rejetés). */
export interface DecisionPoint {
  periode: string;
  valides: number;
  rejetes: number;
}

export interface RecentScore {
  clientNom: string;
  valeur: number;
  niveau: string;
  dateCalcul: string;
}

export interface RecentAlerte {
  criticite: string;
  typeAlerte: string;
  description: string;
  createdAt: string;
}

export interface KPI {
  label: string;
  value: number;
  icon: string;
  couleur: string;
}
