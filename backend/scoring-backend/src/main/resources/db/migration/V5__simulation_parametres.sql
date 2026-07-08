-- ============================================================
--  Orus Services — Scoring Client
--  Migration V5 — Instantané des paramètres de simulation
--
--  La simulation « what-if » permet désormais de surcharger toutes les
--  données financières / de scoring (pas seulement revenus & charges).
--  On persiste l'ensemble des paramètres effectivement simulés sous forme
--  d'instantané JSON, afin que l'historique reste fidèle sans élargir le
--  schéma à chaque nouvelle variable du modèle.
--
--  Colonne additive et nullable : les simulations existantes restent valides.
-- ============================================================

ALTER TABLE simulations
    ADD COLUMN IF NOT EXISTS parametres_simules TEXT;
