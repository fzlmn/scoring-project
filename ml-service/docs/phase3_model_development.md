# Phase 3 — Développement des modèles (Rebuild)

**Date :** 2026-07-05 · **Livrables :** `notebooks/03_training.ipynb` (exécuté), artefacts dans `models/`, 3 figures
**Statut :** ✅ Approuvé — **XGBoost désigné modèle de production** (décision du 2026-07-05, §8)

---

## 1. Méthodologie (anti-fuite)

- CV stratifiée **5-fold sur le train uniquement** (119 512 lignes) ; le test (20 %) n'est **jamais chargé** dans le notebook.
- Toutes les métriques sur **prédictions out-of-fold** (chaque ligne prédite par un modèle qui ne l'a jamais vue).
- `FittedPreprocessor` (winsorisation/imputation) **refitté dans chaque fold**.
- **Early stopping XGBoost sans fuite** : jeu d'arrêt = 10 % du fold-train ; le fold de validation n'influence jamais l'entraînement.
- **Calibration évaluée par CV 5-fold sur les prédictions OOF** (sémantique `CalibratedClassifierCV(ensemble=False)`).
- **Seuil de décision optimisé** (F1 max) sur les probabilités OOF calibrées — plus de 0.5 implicite.
- Grilles volontairement restreintes et justifiées ; pas de SHAP en phase 3 (phase 5, modèle final uniquement).

## 2. Réglage des hyperparamètres (AUC folds, moyenne ± écart-type)

| Modèle | Grille | Résultat | Retenu |
|---|---|---|---|
| Logistic Regression | C ∈ {0.01, 0.1, 1, 10} | 0.8562 ± 0.0021 **identique pour les 4 valeurs** (n=119k ≫ 12 features : la régularisation est sans objet) | C=1 |
| Random Forest | depth {12, ∅} × leaf {5, 20} ; 300 arbres | 0.8550 → 0.8628 ; leaf=20 > leaf=5 systématiquement (lissage utile) | depth=12, leaf=20 |
| XGBoost | depth {4, 6} × mcw {1, 10} ; lr=0.05 ; ES 50 rounds, plafond 2000 | depth=4 stable (±0.003) ; **depth=6 instable** (±0.010-0.012, arrêts erratiques 82→1429 arbres) | depth=4, mcw=10 |

## 3. Discrimination (OOF, probabilités brutes)

| Modèle | ROC-AUC (folds) | PR-AUC | KS | P@Top10% | R@Top10% |
|---|---|---|---|---|---|
| Logistic Regression | 0.8562 ± 0.0021 | 0.3815 | 0.5507 | 0.3567 | 0.5324 |
| **Random Forest** | **0.8628 ± 0.0028** | **0.3895** | **0.5666** | **0.3627** | **0.5414** |
| XGBoost (contraint) | 0.8579 ± 0.0026 | 0.3862 | 0.5603 | 0.3611 | 0.5390 |

Contexte : le PR-AUC aléatoire vaut 0.067 (taux de base) ; 0.39 = ×5.8. Un score en top-10 % capte ~54 % de tous les défauts.

## 4. Calibration : aucune / Platt / isotonique (Brier, CV sur OOF)

| Modèle | aucune | Platt | isotonique | Retenue |
|---|---|---|---|---|
| Logistic Regression | 0.1450 | 0.0511 | **0.0500** | isotonique |
| Random Forest | 0.1248 | **0.0496** | 0.0496 | Platt (égalité, méthode paramétrique plus simple) |
| XGBoost | 0.1385 | 0.0499 | **0.0498** | isotonique |

- La pondération de classes gonfle les probabilités brutes (Brier 0.12–0.15 vs 0.0625 pour le prédicteur naïf au taux de base) — la calibration est **indispensable**, quel que soit le modèle.
- Après calibration : Brier ≈ 0.0496–0.0500 (sous le naïf) et **ECE ≈ 0.001** — probabilités lisibles comme de vraies probabilités de défaut (l'ancien pipeline affichait ~3× la réalité).

## 5. Seuil de décision optimisé (OOF calibré)

| Modèle | Seuil F1* | F1 | Précision | Rappel | MCC | Seuil MCC* (contrôle) |
|---|---|---|---|---|---|---|
| Logistic Regression | 0.214 | 0.429 | 0.375 | 0.502 | 0.386 | 0.211 |
| Random Forest | 0.189 | 0.437 | 0.376 | 0.521 | 0.396 | 0.185 |
| XGBoost | 0.223 | 0.436 | 0.386 | 0.501 | 0.394 | 0.223 |

Les seuils F1-optimaux (~0.19–0.22) et MCC-optimaux coïncident presque — le choix du critère n'est pas déterminant. Avec 6.7 % de défauts, une PD de ~0.2 vaut déjà 3× le taux de base : un seuil de 0.5 serait indéfendable. Sans matrice de coûts Orus formelle, F1 est le critère par défaut documenté ; à remplacer par un seuil coût-optimal si Salafin fournit les coûts FP/FN.

## 6. Classement quantitatif et test statistique

Rang moyen sur 10 métriques : **Random Forest 1.2** < XGBoost 2.0 < Logistic Regression 2.8.

**Mais l'écart RF–XGB n'est pas significatif** : différences d'AUC par fold appariées = [+0.0039, −0.0012, +0.0092, +0.0086, +0.0041] → moyenne +0.0049, **t apparié = 2.61, p = 0.059** (XGBoost gagne même le fold 2). Brier calibré 0.0496 vs 0.0498 et ECE identiques : égalité statistique sur la calibration ; F1 0.437 vs 0.436 : égalité.

## 7. Critères qualitatifs

| Critère | LR | RF | XGBoost |
|---|---|---|---|
| Contraintes monotones (exigence du rebuild — l'« âge en zigzag » était la plainte d'origine) | linéaire par construction | **non supportées** | **appliquées et vérifiées** |
| Valeurs manquantes (NaN informatifs du preprocessing) | imputation obligatoire | imputation obligatoire | **natives** (branche manquante apprise) |
| Contrôle du sur-apprentissage | L2 | aucun mécanisme direct | **early stopping par fold** |
| SHAP (phase 5 + narration en production) | coefficients | TreeExplainer lent sur 300 arbres profonds (~27 Mo) | **TreeExplainer exact et rapide** |
| Taille de l'artefact | < 1 Mo | **27 Mo** | ~2 Mo |

## 8. Décision de sélection (tranchée le 2026-07-05, avant tout contact avec le test)

Le test set ne peut être utilisé qu'**une seule fois**, par le modèle déjà choisi — la sélection a donc été finalisée sur les seules preuves CV :

- **Random Forest** : gagnant quantitatif (rang moyen 1.2), mais avantage non significatif (p = 0.059), sans contraintes monotones (le comportement local non monotone de l'âge pourrait réapparaître), imputation obligatoire, artefact 27 Mo.
- **XGBoost — retenu comme modèle de production** : égalité statistique sur la performance, et seul modèle satisfaisant les exigences qui ont motivé le rebuild : monotonie garantie et défendable devant le jury, NaN informatifs natifs, early stopping, SHAP exact pour la phase d'explicabilité et la narration en production, artefact ~20× plus léger.

Random Forest et Logistic Regression sont conservés comme artefacts de comparaison et de reproductibilité.

## 9. Artefacts produits (`models/`)

`model_final.pkl` (**ScoringModel XGBoost** : préprocesseur fitté + booster — wrapper explicite, cf. note d'exécution de la phase 4), `calibrator.pkl` (isotonique), `decision_threshold.pkl` (0.2227), `metadata_final.pkl` (config, seed, versions, métriques), `model_random_forest.pkl` + `calibrator_random_forest.pkl` (Platt), `model_logistic_regression.pkl` + `calibrator_logistic_regression.pkl`, `sample_check.pkl` (non-régression inter-sessions), `cv_results_phase3.csv`, `calibration_comparison_phase3.csv`, `oof_predictions.csv` (réutilisées en phase 6 pour le mapping de score sans toucher au test) + `preprocessor.pkl`, `feature_cols.pkl`, `monotone_constraints.pkl` (phase 2).

Figures : `fig_R03_roc_pr_curves.png`, `fig_R03_calibration_curves.png`, `fig_R03_threshold_optimization.png`.
