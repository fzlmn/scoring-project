-- ============================================================
--  Orus Services — Scoring Client
--  Migration V6 — Crédit renouvelable : stockage plafond + solde
--
--  Jusqu'ici seul le POURCENTAGE d'utilisation était stocké
--  (utilisation_credit_renouvelable), ce qui empêchait de retrouver
--  les montants d'origine lors d'une modification ou d'une simulation.
--
--  On stocke désormais les deux montants sources. Le pourcentage reste
--  la valeur utilisée par le modèle ML (payload inchangé) : il est
--  recalculé automatiquement = min(solde / plafond × 100, 100) dès que
--  le plafond est renseigné. Colonnes nullables : les clients existants
--  (créés avant cette migration) conservent leur pourcentage tel quel.
-- ============================================================

ALTER TABLE clients
    ADD COLUMN plafond_credit DOUBLE PRECISION,
    ADD COLUMN solde_credit   DOUBLE PRECISION;

COMMENT ON COLUMN clients.plafond_credit IS
    'Plafond du crédit renouvelable en DH (montant source). NULL pour les clients antérieurs à V6 ou sans crédit renouvelable.';
COMMENT ON COLUMN clients.solde_credit IS
    'Solde utilisé du crédit renouvelable en DH (montant source). NULL pour les clients antérieurs à V6 ou sans crédit renouvelable.';
