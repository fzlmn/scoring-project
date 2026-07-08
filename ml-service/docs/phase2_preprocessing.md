# Phase 2 — Preprocessing (Rebuild)

**Date :** 2026-07-05 · **Livrables :** `notebooks/02_preprocessing.ipynb` (exécuté), `src/preprocessing.py`, `data/processed/*.csv`, `models/{preprocessor,feature_cols,monotone_constraints}.pkl`
**Statut :** ⏸ En attente d'approbation avant la phase 3 (Modélisation)

---

## 1. Architecture anti-fuite

| # | Étape | Position vs split | Nature |
|---|---|---|---|
| 1 | `age==0` (1 ligne) + doublons exacts (609) supprimés | Avant split | Suppression de lignes train, aucun paramètre |
| 2 | Split stratifié **80/20**, seed 42 → Train 119 512 / Test 29 878 (défaut 6.700 % / 6.701 %) | — | Test intouché jusqu'à la phase 4 |
| 3 | Nettoyage sémantique `clean_gmsc()` | Indifférent (constantes du Data Dictionary) | Sentinelles, placeholders, ratios invalides → NaN + 2 flags |
| 4 | Winsorisation `FittedPreprocessor.fit()` | **Fit sur train uniquement** | p99.5 / p99 / p99.9 estimés sur train ; ré-estimés dans chaque fold de CV en phase 3 |
| 5 | Imputation médiane / scaling | **Dans les pipelines de modèles (phase 3)**, à l'intérieur de la CV | XGBoost : aucune imputation (branche manquante native) ; LR/RF : médiane + scaler dans le Pipeline sklearn |

La cible reste `SeriousDlqin2yrs` binaire. Aucune feature composite (l'ancien `score_retards` etc. diluait les SHAP) ; aucune cible composite (circularité de l'ancien pipeline).

## 2. Tableau récapitulatif des traitements (pour le rapport)

| Variable | Problème constaté | Traitement | Justification statistique et métier |
|---|---|---|---|
| `age` | 1 ligne `age=0` (seule valeur < 21) | Suppression (train uniquement) | Erreur de saisie ; 21–109 plausibles, les 13 lignes > 100 conservées |
| Doublons | 609 lignes exactes dupliquées | Suppression avant split | Sinon une même ligne peut être apprise ET évaluée ; les 37 groupes à features identiques mais labels contradictoires sont conservés (bruit aléatoire réel, pas une erreur) |
| Retards ×3 | Sentinelles **96 et 98**, toujours co-occurrentes (269 lignes, défaut **54.6 %** vs 6.6 %) | → NaN + flag `delinq_info_missing` | « Historique inconnu » ≠ « aucun retard » ; l'ancien pipeline imputait ces lignes à 0 retard et ignorait le code 96 |
| Retards ×3 | Queue max 11–17 | **Aucun plafonnement** | Fenêtre 2 ans ≈ 24 cycles mensuels : tout est plausible (p99.9 = 4–6) |
| `MonthlyIncome` | 19.8 % NaN + placeholders 0/1 (1 759 lignes train) | ≤ 1 → NaN ; flag `income_missing` ; **plafond p99.5 = 35 000 $** (fitté train) | Défaut des groupes 0/1 : 3.8 %/3.0 % ≈ groupe NaN (5.5 %) ≠ revenus réels (7.1 %) ; leur DebtRatio médian (956/600) est un montant absolu ; au-delà du p99.5 le défaut plafonne (5.77 %) et le max (3 M$/mois) est invraisemblable |
| `DebtRatio` | Montants absolus quand revenu absent/placeholder (21 % des lignes, médiane 1 159) | → NaN si revenu invalide ; sinon **plafond p99 = 2.016** (fitté train) | Deux grandeurs physiques dans une même colonne ; sur ratios valides le défaut culmine sur (1.5, 2] à **14.6 %** puis décroît (10.3 %, 7.9 %) → aucun ordre de risque au-delà de ~2 ; p99 ≈ borne métier « charges = 2× revenu brut » |
| `RevolvingUtilization` | 2.2 % > 1 ; max 50 708 (ratio impossible) | **> 2 → NaN** (280 lignes train) ; [0, 2] conservé intact | Défaut 45–48 % sur (1.09, 2] = dépassement de plafond réel, puis **effondrement** à 24.8 % sur (2, 10] et 5.6 % au-delà de 10 (≈ taux de base) → valeurs corrompues, pas extrêmes. La borne IQR (1.35) ou le p99 (1.09) auraient écrasé le vrai signal de dépassement |
| `NumberOfDependents` | 2.6 % NaN ; queue jusqu'à 20 (43 dans le fichier Kaggle non labellisé) | **Plafond p99.9 = 6** (fitté train) | 66 lignes > 6 : inestimable ; le 43 du fichier test prouve les erreurs de saisie. Lignes NaN = **sous-ensemble strict (100 %)** des revenus manquants → pas de flag dédié |
| `NumberOfOpenCreditLinesAndLoans`, `NumberRealEstateLoansOrLines` | RAS | Aucun traitement | Queues régulières ; relation en U avec le défaut — un écrêtage détruirait le signal « dossier mince » |
| Cible | — | `SeriousDlqin2yrs`, inchangée | Toute cible dérivée des features réintroduirait la circularité |

**Seuils effectivement estimés sur le train (exécution du notebook) :** revenu 35 000 $ (p99.5) · DebtRatio 2.016 (p99 des ratios valides) · dependents 6 (p99.9).

## 3. Vérification empirique des contraintes monotones (train nettoyé)

| Feature | Spearman | % paires de bandes croissantes | Contrainte |
|---|---|---|---|
| `age` | −0.118 | 0 % (décroissance parfaite) | **−1** |
| `RevolvingUtilization` | +0.242 | 89 % | **+1** |
| `NumberOfTime30-59…` | +0.249 | 100 % | **+1** |
| `NumberOfTime60-89…` | +0.266 | 100 % | **+1** |
| `NumberOfTimes90DaysLate` | +0.335 | 100 % | **+1** |
| `MonthlyIncome` | −0.071 | 22 % (78 % décroissantes) | **−1** |
| `NumberOfDependents` | +0.047 | 80 % | **+1** |
| `delinq_info_missing` | +0.083 | 6.6 % → 60.5 % | **+1** |
| `income_missing` | −0.027 | 7.0 % → 5.4 % | **−1** |
| `DebtRatio` | +0.059 | 67 % | **libre** (réfutée) |
| `NumberOfOpenCreditLinesAndLoans` | −0.041 | 33 % | **libre** (réfutée) |
| `NumberRealEstateLoansOrLines` | −0.036 | 80 % | **libre** (réfutée) |

**Relations réfutées — pourquoi « libre » :**
- `DebtRatio` : en U aux deux extrémités — les ratios ≈ 0 (aucune charge connue = dossier mince) défautent à **9.7 %**, au-dessus de la médiane ; le sommet (1.5, 2] à 14.6 % redescend ensuite.
- `NumberOfOpenCreditLinesAndLoans` : **27.3 % de défaut à 0 crédit** (dossier mince), minimum ~5 % vers 8–10 crédits, remontée au-delà (surendettement). U classique.
- `NumberRealEstateLoansOrLines` : affiche « 80 % de paires croissantes », mais la paire violée (0 → 1 prêt : 8.4 % → 5.2 %) couvre **72 % des emprunteurs** — le % de paires est non pondéré. La forme réelle est un U (8.4 → 5.2 → 5.6 → 6.7 → 8.9 → 14.7). À l'inverse, la paire violée de `NumberOfDependents` (10.6 → 10.4) ne concerne que la queue 5+ (797 lignes) : la contrainte y est retenue. **Critère réel : la masse de population portée par les violations + la cohérence économique, pas le % brut.**
- Anomalies mineures acceptées sous contrainte : 1er décile d'utilisation (2.6 → 1.3 %) et 1er décile de revenu (9.3 → 9.7 %) — la contrainte lissera ces micro-inversions locales.

## 4. Features finales (12)

10 originales + `delinq_info_missing` + `income_missing`. NaN restants **assumés** (Revolving > 2 : 0.23 % ; retards sentinelles : 0.15 % ; DebtRatio/revenu : 21 % ; dependents : 2.6 %) — XGBoost les route nativement ; LR/RF les imputeront à la médiane dans leur pipeline de CV (phase 3).

## 5. Artefacts produits

| Fichier | Contenu |
|---|---|
| `data/processed/X_train.csv`, `y_train.csv` | 119 512 lignes, nettoyées + winsorisées, NaN conservés, non scalées |
| `data/processed/X_test.csv`, `y_test.csv` | 29 878 lignes — intouchées jusqu'à la phase 4 |
| `models/preprocessor.pkl` | `FittedPreprocessor` fitté sur train (caps + médianes) |
| `models/feature_cols.pkl` | Les 12 features ordonnées |
| `models/monotone_constraints.pkl` | Vecteur de contraintes vérifié empiriquement |
| `src/preprocessing.py` | Module importable (notebooks, CV phase 3, `main.py` phase 7) |
| `notebooks/02_preprocessing.ipynb` | Notebook exécuté, justifications + figure `fig_R02_monotonic_verification.png` |
