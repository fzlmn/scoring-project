# Phase 8 — Validation finale d'intégration et synthèse de déploiement

**Date :** 2026-07-06 · **Livrables :** `notebooks/07_integration_validation.ipynb` (exécuté), `models/niveau_moyen_threshold.pkl`, `main.py` v4.1.0, ce rapport
**Statut :** ⏸ En attente d'approbation — fin de la phase 8 (aucun travail de phase 9 entamé)

---

## 1. Ce qui n'a PAS changé (exigence 0)

Modèle entraîné, calibration, SHAP, pipeline de preprocessing et **seuil de décision `decision_threshold.pkl` = 0.22265625** : strictement intacts. La phase 8 n'a ajouté qu'un artefact de catégorisation (§2) et des validations.

## 2. Seuil de surveillance MOYEN — `niveau_moyen_threshold.pkl` = 0.1007080147267063

| | Seuil de DÉCISION | Seuil de SURVEILLANCE |
|---|---|---|
| Artefact | `decision_threshold.pkl` | `niveau_moyen_threshold.pkl` |
| Valeur | 0.22265625 | 0.1007080147267063 |
| Critère | F1 maximal (équilibre précision/rappel) | **F2 maximal** (rappel pondéré 2× : au stade de la watch-list, manquer un défaut coûte plus qu'une revue inutile) |
| Base de calcul | OOF calibré, CV 5-fold, train uniquement (phase 3) | **Mêmes** prédictions OOF calibrées (phase 8) — stabilité inter-folds 0.1008 ± 0.0104 |
| Rôle | Décision binaire `RISQUE_ELEVE`/`ACCEPTE` + borne ÉLEVÉ | **Uniquement** la borne FAIBLE/MOYEN de la catégorisation affichée |
| Statut | Approuvé phases 3-4, inchangé | Approuvé phase 8 |

Le seuil de surveillance **n'affecte ni le modèle entraîné, ni la calibration, ni le seuil de décision approuvé** — il ne sert qu'à la catégorisation à trois niveaux. Chargé dans `main.py` exactement comme `decision_threshold.pkl` (artefact picklé, garde-fou au démarrage `0 < surveillance < décision < 1`), variables distinctes (`seuil_surveillance` vs `seuil_decision`) et champs de réponse distincts.

**Source canonique de génération : notebook `07_integration_validation.ipynb`, §3** — le code (exécuté, dans le dépôt) lit `oof_predictions.csv` (seule entrée), énumère les 465 seuils candidats via `precision_recall_curve`, prend l'argmax du F2 par programme, sérialise l'artefact, vérifie la stabilité inter-folds (0.1008 ± 0.0104) et **prouve l'indépendance** : empreintes MD5 de `model_final.pkl`, `calibrator.pkl` et `decision_threshold.pkl` identiques avant/après.

**Composition des bandes (OOF, train)** : FAIBLE 84.2 % des dossiers (défaut observé 2.7 %, 0.4× la moyenne) · MOYEN 7.1 % (14.9 %, 2.2×) · ÉLEVÉ 8.7 % (38.6 %, 5.8×). La zone surveillée (MOYEN + ÉLEVÉ) capte 65.8 % des défauts futurs avec 15.8 % des dossiers.

## 3. Explication du seuil de décision 0.22265625 (exigence 5)

- **Critère d'optimisation** : maximum du F1 sur la classe défaut (compromis précision/rappel documenté ; à remplacer par un seuil coût-optimal si Salafin fournit une matrice de coûts FP/FN).
- **Protocole de validation** : prédictions **out-of-fold** d'une CV stratifiée 5-fold (seed 42) sur le train uniquement — chaque dossier est prédit par un modèle qui ne l'a jamais vu — puis calibrées par CV (sémantique `CalibratedClassifierCV(ensemble=False)`). Le test n'a joué **aucun** rôle dans le choix ; la phase 4 a ensuite mesuré sa généralisation : F1 test 0.4512, à **0.0008** de l'optimum a posteriori du test (0.2432).
- **Sélection automatique** : `precision_recall_curve` énumère comme candidats **toutes les valeurs prédites distinctes** (465 seuils) et l'argmax F1 est pris par programme (notebook 03 §9, fonction `best_threshold_f1`). Aucun choix manuel — la valeur non ronde en est la signature : 0.22265625 est une **marche de sortie du calibreur isotonique** (fonction en escalier), encadrée par les marches 0.222423 et 0.222956 ; tout seuil entre deux marches adjacentes produit exactement les mêmes décisions.
- **Pourquoi pas 0.20, 0.21, 0.23, 0.25** (OOF calibré) :

| Seuil | F1 | Précision | Rappel | MCC |
|---|---|---|---|---|
| 0.18 | 0.4312 | 0.3620 | 0.5332 | 0.3904 |
| 0.20 | 0.4348 | 0.3765 | 0.5145 | 0.3930 |
| 0.21 | 0.4351 | 0.3799 | 0.5091 | 0.3930 |
| 0.22 | 0.4348 | 0.3815 | 0.5054 | 0.3926 |
| **0.22265625** | **0.4360** | 0.3862 | 0.5006 | **0.3937** | ← argmax automatique |
| 0.23 | 0.4331 | 0.3938 | 0.4811 | 0.3903 |
| 0.24 | 0.4333 | 0.4138 | 0.4547 | 0.3910 |
| 0.25 | 0.4302 | 0.4201 | 0.4409 | 0.3884 |

En dessous (0.20-0.21) : plus de fausses alertes pour un F1 inférieur ; au-dessus (0.23-0.25) : des défauts manqués pour un F1 inférieur. Le maximum local du MCC au même point est une validation croisée du choix.

## 4. Validation d'intégration (notebook 07, tout ✓)

1. **Complétude** : 54 fichiers vérifiés programmatiquement (7 notebooks, 16 figures, 18 artefacts modèles, 7 rapports de phase, 6 fichiers de production) — 0 manquant.
2. **Contrat Spring Boot ↔ ml-service** : payload construit **exactement** comme `IaService.buildPayload` (client Orus : 15 000 MAD de revenus → 1 500 USD, DebtRatio 0.35, utilisation 40 % → 0.40) ; réponse consommée **exactement** comme `IaService` (`score` castable en double, `resoudreNiveau` — valeur toujours dans {FAIBLE, MOYEN, ELEVE}, `mapExplications` — les 4 sous-champs requis présents et typés). Résultat persisté simulé : `valeurScore 8.8, niveauRisque FAIBLE, 3 explications`.
3. **Règle métier aval intacte** : dossier ML=FAIBLE (PD 2.0 %) + taux d'endettement 55 % → plancher MOYEN par `appliquerRegleEndettement` — l'escalade backend fonctionne inchangée.
4. **Tests de bout en bout** (`tests/test_api_e2e.py`, session vierge) : 4 profils (faible/proche du seuil/élevé/valeurs manquantes), API ≡ chemin direct des notebooks au 6ᵉ décimal, préprocesseur embarqué prouvé actif, mapping 3 niveaux vérifié aux bornes exactes.
5. **Session vierge** : sous-processus indépendant → démarrage de l'app, `/health`, `/predict`, deux seuils rechargés à l'identique.

## 5. Runbook full-stack manuel (exigence 4) — pas à pas avec résultats attendus et dépannage

Le test complet exige PostgreSQL (Docker) + JDK 17/Maven — non exécutables dans l'environnement de validation automatique. Chaque étape ci-dessous donne la commande exacte, le résultat attendu, et le dépannage.

### Étape 1 — PostgreSQL

```bash
cd c:/scoring-project
docker compose up -d postgres
docker ps --filter name=scoring_postgres
```
**Attendu** : conteneur `scoring_postgres` en état `Up`, port `5432->5432` (base `scoring_db`, utilisateur `scoring_user`, mot de passe `scoring_pass`).
**Dépannage** : `error during connect` → démarrer Docker Desktop. `port is already allocated` → un Postgres local occupe 5432 : l'arrêter, ou modifier le mapping dans `docker-compose.yml` **et** `DB_HOST`/l'URL JDBC. Base corrompue → `docker compose down -v` (⚠ efface les données) puis relancer ; Flyway recrée le schéma (migrations V1→V5).

### Étape 2 — Service ML

```bash
cd c:/scoring-project/ml-service        # impératif : uvicorn doit trouver le module main
uvicorn main:app --host 0.0.0.0 --port 8000
```
**Attendu** dans les logs de démarrage : `✓ Modèle : XGBoost (2.0-rebuild-2026-07) — calibration isotonic, seuil 0.2227` puis `Uvicorn running on http://0.0.0.0:8000`. Contrôle :
```bash
curl http://localhost:8000/health
# → {"status":"ok","modele":"XGBoost calibré (isotonic)","roc_auc":0.8627,"features":12,
#    "version":"4.1.0 — ...","seuil_decision":0.22265625,"seuil_surveillance":0.1007...}
```
**Dépannage** : `ModuleNotFoundError: preprocessing` → lancé hors de `ml-service/` avec un vieux uvicorn ; relancer depuis `ml-service/`. `FileNotFoundError models/...` → artefacts absents : exécuter les notebooks 02→04 puis 07 (ou vérifier `models/`). `RuntimeError: Seuils incohérents / Ordre des features incohérent` → artefacts dépareillés : régénérer via notebooks 02→04 + 07. Port occupé → `--port 8001` **et** `ia.service.url=http://localhost:8001` côté backend.

### Étape 3 — Backend Spring Boot

```bash
cd c:/scoring-project/backend/scoring-backend
./mvnw spring-boot:run                  # Windows : mvnw.cmd spring-boot:run
```
**Attendu** : `Started ScoringBackendApplication` (port 8080) ; Flyway `Successfully applied/validated 5 migrations` ; `DataInitializer` crée `admin@orus.ma` au premier démarrage.
**Dépannage** : `Connection refused localhost:5432` → étape 1 non faite. `FlywayValidateException` → base d'une ancienne version : `docker compose down -v` puis relancer. `JAVA_HOME` absent → installer JDK 17+. Le backend démarre même si le service ML est éteint (le scoring échouera plus tard avec `Erreur lors du scoring IA` dans les logs — c'est l'appel, pas le démarrage, qui dépend du ML).

### Étape 4 — Authentification

```bash
curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@orus.ma","password":"Admin1234!"}'
```
**Attendu** : JSON contenant le token JWT (champ `token`). Exporter : `TOKEN=<valeur>`.
**Dépannage** : 401 → mot de passe surchargé par la variable d'env `ADMIN_PASSWORD` (défaut `Admin1234!`) ; champ `email` requis (pas `username`). 403 sur les étapes suivantes → token expiré (24 h) : se reconnecter.

### Étape 5 — Créer un client ou recalculer un score

```bash
# Option A — création (déclenche le scoring automatiquement)
curl -X POST http://localhost:8080/api/clients \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nom":"Test","prenom":"Integration","cin":"AB123456","dateNaissance":"1981-03-15",
       "situationPro":"SALARIE","revenusMensuels":15000,"chargesMensuelles":5250,
       "historiqueFinancier":"BON","nbRetards3059Jours":1,"nbRetards6089Jours":0,
       "nbRetards90JoursPlus":0,"nbCreditsOuverts":5,"nbPretsImmobiliers":1,
       "nbPersonnesACharge":2,"utilisationCreditRenouvelable":40}'

# Option B — recalcul sur un client existant
curl -X POST http://localhost:8080/api/clients/1/recalculer-score -H "Authorization: Bearer $TOKEN"
```
**Attendu** : 200/201 ; pour le client d'exemple ci-dessus (identique au notebook 07 §2) : `valeurScore ≈ 8.8` (= PD calibrée × 100), `niveauRisque: "FAIBLE"`, `statut: "EN_ATTENTE"`, narration française « probabilité de défaut estimée : 8.8 % ». ⚠ Les scores sont volontairement plus bas que l'ancienne version (~3× gonflée) : « 8.8 » signifie 8.8 % de probabilité de défaut réelle.
**Dépannage** : `score: null` dans la réponse ou log backend `Erreur lors du scoring IA` → service ML éteint ou mauvaise URL (`ia.service.url`) ; vérifier l'étape 2. 400 → champ manquant/enum invalide dans le payload (valeurs `situationPro`/`historiqueFinancier` : voir les enums du backend).

### Étape 6 — Vérifier que le backend a bien appelé le service ML

- **Logs backend** : `Payload IA — client N : {RevolvingUtilizationOfUnsecuredLines=0.4, ...}` puis `Score calculé — client N : 8.8/100 (FAIBLE), 3 facteur(s) SHAP`.
- **Logs uvicorn** : `Prédiction — age=45 : PD brute=0.xxxx → calibrée=0.088x, niveau=FAIBLE, ACCEPTE` puis `"POST /predict HTTP/1.1" 200`.
- Contre-vérification directe du même payload sur le service ML : notebook 07 §2 (mêmes valeurs → PD 8.8 %).

### Étape 7 — Vérifier la persistance en base

```bash
docker exec -it scoring_postgres psql -U scoring_user -d scoring_db
```
```sql
-- Dernier score persisté
SELECT id, client_id, valeur_score, niveau_risque, statut, version_modele,
       to_char(date_calcul, 'YYYY-MM-DD HH24:MI') AS calcule_le
FROM scores ORDER BY id DESC LIMIT 1;
-- ATTENDU : 1 ligne ; valeur_score ≈ 8.8 ; niveau_risque = 'FAIBLE' (cohérent avec les
-- seuils 0.1007/0.2227 — sauf escalade backend si taux d'endettement ≥ 50 %) ;
-- statut = 'EN_ATTENTE'.

-- Facteurs SHAP persistés pour ce score
SELECT feature_name, round(shap_value::numeric, 4) AS shap, direction, ordre_importance
FROM explications
WHERE score_id = (SELECT max(id) FROM scores)
ORDER BY ordre_importance;
-- ATTENDU : exactement 3 lignes, ordre_importance 0..2 ; feature_name = noms bruts GMSC
-- (ex. NumberOfTime30-59DaysPastDueNotWorse, RevolvingUtilizationOfUnsecuredLines) ou flags
-- (income_missing, delinq_info_missing) — JAMAIS les composites de l'ancien pipeline
-- (score_retards, historique_financier, charges_mensuelles, nb_credits_total).

-- Cohérence niveau ↔ score sur l'ensemble des scores rebuild
SELECT niveau_risque, count(*), round(min(valeur_score)::numeric,1) AS score_min,
       round(max(valeur_score)::numeric,1) AS score_max
FROM scores GROUP BY niveau_risque;
-- ATTENDU (hors escalades endettement) : FAIBLE < 10.07 ≤ MOYEN < 22.27 ≤ ELEVE.
```
**Dépannage** : ligne présente mais 0 explication → réponse ML sans `facteurs` (vérifier logs uvicorn) ; `relation scores does not exist` → Flyway n'a pas migré (étape 3). Note cosmétique connue : `version_modele` est codé en dur `v1.0` dans `IaService` — mise à jour éventuelle hors périmètre ML.

## 6. Synthèse de déploiement

| Élément | Valeur |
|---|---|
| **Point d'entrée** | `ml-service/main.py` (FastAPI v4.1.0) — `uvicorn main:app --host 0.0.0.0 --port 8000` |
| **Artefacts de production** | `model_final.pkl` · `calibrator.pkl` · `decision_threshold.pkl` · `niveau_moyen_threshold.pkl` · `feature_cols.pkl` · `metadata_final.pkl` (+ `src/preprocessing.py` importé avant dépicklage) |
| **Dépendances** | service : `requirements.txt` · notebooks/tests : `requirements-notebooks.txt` |
| **Ordre d'exécution (reproduction)** | notebooks 01 → 07, chemins relatifs, seed 42 (~30 min, dominé par le 03) |
| **Résultats officiels** | ROC-AUC 0.8627 · PR-AUC 0.4060 · KS 0.5726 · Brier 0.0489 · ECE 0.0030 · F1 0.4512 @ 0.2227 (test 20 %, une évaluation) |
| **Tests** | `python tests/test_api_e2e.py` |

## 6bis. Passe QA finale (2026-07-07) — validation sur données réelles + correctifs applicatifs

- **Validation des 34 clients réels en base** (PostgreSQL) : intégrité 11/11 ; fidélité backend↔ML 34/34 (scores, niveaux, narrations, SHAP bit-identiques) ; cohérence économique vérifiée (Spearman PD↔utilisation +0.956, PD↔retards +0.922, PD↔revenus −0.865) ; zéro prédiction suspecte.
- **Âge — comparaison contrôlée** : sur profils identiques, la PD décroît strictement avec l'âge (14.6 % → 4.0 % de 21 à 85 ans, 0 violation de monotonie). Dans les **simulations**, l'âge ne varie jamais **par conception** (donnée d'identité non surchargeable — `SimulationRequest`). Comportement attendu, pas un bug.
- **`version_modele`** : n'est plus codé en dur — le service ML renvoie la version issue de `metadata_final.pkl` (`2.0-rebuild-2026-07`, ≤ 20 caractères pour la colonne) ; `IaService` la persiste avec repli `"v1.0"`.
- **Frontend** : jauge de score corrigée (drapeau SVG large-arc — l'arc ne dépasse plus jamais 180° ; vérifié pour 0/25/50/55/70/100) ; formulaire de simulation aligné sur la fiche client (Plafond/Solde en DH → % calculé automatiquement, payload inchangé) ; raccourcis superviseur (« Valider ce score », « Nouvelle simulation », « Recalculer le score » — ce dernier uniquement si le score est VALIDÉ/REJETÉ, jamais EN_ATTENTE, avec confirmation) ; boutons Rafraîchir (dashboard, clients, scores, validation, alertes, historique simulations — filtres conservés) ; alertes actionnables (navigation vers le score/client concerné) ; contexte de navigation préservé (filtres synchronisés dans l'URL, présélections `?scoreId=`/`?clientId=`) ; notifications toast globales.
- **Aucun changement** au modèle, aux seuils, à la calibration ou à la logique de prédiction — e2e ML re-passés à l'identique, build Angular sans erreur.

## 7. Checklist complète des livrables

**Notebooks (7, exécutés)** : `01_EDA` · `02_preprocessing` · `03_training` · `04_evaluation` · `05_export` · `06_explainability` · `07_integration_validation` (+ `archive_v1/` : les 5 notebooks de l'ancien pipeline, référence historique).

**Artefacts `models/` (18)** : production — `model_final.pkl`, `calibrator.pkl`, `decision_threshold.pkl`, `niveau_moyen_threshold.pkl`, `feature_cols.pkl`, `metadata_final.pkl`, `preprocessor.pkl`, `monotone_constraints.pkl`, `sample_check.pkl` ; comparaison — `model_random_forest.pkl` + calibreur, `model_logistic_regression.pkl` + calibreur ; résultats — `cv_results_phase3.csv`, `calibration_comparison_phase3.csv`, `oof_predictions.csv`, `test_metrics_phase4.csv`, `calibration_table_test_phase4.csv`.

**Figures (16)** : `fig_R01_*` ×2 (EDA) · `fig_R02_monotonic_verification` · `fig_R03_*` ×3 (ROC/PR, calibration, seuil) · `fig_R04_*` ×4 (test officiel) · `fig_R06_*` ×6 (SHAP).

**Rapports `docs/` (8)** : `phase1_dataset_audit` · `phase2_preprocessing` · `phase3_model_development` · `phase4_final_evaluation` · `phase5_export` · `phase6_explainability` · `phase7_application_integration` · `phase8_final_validation` (ce document).

**Production (6)** : `main.py` · `src/preprocessing.py` · `tests/test_api_e2e.py` · `README.md` · `requirements.txt` · `requirements-notebooks.txt`.

**Données** : `data/` (3 fichiers Kaggle officiels, non versionnés) · `data/processed/` (4 CSV, régénérés par le notebook 02).
