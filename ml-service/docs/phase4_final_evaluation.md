# Phase 4 — Évaluation finale sur le test set (Rebuild)

**Date :** 2026-07-05 · **Livrables :** `notebooks/04_evaluation.ipynb` (exécuté), `models/test_metrics_phase4.csv`, `models/calibration_table_test_phase4.csv`, 4 figures, `metadata_final.pkl` enrichi
**Statut :** ⏸ En attente d'approbation avant la phase 5 (SHAP / explicabilité)

---

## 1. Protocole

Le test set (29 878 lignes, défaut 6.701 %) n'avait influencé **aucune** décision depuis le split de la phase 2. Il a été utilisé **une seule fois**, sur le modèle de production figé en phase 3 : XGBoost contraint (depth=4, mcw=10, 859 arbres) + calibration isotonique + seuil 0.2227. Aucun paramètre n'a été modifié après lecture des résultats. Pré-requis vérifiés avant l'évaluation : les 12 artefacts se chargent dans une session Python vierge et reproduisent les prédictions du notebook à 10⁻¹⁰ près ; préprocesseur et ordre des features identiques aux artefacts sérialisés.

## 2. Résultats officiels (CV → Test)

| Métrique | CV (OOF train) | **Test (officiel)** | Écart |
|---|---|---|---|
| ROC-AUC | 0.8577 | **0.8627** | +0.0050 |
| PR-AUC | 0.3862 | **0.4060** | +0.0199 |
| KS | 0.5603 | **0.5726** | +0.0123 |
| Precision@Top10% | 0.3611 | **0.3743** | +0.0131 |
| Recall@Top10% | 0.5390 | **0.5584** | +0.0194 |
| Brier (calibré) | 0.0498 | **0.0489** | −0.0009 |
| LogLoss (calibré) | 0.1817 | **0.1780** | −0.0038 |
| ECE (calibré) | 0.0009 | **0.0030** | +0.0021 |
| Précision @seuil | 0.3862 | **0.3940** | +0.0078 |
| Rappel @seuil | 0.5006 | **0.5280** | +0.0274 |
| F1 @seuil | 0.4360 | **0.4512** | +0.0152 |
| MCC @seuil | 0.3937 | **0.4107** | +0.0170 |

Matrice de confusion (seuil 0.2227 sur PD calibrée) : TN 26 250 · FP 1 626 · FN 945 · TP 1 057 — 52.8 % des 2 002 défauts réels détectés ; 39.4 % des 2 683 alertes justifiées (≈ 6× le taux de base).

## 3. Discussion

**Écart de généralisation.** Le test est légèrement **meilleur** que la CV sur toutes les métriques (+0.0050 d'AUC pour un bruit inter-folds de ±0.0029). Deux causes bénignes et attendues : (1) le modèle final est entraîné sur 100 % du train (119 512 lignes) alors que chaque modèle de fold n'en voyait que 80 % ; (2) fluctuation d'échantillonnage du test. Un écart *positif* ne peut pas être du sur-apprentissage.

**Sur-apprentissage.** Aucun signe — trois garde-fous convergents : early stopping par fold, profondeur 4 choisie pour sa stabilité (la profondeur 6 avait une variance inter-folds 4×), écart CV→test positif.

**Calibration sur le test.** ECE = 0.0030 ; la table par déciles colle au réel sur toute l'échelle (écart max 1.53 pt sur le 9ᵉ décile, < 0.7 pt sur le décile le plus risqué : 37.4 % prédit vs 38.1 % observé). Brier 0.0489 < 0.0625 (prédicteur naïf). La PD affichée est fiable — condition nécessaire du mapping FAIBLE/MOYEN/ÉLEVÉ de la phase 6.

**Généralisation du seuil.** Le seuil appris sur le train (0.2227) coûte **0.0008 de F1** par rapport à l'optimum a posteriori du test (0.2432 → 0.4520) — négligeable ; le seuil est conservé tel quel.

**Aptitude au déploiement.** Les 5 critères pré-enregistrés passent (gap dans le bruit, pas de sur-apprentissage, ECE < 0.01, Brier < naïf, perte de seuil < 0.01). Le modèle est apte au déploiement, sous réserve de l'explicabilité (phase 5) et du mapping de score (phase 6).

**Mise en perspective.** AUC 0.8627 sur défauts réels ≈ niveau des vainqueurs du concours Kaggle GMSC (~0.87 sur leur split), avec contraintes monotones actives et probabilités calibrées — l'ancien pipeline affichait 0.955 sur une cible partiellement circulaire, chiffre non comparable et non citable.

## 4. Figures

`fig_R04_confusion_matrix.png` · `fig_R04_roc_pr.png` (ROC avec KS annoté + PR avec point de fonctionnement) · `fig_R04_reliability.png` (courbe de calibration brut/calibré + histogramme des PD) · `fig_R04_prob_distribution.png` (PD par classe réelle).

## 5. Note d'exécution (transparence)

Une incompatibilité `xgboost 2.1.3 × scikit-learn 1.6` (`Pipeline.predict_proba` → `__sklearn_tags__`) a été découverte lors de l'export : le modèle de production est depuis un `ScoringModel` explicite (préprocesseur + booster, `src/preprocessing.py`) au lieu d'un Pipeline sklearn. Lors de la passe de nettoyage finale (2026-07-06), les notebooks canoniques `01 → 05` ont été **ré-exécutés intégralement dans l'ordre** (seed 42) : tous les résultats — table CV, sélection, seuil 0.22265625, prédictions de contrôle, métriques test — se sont reproduits **à l'identique**, et la reproduction en session Python vierge a été re-validée (écart < 10⁻¹⁰).
