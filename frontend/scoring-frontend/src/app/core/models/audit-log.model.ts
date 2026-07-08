export interface AuditLog {
  id?: string;
  userId?: string | number;
  /** Nom complet de l'utilisateur, fourni par l'API (AuditLogResponse). */
  userNomComplet?: string;
  action: string;
  /** Entité concernée : "CLIENT", "SCORE", "ALERTE", "USER". */
  entite?: string;
  entiteId?: string | number;
  /** Libellé lisible de la cible (client/utilisateur concerné), résolu par l'API. */
  cible?: string;
  createdAt?: string;

  // Champs optionnels (détail d'audit — non encore exposés par l'API).
  ancienneValeur?: any;
  nouvelleValeur?: any;

  // ── Anciens noms (compat) ────────────────────────────────────────────
  ressource?: string;
  ressourceId?: string;
  dateCreation?: string;
}
