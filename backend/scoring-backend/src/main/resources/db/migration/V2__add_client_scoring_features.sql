-- ============================================================
--  Orus Services — Scoring Client
--  Migration V2 — Enrichissement des données client
--
--  Ajout des 7 champs nécessaires au modèle ML (Cascade B)
--  Ces champs remplacent définitivement les proxies de main.py.
--  Sources : bureau de crédit (ESM/Quantik) ou auto-déclaration client.
-- ============================================================

-- Retards de paiement (bureau de crédit ou auto-déclaration)
ALTER TABLE clients
    ADD COLUMN nb_retards_30_59_jours  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN nb_retards_60_89_jours  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN nb_retards_90_jours_plus INTEGER NOT NULL DEFAULT 0;

-- Crédits et engagements (bureau de crédit ou auto-déclaration)
ALTER TABLE clients
    ADD COLUMN nb_credits_ouverts       INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN nb_prets_immobiliers     INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN nb_personnes_a_charge    INTEGER NOT NULL DEFAULT 0;

-- Crédit renouvelable (calculé depuis plafond/solde déclarés, ou 0)
-- Stocké en pourcentage : 0.0 à 100.0
ALTER TABLE clients
    ADD COLUMN utilisation_credit_renouvelable DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- ── Commentaires métier ───────────────────────────────────────────────────
COMMENT ON COLUMN clients.nb_retards_30_59_jours IS
    'Nombre de fois où le client a eu un retard de 30 à 59 jours. Source : bureau ESM/Quantik ou déclaration client.';
COMMENT ON COLUMN clients.nb_retards_60_89_jours IS
    'Nombre de fois où le client a eu un retard de 60 à 89 jours. Source : bureau ESM/Quantik ou déclaration client.';
COMMENT ON COLUMN clients.nb_retards_90_jours_plus IS
    'Nombre de fois où le client a eu un retard de 90 jours ou plus. Source : bureau ESM/Quantik ou déclaration client.';
COMMENT ON COLUMN clients.nb_credits_ouverts IS
    'Nombre total de crédits en cours (toutes institutions). Source : bureau ESM/Quantik ou déclaration client.';
COMMENT ON COLUMN clients.nb_prets_immobiliers IS
    'Nombre de prêts immobiliers en cours. Source : bureau ESM/Quantik ou déclaration client.';
COMMENT ON COLUMN clients.nb_personnes_a_charge IS
    'Nombre de personnes à la charge financière du client (enfants, parents, etc.).';
COMMENT ON COLUMN clients.utilisation_credit_renouvelable IS
    'Taux d utilisation du crédit renouvelable en % (solde / plafond × 100). 0 si pas de carte crédit.';
