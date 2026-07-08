-- ============================================================
--  Orus Services — Scoring Client
--  Migration V4 — Backfill de decided_at sur l'historique décidé
--
--  V3 a ajouté la colonne decided_at (NULL par défaut). Pour que le
--  dashboard superviseur ("validés / rejetés aujourd'hui", évolution
--  des validations) ne soit pas vide tant qu'aucune nouvelle décision
--  n'a lieu, on initialise decided_at à created_at pour les scores
--  déjà tranchés (VALIDE / REJETE).
--
--  La date exacte de décision n'ayant pas été historisée, created_at
--  en est la meilleure approximation disponible. Les décisions futures
--  horodatent decided_at précisément (ScoreService.validerScore).
--  Idempotent : ne touche que les lignes encore à NULL.
-- ============================================================

UPDATE scores
   SET decided_at = created_at
 WHERE statut IN ('VALIDE', 'REJETE')
   AND decided_at IS NULL;
