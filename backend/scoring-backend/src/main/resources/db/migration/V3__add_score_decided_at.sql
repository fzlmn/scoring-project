-- ============================================================
--  Orus Services — Scoring Client
--  Migration V3 — Horodatage de la décision de validation
--
--  Ajoute la date à laquelle un score a été validé ou rejeté
--  par le superviseur. Indispensable pour les indicateurs
--  "validés / rejetés aujourd'hui" et l'évolution des
--  validations dans le temps (dashboard superviseur).
--
--  Les scores déjà décidés avant cette migration restent à NULL :
--  leur date de décision réelle est inconnue et n'est pas inventée.
-- ============================================================

ALTER TABLE scores ADD COLUMN decided_at TIMESTAMP;

COMMENT ON COLUMN scores.decided_at IS
    'Date de validation ou de rejet du score par le superviseur. NULL tant que le score est EN_ATTENTE.';

CREATE INDEX idx_scores_decided_at ON scores(decided_at);
