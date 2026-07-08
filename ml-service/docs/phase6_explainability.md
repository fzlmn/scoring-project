# Phase 6 — Explicabilité SHAP du modèle de production

**Date :** 2026-07-06 · **Livrables :** `notebooks/06_explainability.ipynb` (exécuté), 6 figures `fig_R06_*`
**Statut :** ⏸ En attente d'approbation avant la phase 7 (intégration applicative)

---

## 1. Méthode

- **Modèle de production uniquement** : `model_final.pkl` (XGBoost contraint, 859 arbres, depth 4) ; PD affichée via `calibrator.pkl` (isotonique) ; décision via `decision_threshold.pkl` (0.2227).
- `shap.TreeExplainer` (valeurs exactes) sur **3 000 dossiers du test** (jamais vus à l'entraînement ; modèle figé depuis la phase 3 → aucune décision de modélisation affectée). Contrôle d'additivité : écart max 6.7 × 10⁻⁶.
- SHAP explique la **marge log-odds** du booster ; la calibration isotonique étant strictement monotone, directions et classements des contributions valent pour la PD calibrée (seule l'échelle change).
- **Aucun artefact modifié** : empreintes MD5 identiques avant/après (assert dans le notebook).

## 2. Importance globale (mean |SHAP|)

| Feature | Part | Contrainte | Spearman(valeur, SHAP) | Verdict |
|---|---|---|---|---|
| RevolvingUtilization | **28.7 %** | +1 | +0.965 | COHÉRENT |
| NumberOfTime30-59… | 14.1 % | +1 | +0.634 | COHÉRENT |
| NumberOfTimes90DaysLate | 12.5 % | +1 | +0.400 | COHÉRENT |
| age | 11.2 % | −1 | **−0.986** | COHÉRENT |
| NumberOfOpenCreditLines | 7.9 % | libre | +0.858 | libre |
| NumberOfTime60-89… | 7.6 % | +1 | +0.400 | COHÉRENT |
| DebtRatio | 6.3 % | libre | +0.214 | libre |
| MonthlyIncome | 5.6 % | −1 | −0.981 | COHÉRENT |
| NumberRealEstateLoans | 4.1 % | libre | −0.014 | libre |
| NumberOfDependents | 2.0 % | +1 | +0.863 | COHÉRENT |
| income_missing | 0.1 % | −1 | −0.712 | COHÉRENT |
| delinq_info_missing | 0.0 % | +1 | — | n/a |

**Zéro contradiction** entre le signe des contributions SHAP et les contraintes imposées (assert automatique §6 du notebook).

## 3. Plausibilité économique

- **Hiérarchie classique du scoring retail** : tension sur le crédit renouvelable (28.7 %) puis historique de retards (14.1 + 12.5 + 7.6 = 34.2 % cumulés), âge, exposition, revenu. Pas de dominance écrasante (top feature < 30 %) — l'ancien pipeline concentrait le signal des retards dans un `score_retards` composite qui masquait le détail par gravité ; ici chaque compteur contribue distinctement, ce qui enrichit les narrations.
- **Âge** : dépendance SHAP **lisse et strictement décroissante** (Spearman −0.986, cf. `fig_R06_dependence.png`) — le « zigzag » de l'ancien modèle (25 ans plus risqué que 30, 75 que 70) a disparu grâce à la contrainte. La direction (jeune = plus risqué) reste celle des données (taux de défaut réel 11.6 % → 2.3 % par tranche d'âge), désormais garantie localement partout.
- **Relations libres assumées** : `DebtRatio` et `NumberOfOpenCreditLinesAndLoans` (contraintes réfutées en phase 2) conservent leur non-linéarité — un plafonnement monotone aurait masqué le double risque « dossier mince / surendettement ». Le dossier « faible » illustré le montre : 15 crédits ouverts contribuent +0.43 malgré un profil globalement sain.
- **Missingness informative** : les dossiers à revenu inconnu (croix grises des dépendances) reçoivent des contributions légèrement **négatives** sur `MonthlyIncome` — cohérent avec l'audit (défaut 5.5 % chez les revenus manquants vs 7.1 % sinon) : la branche manquante native d'XGBoost exploite réellement le signal.

## 4. Constats intéressants (SHAP ↔ contraintes ↔ preprocessing)

1. **Les flags explicites sont quasi muets pour XGBoost** (`income_missing` 0.1 %, `delinq_info_missing` 0.0 %) : l'information « donnée manquante » est déjà portée par le routage natif des NaN dans les colonnes concernées — le flag est redondant *pour ce modèle*. Il reste justifié : (a) il porte le signal pour LR/RF (qui imputent, donc perdraient l'information), (b) il garde le contrat de features identique entre les trois modèles comparés. À noter aussi : les sentinelles ne touchent que 0.18 % des dossiers — même pleinement exploité, ce signal pèse peu en moyenne globale.
2. **`NumberOfOpenCreditLinesAndLoans` libre mais Spearman +0.86** : dans la masse de l'échantillon (4–20 crédits) la relation est croissante ; l'effet « dossier mince » (0 crédit, 27 % de défaut brut) est partiellement absorbé par les interactions avec l'utilisation et les NaN. La liberté de forme reste la bonne décision : la contrainte +1 aurait forcé 0-crédit = risque minimal, contredisant les données.
3. **Compteurs 90 j / 60-89 j à Spearman +0.4 « seulement »** : normal pour des entiers massés à 0 — le saut 0 → 1 retard (SHAP −0.3 → +1.0/+1.5) porte l'essentiel du signal, les valeurs supérieures saturent (cf. panneau `NumberOfTimes90DaysLate`).

## 5. Explications locales (dossiers réels du test)

| Dossier | PD calibrée | Décision (seuil 0.2227) | Réalité | Facteurs dominants (SHAP) |
|---|---|---|---|---|
| Faible | 1.0 % | accepté | sain | utilisation 2.4 % (−1.13), âge 64 (−0.50) ; à surveiller : 15 crédits ouverts (+0.43) |
| Intermédiaire | 22.7 % | risque élevé — revue | sain (faux positif proche du seuil) | 1 retard 30-59 j (+0.58), utilisation 62 % (+0.46), 5 personnes à charge (+0.36) |
| Élevé | 64.6 % | risque élevé — revue | **défaut** | 2 retards 90 j+ (+1.52), 1 retard 60-89 j (+0.88), utilisation 75 % (+0.62) |

Le cas intermédiaire est pédagogique pour la soutenance : un dossier près du seuil, classé « à revoir » pour des raisons lisibles, qui s'avère sain — exactement le rôle d'un score d'aide à la décision avec revue humaine.

## 6. Figures (répertoire canonique `notebooks/figures/`)

`fig_R06_shap_bar.png` · `fig_R06_shap_beeswarm.png` · `fig_R06_waterfall_faible.png` · `fig_R06_waterfall_intermediaire.png` · `fig_R06_waterfall_eleve.png` · `fig_R06_dependence.png` — toutes vérifiées visuellement (rendu correct, légendes lisibles).
