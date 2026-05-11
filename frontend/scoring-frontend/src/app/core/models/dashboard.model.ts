export interface DashboardData {
  totalClients: number;
  scoresEnAttente: number;
  alertesActives: number;
  scoreMoyen: number;
  repartitionRisques: RiskDistribution[];
  distributionScores: ScoreDistribution[];
  scoresRecents: any[];
  alertesRecentes: any[];
}

export interface RiskDistribution {
  niveau: string;
  count: number;
  couleur: string;
}

export interface ScoreDistribution {
  plage: string;
  count: number;
}

export interface KPI {
  label: string;
  value: number;
  icon: string;
  couleur: string;
}
