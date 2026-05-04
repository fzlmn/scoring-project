-- ============================================================
--  Orus Services — Scoring Client
--  Migration unique V1 — schéma complet
-- ============================================================

-- Table des utilisateurs
CREATE TABLE users (
                       id          BIGSERIAL PRIMARY KEY,
                       nom         VARCHAR(100)  NOT NULL,
                       prenom      VARCHAR(100)  NOT NULL,
                       email       VARCHAR(150)  NOT NULL UNIQUE,
                       password    VARCHAR(255)  NOT NULL,
                       role        VARCHAR(20)   NOT NULL,
                       actif       BOOLEAN       NOT NULL DEFAULT TRUE,
                       created_at  TIMESTAMP     DEFAULT NOW(),
                       updated_at  TIMESTAMP     DEFAULT NOW()
);

-- Table des clients
CREATE TABLE clients (
                         id                   BIGSERIAL PRIMARY KEY,
                         nom                  VARCHAR(100)  NOT NULL,
                         prenom               VARCHAR(100)  NOT NULL,
                         cin                  VARCHAR(20)   NOT NULL UNIQUE,
                         date_naissance       DATE          NOT NULL,
                         situation_pro        VARCHAR(20)   NOT NULL,
                         revenus_mensuels     DOUBLE PRECISION NOT NULL,
                         charges_mensuelles   DOUBLE PRECISION NOT NULL,
                         taux_endettement     DOUBLE PRECISION,
                         historique_financier VARCHAR(10)   NOT NULL,
                         created_by           BIGINT        REFERENCES users(id),
                         created_at           TIMESTAMP     DEFAULT NOW(),
                         updated_at           TIMESTAMP     DEFAULT NOW()
);

-- Table des scores
CREATE TABLE scores (
                        id             BIGSERIAL PRIMARY KEY,
                        client_id      BIGINT           NOT NULL REFERENCES clients(id),
                        valeur_score   DOUBLE PRECISION NOT NULL,
                        niveau_risque  VARCHAR(10)      NOT NULL,
                        statut         VARCHAR(15)      NOT NULL DEFAULT 'EN_ATTENTE',
                        narration      TEXT,
                        version_modele VARCHAR(20),
                        calculated_by  BIGINT,
                        created_at     TIMESTAMP        DEFAULT NOW()
);

-- Table des explications SHAP
CREATE TABLE explications (
                              id               BIGSERIAL PRIMARY KEY,
                              score_id         BIGINT           NOT NULL REFERENCES scores(id),
                              feature_name     VARCHAR(100)     NOT NULL,
                              shap_value       DOUBLE PRECISION NOT NULL,
                              direction        BOOLEAN          NOT NULL,
                              ordre_importance INTEGER          NOT NULL
);

-- Table des alertes
CREATE TABLE alertes (
                         id          BIGSERIAL PRIMARY KEY,
                         client_id   BIGINT      NOT NULL REFERENCES clients(id),
                         score_id    BIGINT      REFERENCES scores(id),
                         type_alerte VARCHAR(30) NOT NULL,
                         criticite   VARCHAR(15) NOT NULL,
                         statut      VARCHAR(15) NOT NULL DEFAULT 'NON_LUE',
                         description TEXT,
                         created_at  TIMESTAMP   DEFAULT NOW()
);

-- Table des simulations
CREATE TABLE simulations (
                             id                      BIGSERIAL PRIMARY KEY,
                             client_id               BIGINT           NOT NULL REFERENCES clients(id),
                             superviseur_id          BIGINT           NOT NULL REFERENCES users(id),
                             revenus_simules         DOUBLE PRECISION NOT NULL,
                             charges_simulees        DOUBLE PRECISION NOT NULL,
                             taux_endettement_simule DOUBLE PRECISION,
                             score_simule            DOUBLE PRECISION NOT NULL,
                             score_reel              DOUBLE PRECISION,
                             niveau_risque_simule    VARCHAR(10)      NOT NULL,
                             narration_simulee       TEXT,
                             created_at              TIMESTAMP        DEFAULT NOW()
);

-- Table des journaux d'audit (traçabilité des actions)
CREATE TABLE audit_logs (
                            id          BIGSERIAL PRIMARY KEY,
                            user_id     BIGINT       REFERENCES users(id),
                            action      VARCHAR(100) NOT NULL,
                            entite VARCHAR(50),
                            entite_id   BIGINT,
                            details     TEXT,
                            created_at  TIMESTAMP    DEFAULT NOW()
);


-- Index utiles
CREATE INDEX idx_clients_cin              ON clients(cin);
CREATE INDEX idx_scores_client            ON scores(client_id);
CREATE INDEX idx_scores_statut            ON scores(statut);
CREATE INDEX idx_alertes_client           ON alertes(client_id);
CREATE INDEX idx_alertes_statut           ON alertes(statut);
CREATE INDEX idx_simulations_client       ON simulations(client_id);
CREATE INDEX idx_simulations_superviseur  ON simulations(superviseur_id);
CREATE INDEX idx_audit_logs_user          ON audit_logs(user_id);

