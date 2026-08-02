<div align="center">

# OScore

### Plateforme de risque de crédit assistée par IA

Application intelligente de scoring de crédit : évaluation du risque automatisée et
**explicable**, avec validation supervisée, simulations « what-if », alertes et tableaux
de bord par rôle.

[![Frontend](https://img.shields.io/badge/Frontend-Angular%2017-DD0031)](frontend/scoring-frontend)
[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%204-6DB33F)](backend/scoring-backend)
[![ML](https://img.shields.io/badge/ML-FastAPI%20%2B%20XGBoost-009688)](ml-service)
[![DB](https://img.shields.io/badge/DB-PostgreSQL%2015-4169E1)](docker-compose.yml)
[![Docker](https://img.shields.io/badge/Orchestration-Docker%20Compose-2496ED)](DOCKER.md)

</div>

---

## Table des matières

- [Présentation du projet](#présentation-du-projet)
- [Fonctionnalités clés](#fonctionnalités-clés)
- [Architecture du système](#architecture-du-système)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Authentification et rôles](#authentification-et-rôles)
- [Modèle de domaine et base de données](#modèle-de-domaine-et-base-de-données)
- [Chaîne de traitement Machine Learning](#chaîne-de-traitement-machine-learning)
- [Processus applicatif](#processus-applicatif)
- [Captures d'écran](#captures-décran)
- [Installation](#installation)
- [Exécution avec Docker](#exécution-avec-docker)
- [Exécution en local (sans Docker)](#exécution-en-local-sans-docker)
- [Variables d'environnement](#variables-denvironnement)
- [Comptes par défaut](#comptes-par-défaut)
- [Structure des dossiers](#structure-des-dossiers)
- [Améliorations futures](#améliorations-futures)
- [Licence](#licence)

---

## Présentation du projet

**OScore** est un Projet de Fin d'Année (PFA) réalisé lors d'une alternance d'ingénieur
chez Orus Services. Il s'agit d'une plateforme de scoring de risque de crédit qui permet à
une équipe crédit de saisir les profils financiers des clients, de les évaluer au regard du
**risque de crédit** à l'aide d'un modèle de machine learning, d'**expliquer** chaque score
par des facteurs SHAP et une narration en langage naturel, de faire transiter les scores par
un processus de **validation** humaine, de lancer des **simulations** « what-if » et de
surveiller le risque via des **alertes** et des tableaux de bord par rôle.

> OScore a été conçu dans le contexte de flux de travail réels de risque de crédit. C'est
> un projet académique indépendant qui n'est **pas** un produit officiel de — ni déployé
> par — Salafin ou Bank of Africa.

La plateforme se décompose en trois services coopérants — une application monopage Angular,
une API REST Spring Boot et un micro-service de Machine Learning en Python — s'appuyant sur
PostgreSQL et orchestrés avec Docker Compose.

Principes de conception :

- **L'explicabilité d'abord** — chaque Score est livré avec ses principaux facteurs SHAP et
  une narration lisible ; le modèle est soumis à des contraintes de monotonie afin que son
  comportement soit défendable.
- **L'humain dans la boucle** — le modèle *assiste* ; un Superviseur valide ou rejette
  chaque Score. Rien n'est approuvé automatiquement.
- **Le moindre privilège** — quatre rôles aux permissions strictement délimitées, appliquées
  côté serveur sur chaque endpoint.
- **L'auditabilité** — chaque action sensible est inscrite dans un journal d'audit immuable.

---

## Fonctionnalités clés

| Domaine | Capacités |
|--------|--------------|
| **Clients** | Création, modification, liste (recherche / filtrage / tri), vue détaillée, export Excel |
| **Scores** | Scoring ML automatique à la création d'un client, historique des scores, niveau de risque (Faible / Moyen / Élevé), explication SHAP + narration, recalcul manuel |
| **Validation** | File d'attente, approbation / rejet avec horodatage de la décision, historique de validation |
| **Simulations** | Scoring « what-if » (surcharge des revenus, charges, utilisation du crédit…) sans toucher aux données réelles du client ; comparaison réel/simulé ; historique |
| **Alertes** | Alertes de risque automatiques (score élevé, taux d'endettement élevé, données incohérentes, validation en attente…), lues/non lues, marquage comme vues |
| **Tableaux de bord** | KPIs par rôle, graphiques et widgets d'évolution avec sélection de période |
| **Administration** | CRUD des utilisateurs, activation/désactivation, attribution de rôle, réinitialisation de mot de passe, journal d'audit immuable |
| **Sécurité** | Authentification JWT, RBAC au niveau des méthodes, sessions sans état |

---

## Architecture du système

```
                         ┌──────────────────────────────┐
                         │        Browser (host)         │
                         │   Angular 17 SPA · :4200      │
                         └───────────────┬──────────────┘
                                         │  HTTPS/JSON + JWT (Bearer)
                                         ▼
                         ┌──────────────────────────────┐
                         │   Spring Boot REST API :8080  │
                         │  Security · JWT · RBAC · JPA  │
                         └──────┬─────────────────┬──────┘
                    JDBC        │                 │   HTTP/JSON (/predict)
                                ▼                 ▼
              ┌────────────────────────┐   ┌───────────────────────────┐
              │   PostgreSQL 15 :5432  │   │   ML Service (FastAPI)     │
              │   Flyway-migrated      │   │   XGBoost + SHAP · :8000   │
              └────────────────────────┘   └───────────────────────────┘
```

![Architecture générale d'OScore](docs/diagrams/architecture-diagram.png)

*Figure — Architecture générale : SPA Angular (présentation), API Spring Boot (métier & sécurité), micro-service ML FastAPI (scoring & explicabilité) et PostgreSQL, orchestrés avec Docker Compose.*

- Le **navigateur** dialogue avec le backend sur `http://localhost:8080` ; les appels du
  navigateur ne peuvent pas résoudre les noms de services Docker, le frontend utilise donc
  toujours `localhost`.
- **Backend → PostgreSQL** et **Backend → service ML** communiquent sur le réseau Compose
  via les noms de services (`postgres`, `ml-service`).
- Le **service ML** est appelé à la demande, uniquement au moment du scoring. Les scores,
  facteurs et narrations sont persistés par le backend.

Voir [`DOCKER.md`](DOCKER.md) pour le modèle complet de conteneurs/réseau et
[`docs/diagrams/`](docs/diagrams/) pour les diagrammes UML/architecture.

---

## Stack technique

| Couche | Technologie |
|-------|-----------|
| **Frontend** | Angular 17.3 (composants standalone), TypeScript, RxJS |
| **Backend** | Spring Boot 4.0.5, Java 21, Spring Security, Spring Data JPA, Flyway, Apache POI (Excel) |
| **Authentification** | JWT (JJWT 0.12, HS512) |
| **Machine Learning** | Python 3, FastAPI, Uvicorn, XGBoost, scikit-learn, SHAP, pandas, NumPy |
| **Base de données** | PostgreSQL 15 |
| **Outillage** | Docker & Docker Compose, pgAdmin, Maven, Angular CLI |

---

## Structure du projet

```
scoring-project/
├── frontend/scoring-frontend/     # Angular SPA (see its README)
├── backend/scoring-backend/       # Spring Boot REST API (see its README)
├── ml-service/                    # FastAPI ML micro-service (see its README)
├── pgadmin/                       # Pre-registered pgAdmin server config
├── docs/                          # Screenshots & diagrams for the report
├── docker-compose.yml             # Full-stack orchestration
├── DOCKER.md                      # Docker architecture & operations
└── README.md                      # This file
```

![Organisation du dépôt du projet OScore](docs/diagrams/repository-tree.png)

*Figure — Organisation du dépôt : les trois services (frontend, backend, service ML), l'infrastructure et la documentation.*

---

## Authentification et rôles

L'authentification repose sur un **JWT sans état**. Le client se connecte via
`POST /api/auth/login`, reçoit un jeton signé et l'envoie sous la forme
`Authorization: Bearer <token>` à chaque requête. Un guard de route protège la SPA ;
**l'autorisation est appliquée côté serveur** par des vérifications au niveau des méthodes
(`@PreAuthorize`) sur chaque endpoint — les restrictions de l'interface ne sont qu'un
confort, l'API fait foi.

Il existe quatre **rôles** :

| Rôle | Objectif | Peut faire | Ne peut pas faire |
|------|---------|--------|-----------|
| **ADMINISTRATEUR** | Administration de la plateforme | Gérer les utilisateurs (CRUD, activer/désactiver, réinitialiser le mot de passe, attribuer des rôles), consulter le journal d'audit, voir les alertes | Aucun accès opérationnel aux Clients / Scores / Simulations |
| **SUPERVISEUR** | Supervision du risque | Tout l'opérationnel : consulter Clients & Scores, **valider/rejeter les Scores**, recalculer, lancer des **Simulations**, gérer les **Alertes** | Administration des utilisateurs |
| **CHARGE_CLIENTELE** | Chargé de clientèle | Créer & modifier des Clients (le scoring s'exécute automatiquement), consulter son portefeuille et le score une fois **validé** (valeur seule), exporter | Voir l'explication SHAP, valider des scores, simuler, alertes, administration |
| **ANALYSTE** | Analyste en lecture seule | Consulter les tableaux de bord, Clients, Scores, explications SHAP, statut de validation | **Toute action d'écriture** — valider, recalculer, simuler, alertes, administration |

> Le rôle **Analyste** est strictement en lecture seule : tout endpoint mutant lui renvoie
> `403 Forbidden`, au niveau de l'API.

![Diagramme de cas d'utilisation par rôle](docs/diagrams/use-case-diagram.png)

*Figure — Cas d'utilisation par rôle, dérivés des règles `@PreAuthorize` côté serveur et de la navigation de la SPA.*

---

## Modèle de domaine et base de données

Le backend persiste un modèle de domaine relationnel compact. Le **diagramme de classes**
présente les entités JPA et les énumérations qu'elles utilisent ; le **diagramme
entité-association** présente le schéma PostgreSQL construit par les migrations Flyway
(`V1 → V6`).

![Diagramme de classes du domaine](docs/diagrams/class-diagram.png)

*Figure — Modèle de domaine : entités (User, Client, Score, Explication, Alerte, Simulation, AuditLog) et leurs énumérations.*

![Diagramme entité-association de la base de données](docs/diagrams/er-diagram.png)

*Figure — Schéma relationnel (PostgreSQL) : tables, colonnes, clés primaires et étrangères.*

---

## Chaîne de traitement Machine Learning

Le service de **Machine Learning** évalue le **risque de crédit** sous forme de probabilité
de défaut (PD) calibrée. La sélection et l'évaluation du modèle sont documentées phase par
phase dans [`ml-service/docs/`](ml-service/docs/).

**Pipeline d'entraînement** (hors ligne, reproductible depuis les notebooks) :

```
Give Me Some Credit dataset
   → semantic cleaning (clean_gmsc: sentinels, placeholders, 2 missingness flags)
   → fitted preprocessor (winsorization fitted on train only)
   → XGBoost with monotonic constraints
   → isotonic calibration (raw PD → calibrated PD)
   → decision threshold optimization (F1-optimal)
```

**Pipeline d'inférence** (en ligne, à chaque requête) :

```
Backend payload (14 fields)
   → 10 raw credit-bureau variables (+ 2 computed indicators = 12 features)
   → clean_gmsc → embedded preprocessor → XGBoost → isotonic calibrator
   → calibrated PD → risk level + decision + SHAP factors + French narration
```

![Pipeline d'inférence du service ML](docs/diagrams/ml-inference-pipeline.png)

*Figure — Pipeline d'inférence : du payload envoyé par le backend jusqu'à la réponse JSON (PD calibrée, niveau de risque, décision, facteurs SHAP et narration).*

- **Explicabilité** — un `TreeExplainer` SHAP produit les principaux facteurs contributifs
  (signés, classés) ; une narration les transforme en français lisible. Les deux sont
  persistés avec le Score.
- **Deux seuils, deux rôles** — un **seuil de décision** (≈ 0.223, F1-optimal) signale un
  *risque élevé* ; un **seuil de surveillance** (≈ 0.101, F2-optimal) pilote uniquement
  l'affichage Faible/Moyen/Élevé. Aucun des deux ne modifie le modèle ni sa calibration.
- **Performance officielle sur le test** (évaluation unique sur jeu de hold-out) :
  **ROC-AUC 0.8627**, PR-AUC 0.4060, KS 0.5726, Brier 0.0489, ECE 0.0030.

---

## Processus applicatif

Cycle de vie typique d'un Score :

1. Un **Chargé de clientèle** crée un **Client** → le backend appelle le service ML et
   persiste un **Score** (`EN_ATTENTE`) avec ses facteurs SHAP et une narration.
2. Des règles métier peuvent **escalader** le niveau de risque (par ex. taux d'endettement
   ≥ 50 %) et déclencher des **Alertes**.
3. Un **Superviseur** examine le Score en attente et le **valide** ou le **rejette** ; la
   décision et son horodatage sont enregistrés, et l'action est auditée.
4. Toute personne disposant d'un accès peut consulter le Score, son **explication SHAP** et
   son statut de validation ; le Superviseur peut **recalculer** ou lancer une
   **Simulation**.
5. L'**Administrateur** supervise les utilisateurs et consulte le **journal d'audit**.

Le processus métier de bout en bout est illustré ci-dessous.

![Processus métier du scoring de crédit](docs/diagrams/credit-scoring-workflow.png)

*Figure — Processus métier de bout en bout : de la création du client au scoring, à la génération d'alertes et à la validation par le superviseur.*

L'interaction **création d'un client → scoring automatique** entre les services :

![Diagramme de séquence création client et scoring](docs/diagrams/client-scoring-sequence.png)

*Figure — Séquence : un Chargé de clientèle crée un client ; le backend demande un score au service ML, applique les règles métier et persiste le Score (`EN_ATTENTE`) avec ses facteurs SHAP.*

Diagrammes UML de séquence et d'activité détaillés pour chaque workflow :

![Séquence d'authentification (JWT)](docs/diagrams/jwt-auth-sequence.png)

*Figure — Authentification : la connexion émet un JWT signé ; chaque requête ultérieure est validée et autorisée selon le rôle.*

![Séquence de validation d'un score](docs/diagrams/score-validation-sequence.png)

*Figure — Validation : un superviseur examine un score en attente (valeur, facteurs SHAP, données client) et le valide ou le rejette ; les alertes liées sont résolues et la décision est auditée.*

![Diagramme d'activité de la validation](docs/diagrams/validation-activity-diagram.png)

*Figure — Vue en diagramme d'activité du processus de validation, incluant l'escalade du risque et la résolution des alertes.*

![Séquence de recalcul manuel](docs/diagrams/score-recalculation-sequence.png)

*Figure — Recalcul : un superviseur recalcule le score d'un client ; le nouveau score retourne dans la file de validation.*

![Séquence de simulation « what-if »](docs/diagrams/simulation-sequence.png)

*Figure — Simulation : un superviseur exécute un scénario « what-if » sans altérer les données réelles du client ni son score officiel.*

![Séquence de gestion des alertes](docs/diagrams/alert-management-sequence.png)

*Figure — Alertes : générées automatiquement par les règles métier, puis consultées et traitées par le superviseur.*

---

## Captures d'écran

OScore est une application **basée sur les rôles** : chacun des quatre rôles voit un
ensemble d'écrans différent, appliqué côté serveur. Les captures ci-dessous (stockées sous
[`docs/screenshots/`](docs/screenshots/)) sont regroupées par rôle et suivent le workflow
réel de l'application.

### Commun à tous les rôles

Chaque utilisateur s'authentifie via la même page de connexion et peut consulter son propre
profil (en lecture seule — les modifications de compte sont réalisées par un administrateur).

| Connexion | Profil |
|:---:|:---:|
| ![Connexion](docs/screenshots/login-page.jpg) | ![Profil](docs/screenshots/profil.png) |

### Administrateur

*Administration de la plateforme : gère les comptes utilisateurs (création, modification,
activation/désactivation, réinitialisation de mot de passe, attribution de rôles) et
consulte le journal d'audit immuable. L'administrateur n'a aucun accès opérationnel aux
Clients, Scores ou Simulations.*

Tableau de bord — KPIs de gouvernance, utilisateurs par rôle et activité récente :

![Tableau de bord admin (1/2)](docs/screenshots/admin-dashboard1.png)
*Tableau de bord administrateur (1/2) : utilisateurs totaux/actifs/désactivés et répartition par rôle.*

![Tableau de bord admin (2/2)](docs/screenshots/admin-dashboard2.png)
*Tableau de bord administrateur (2/2) : évolution des créations de comptes et utilisateurs récemment créés.*

Gestion des utilisateurs :

![Liste des utilisateurs](docs/screenshots/utilisateurs.png)
*Gestion des utilisateurs — liste de tous les comptes avec leur rôle et leur statut.*

![Créer un utilisateur](docs/screenshots/ajouter-utilisateur.png)
*Création d'un nouvel utilisateur (email, nom, rôle, mot de passe).*

![Modifier un utilisateur](docs/screenshots/modifier-utilisateur.png)
*Modification d'un utilisateur — mise à jour des informations ou du rôle.*

![Journal d'audit](docs/screenshots/audit-logs.png)
*Journal d'audit — trace immuable des actions sensibles (qui a fait quoi, et quand).*

### Superviseur

*Supervision du risque : examine les clients et leurs scores, valide ou rejette les scores
en attente, recalcule des scores, lance des simulations « what-if » et traite les alertes.
Accès opérationnel complet, mais pas d'administration des utilisateurs.*

Tableau de bord — décisions en attente, répartition du risque et tendances :

![Tableau de bord superviseur (1/3)](docs/screenshots/superviseur-dashboard1.png)
*Tableau de bord superviseur (1/3) : décisions en attente, répartition du risque et statistiques de validation.*

![Tableau de bord superviseur (2/3)](docs/screenshots/superviseur-dashboard2.png)
*Tableau de bord superviseur (2/3) : validations et alertes au fil du temps.*

![Tableau de bord superviseur (3/3)](docs/screenshots/superviseur-dashboard3.png)
*Tableau de bord superviseur (3/3) : évolution des alertes et clients à haut risque.*

Clients — portefeuille complet et détail d'un client (avec explication SHAP) :

![Liste des clients](docs/screenshots/superviseur-clients.png)
*Liste des clients, avec recherche/filtre et export Excel.*

![Détail client (1/2)](docs/screenshots/superviseur-client-details1.png)
*Détail client (1/2) : informations personnelles, données financières et données du bureau de crédit.*

![Détail client (2/2)](docs/screenshots/superviseur-client-details2.png)
*Détail client (2/2) : score de risque, facteurs d'impact SHAP et narration en français.*

Scores — historique et détail :

![Liste des scores](docs/screenshots/superviseur-scores.png)
*Historique des scores, tous clients confondus.*

![Détail d'un score (1/2)](docs/screenshots/superviseur-score-details1.png)
*Détail d'un score (1/2) : les données client utilisées par le modèle, avec une action « Recalculer ».*

![Détail d'un score (2/2)](docs/screenshots/superviseur-scores-details2.png)
*Détail d'un score (2/2) : facteurs d'impact SHAP et analyse explicative.*

Validation d'un score — la décision « humain dans la boucle » :

![File de validation](docs/screenshots/valider-scores1.png)
*Étape 1 — la file de validation : détail du score en attente et liste d'attente.*

![Décision de validation](docs/screenshots/valider-scores2.png)
*Étape 2 — examen des facteurs SHAP, puis validation ou rejet du score.*

> Le recalcul se déclenche depuis le détail client/score via le bouton **« Recalculer »**
> (visible ci-dessus) ; il produit un nouveau score qui retourne dans la file de validation.

Simulation « what-if » — depuis la page *Simulations de scénarios* :

![Simulation — sélection du client](docs/screenshots/simulation.jpg)
*Étape 1 — sélectionner un client (ses données réelles pré-remplissent le formulaire).*

![Simulation — paramètres](docs/screenshots/simulation1.png)
*Étape 2 — ajuster les paramètres « what-if » (revenus, charges, retards, crédit…).*

![Simulation — résultat](docs/screenshots/simulation2.png)
*Étape 3 — le score simulé vs. le score réel, avec le niveau de risque et l'analyse.*

Une simulation peut aussi être lancée via une fenêtre modale depuis la page d'historique des
simulations :

![Modale de nouvelle simulation (1/2)](docs/screenshots/details-simulation1.png)
*Modale « Nouvelle simulation » (1/2) : surcharge des paramètres du client.*

![Modale de nouvelle simulation (2/2)](docs/screenshots/details-simulation2.png)
*Modale « Nouvelle simulation » (2/2) : paramètres restants avant lancement.*

![Historique des simulations](docs/screenshots/historique-simulations.png)
*Historique complet de toutes les simulations.*

L'historique est également accessible depuis la page de détail d'un client :

![Historique des scores d'un client](docs/screenshots/client-scores-historique.png)
*Détail client — modale d'historique des scores.*

![Historique des simulations d'un client](docs/screenshots/client-simulations-historique.png)
*Détail client — modale d'historique des simulations.*

Alertes et reporting :

![Alertes](docs/screenshots/alertes.png)
*Liste des alertes — filtrage par statut et marquage des alertes comme traitées.*

![Export des clients vers Excel](docs/screenshots/export-clients-excel.jpg)
*Clients exportés vers Excel (Apache POI).*

![Générer un rapport](docs/screenshots/generer-rapport.jpg)
*Génération d'un rapport imprimable/PDF du tableau de bord.*

### Chargé de clientèle

*Chargé de clientèle : crée et modifie les clients de son portefeuille — ce qui déclenche
automatiquement le scoring — et les consulte. Il ne voit le score d'un client qu'une fois
celui-ci validé, et jamais l'explication SHAP.*

Tableau de bord — « Mon portefeuille » :

![Tableau de bord chargé (1/2)](docs/screenshots/charge-dashboard1.png)
*Tableau de bord du portefeuille (1/2) : KPIs du portefeuille et répartitions par risque / situation professionnelle / revenus / âge.*

![Tableau de bord chargé (2/2)](docs/screenshots/charge-dashboard2.png)
*Tableau de bord du portefeuille (2/2) : clients créés au fil du temps et clients à haut risque.*

Clients — le portefeuille du chargé :

![Liste des clients (chargé)](docs/screenshots/charge-clients.png)
*Liste des clients avec l'action « Nouveau client ».*

Créer un client (assistant en trois étapes — le scoring s'exécute automatiquement à la
soumission) :

![Nouveau client — étape 1](docs/screenshots/nouveau-client1.png)
*Étape 1 — informations personnelles.*

![Nouveau client — étape 2](docs/screenshots/nouveau-client2.png)
*Étape 2 — données financières (revenus, charges, taux d'endettement, historique financier).*

![Nouveau client — étape 3](docs/screenshots/nouveau-client3.png)
*Étape 3 — données du bureau de crédit (retards, crédits ouverts, crédit renouvelable) → créer.*

Modifier un client (les mêmes trois étapes ; re-scoré à l'enregistrement) :

![Modifier un client — étape 1](docs/screenshots/modifier-client1.png)
*Étape 1 — informations personnelles.*

![Modifier un client — étape 2](docs/screenshots/modifier-client2.png)
*Étape 2 — données financières.*

![Modifier un client — étape 3](docs/screenshots/modifier-client3.png)
*Étape 3 — données du bureau de crédit → enregistrer.*

Détail d'un client (vue du chargé) :

![Détail client chargé (1/2)](docs/screenshots/details-client1.png)
*Détail client (1/2) : données personnelles, financières et du bureau de crédit.*

![Détail client chargé (2/2)](docs/screenshots/details-client2.png)
*Détail client (2/2) : uniquement la valeur du score validé — pas d'explication SHAP pour ce rôle.*

### Analyste

*Analyste en lecture seule : consulte les tableaux de bord, les clients, les scores ainsi
que leurs explications SHAP et leur statut de validation. Ne peut effectuer aucune action
d'écriture.*

Tableau de bord — analyse à l'échelle du portefeuille :

![Tableau de bord analyste (1/2)](docs/screenshots/dashboard-analyste1.png)
*Tableau de bord analyste (1/2) : KPIs du portefeuille, répartition du risque et répartition des validations.*

![Tableau de bord analyste (2/2)](docs/screenshots/dashboard-analyste2.png)
*Tableau de bord analyste (2/2) : volume de scores au fil du temps et clients à haut risque.*

Clients et scores (lecture seule) :

![Clients (analyste)](docs/screenshots/analyste-clients.png)
*Liste des clients (lecture seule).*

![Scores (analyste)](docs/screenshots/analyste-scores.png)
*Liste des scores (lecture seule).*

![Détail d'un score analyste (1/2)](docs/screenshots/analyste-score-detail1.png)
*Détail d'un score (1/2) : les données client utilisées par le modèle.*

![Détail d'un score analyste (2/2)](docs/screenshots/analyste-score-detail2.png)
*Détail d'un score (2/2) : facteurs d'impact SHAP et narration (lecture seule).*

---

## Installation

### Prérequis

- **Docker Desktop** (avec Compose v2) — la voie recommandée, qui lance toute la stack.
- Pour une exécution locale (hors Docker) : **Java 21**, **Node.js 20+**, **Python 3.11+**
  et une instance **PostgreSQL 15**.

### Cloner

```bash
git clone <your-repository-url> scoring-project
cd scoring-project
```

---

## Exécution avec Docker

Une seule commande construit et démarre PostgreSQL, pgAdmin, le service ML, le backend et le
frontend :

```bash
docker compose up --build          # foreground, with logs
docker compose up -d --build       # detached
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| API Backend | http://localhost:8080 |
| Service ML | http://localhost:8000 (`/health`, `/predict`) |
| pgAdmin | http://localhost:5050 |
| PostgreSQL | localhost:5432 |

Arrêter / reconstruire :

```bash
docker compose down                # stop & remove containers (DB volume preserved)
docker compose up -d --build backend   # rebuild + restart one service
```

Le premier lancement est lent (dépendances Maven, wheels xgboost/shap) ; les suivants sont
rapides. Détails complets et dépannage : [`DOCKER.md`](DOCKER.md).

---

## Exécution en local (sans Docker)

Démarrez chaque service dans son propre terminal. Voir le README de chaque composant pour
les détails.

```bash
# 1) PostgreSQL — create database `scoring_db` (user scoring_user / pass scoring_pass)

# 2) ML service
cd ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# 3) Backend (Flyway migrates on startup)
cd backend/scoring-backend
./mvnw spring-boot:run

# 4) Frontend
cd frontend/scoring-frontend
npm install
npm start        # ng serve → http://localhost:4200
```

---

## Variables d'environnement

Configurées via `docker-compose.yml` (Docker) ou l'environnement du système d'exploitation /
`application.yaml` (local). Des valeurs par défaut existent pour le développement.

| Variable | Utilisée par | Défaut | Description |
|----------|---------|---------|-------------|
| `DB_HOST` | Backend | `localhost` (`postgres` sous Docker) | Hôte PostgreSQL |
| `DB_USER` | Backend | `scoring_user` | Utilisateur de la base |
| `DB_PASS` | Backend | `scoring_pass` | Mot de passe de la base |
| `JWT_SECRET` | Backend | *(valeur de dev dans `application.yaml`)* | Clé de signature HS512 — **à surcharger en production** |
| `ADMIN_PASSWORD` | Backend | `Admin1234!` | Mot de passe de l'admin d'amorçage — **à surcharger en production** |
| `IA_SERVICE_URL` | Backend | `http://localhost:8000` (`http://ml-service:8000` sous Docker) | URL de base du service ML |
| `IA_SERVICE_ENABLED` | Backend | `true` | Activer/désactiver le scoring ML |
| `SPRING_DEVTOOLS_RESTART_ENABLED` | Backend | `true` (dev Docker) | Redémarrage à chaud |

> **Note de sécurité :** le secret JWT et le mot de passe admin sont livrés avec des valeurs
> par défaut de développement. Fournissez de vrais secrets via des variables d'environnement
> (ne les committez jamais) avant tout déploiement réel. Le frontend pointe actuellement vers
> `http://localhost:8080` dans ses services (voir le README du frontend — *Configuration de
> l'environnement*).

---

## Comptes par défaut

**Un seul compte est créé automatiquement.** Au premier démarrage, `DataInitializer` crée un
unique **administrateur d'amorçage** à partir de la variable d'environnement
`ADMIN_PASSWORD` — et rien d'autre :

| Rôle | Email | Mot de passe |
|------|-------|----------|
| Administrateur | `admin@orus.ma` | `Admin1234!` *(depuis `ADMIN_PASSWORD`)* |

Aucun autre compte n'est initialisé. Les rôles **Superviseur**, **Chargé de clientèle** et
**Analyste** n'existent **pas** tant que l'administrateur ne les a pas créés manuellement via
**Administration → Utilisateurs**. Les comptes ci-dessous ont été **créés à la main pendant
les tests** pour exercer chaque rôle ; ils ne font **pas** partie du démarrage automatique et
ne seront pas présents dans une base vierge :

| Rôle | Email | Mot de passe |
|------|-------|----------|
| Superviseur | `kaoutar.loutfi@orus.ma` | `Kaoutar1234!` |
| Chargé de clientèle | `sara.benali@orus.ma` | `e93def0d-7` |
| Analyste | `youssef.chakir@orus.ma` | `Youssef1234!` |

> Ce sont des **identifiants de test réservés au développement**, saisis manuellement pendant
> le développement. Modifiez-les/supprimez-les et faites tourner le mot de passe admin avant
> tout déploiement réel.

---

## Structure des dossiers

```
scoring-project/
├── frontend/scoring-frontend/
│   └── src/app/
│       ├── core/           # guards, interceptors, services, models, branding
│       ├── features/       # auth, dashboard, clients, scores, simulations, alertes, admin, profile
│       └── shared/         # reusable UI components (cards, tables, modals, icons…)
├── backend/scoring-backend/
│   └── src/main/
│       ├── java/com/orus/scoringbackend/
│       │   ├── config/         # security, CORS, data initializer
│       │   ├── security/       # JWT filter & service
│       │   ├── controllers/    # REST endpoints
│       │   ├── services/       # business logic (scoring, validation, alerts…)
│       │   ├── repositories/   # Spring Data JPA
│       │   ├── entities/       # JPA entities (User, Client, Score, …)
│       │   ├── dto/            # request/response DTOs
│       │   └── enums/          # Role, StatutScore, NiveauRisque, …
│       └── resources/
│           ├── application.yaml
│           └── db/migration/   # Flyway migrations (V1…V6)
├── ml-service/
│   ├── main.py             # FastAPI app (/health, /predict)
│   ├── src/preprocessing.py# shared cleaning + preprocessor + ScoringModel
│   ├── models/             # trained artifacts (git-ignored)
│   ├── notebooks/          # reproducible training pipeline
│   ├── docs/               # phase reports (audit → validation)
│   └── tests/
└── docs/                   # screenshots & diagrams
```

---

## Améliorations futures

- **Configuration de l'API côté frontend** — déplacer l'URL de base `http://localhost:8080`
  codée en dur vers les `environments/` d'Angular (dev/prod) plutôt que dans des constantes
  par service.
- **Expérience d'expiration de session** — ajouter un intercepteur HTTP qui capte les `401`
  et redirige vers la connexion (la durée de vie du jeton est de 24 h ; l'expiration n'est
  actuellement appliquée que côté serveur).
- **Sécurité de la base en production** — désactiver le `clean-on-validation-error` de Flyway
  et positionner `clean-disabled: true` pour les profils hors développement.
- **Gestion des secrets** — supprimer les secrets par défaut de développement ; les exiger
  depuis l'environnement.
- **Tests** — étendre la couverture de tests automatisés du backend (MockMvc) et du frontend
  (Jasmine/Karma) ; ajouter de la CI.
- **Observabilité** — journalisation structurée, métriques et tableaux de bord de santé.

---

## Licence

OScore est un Projet de Fin d'Année (PFA) réalisé lors d'une alternance d'ingénieur chez Orus
Services. Aucune licence open-source n'est actuellement appliquée ; ajoutez-en une (par ex.
MIT) ici si vous comptez le distribuer. Tous droits réservés à l'auteur sauf mention
contraire.
