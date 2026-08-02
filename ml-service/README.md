# OScore — Service de Machine Learning

Micro-service FastAPI qui évalue le **risque de crédit** pour la plateforme **OScore**. Il
transforme le profil financier d'un client en une **probabilité de défaut (PD) calibrée**,
un niveau de risque, un ensemble explicable de facteurs **SHAP** et une narration en
français.

> Fait partie du mono-dépôt OScore — voir le [README racine](../README.md). Le backend
> appelle ce service au moment du scoring (`POST /predict`) ; il ne communique jamais
> directement avec le navigateur.

## Présentation du modèle

- **Estimateur :** XGBoost à **contraintes de monotonie** (afin que la réponse du modèle à
  chaque variable soit cohérente en direction et défendable).
- **Calibration :** une régression **isotonique** transforme le score brut de XGBoost en
  une PD calibrée.
- **Décision :** un **seuil de décision** F1-optimal (≈ `0.2227`) signale un *risque élevé*.
- **Bandes d'affichage :** un **seuil de surveillance** F2-optimal (≈ `0.1007`) pilote
  uniquement la catégorisation Faible / Moyen / Élevé — il n'affecte **ni** le modèle, **ni**
  sa calibration, **ni** la décision binaire.
- **Jeu de données :** *Give Me Some Credit* (Kaggle). La sélection et l'évaluation sont
  documentées phase par phase dans [`docs/`](docs/) (`phase1_dataset_audit` →
  `phase8_final_validation`).

**Métriques officielles sur le jeu de test** (évaluation unique, phase 4) :

| ROC-AUC | PR-AUC | KS | Brier | ECE | F1 @ 0.2227 |
|:-------:|:------:|:--:|:-----:|:---:|:-----------:|
| **0.8627** | 0.4060 | 0.5726 | 0.0489 | 0.0030 | 0.4512 |

## Prétraitement des données

Implémenté dans [`src/preprocessing.py`](src/preprocessing.py) (partagé par les notebooks
et le service, si bien que l'entraînement et l'inférence sont identiques) :

1. **`clean_gmsc()`** — nettoyage sémantique des variables brutes du bureau de crédit :
   neutralise les valeurs sentinelles / placeholders connues et dérive **deux indicateurs
   de valeurs manquantes** (`income_missing`, `delinq_info_missing`).
2. **Préprocesseur ajusté** — winsorisation et transformations **ajustées uniquement sur le
   jeu d'entraînement** et intégrées dans l'artefact du modèle, de sorte qu'aucune fuite ne
   se produit à l'inférence.

Le modèle consomme **12 variables** (`FEATURE_COLS`) : 10 variables brutes + 2 indicateurs
calculés. La requête accepte 14 champs pour compatibilité ascendante ; quatre champs
composites hérités (`charges_mensuelles`, `score_retards`, `historique_financier`,
`nb_credits_total`) sont **acceptés mais ignorés** par le modèle de production.

## Pipeline d'inférence

```
POST /predict  (14-field payload from IaService.java)
   → build raw DataFrame (10 credit-bureau variables; nulls handled natively)
   → clean_gmsc()                     # semantic cleaning + missingness flags
   → model.prep.transform()           # embedded fitted preprocessor
   → XGBoost.predict_proba()          # raw PD
   → isotonic calibrator              # calibrated PD
   → determiner_niveau()              # FAIBLE / MOYEN / ELEVE (display bands)
   → decision = RISQUE_ELEVE | ACCEPTE
   → SHAP factors + French narration
```

![Pipeline d'inférence du Machine Learning](../docs/diagrams/ml-inference-pipeline.png)

*Figure — Pipeline d'inférence : du payload à 14 champs envoyé par le backend jusqu'à la réponse JSON (PD calibrée, niveau de risque, décision, facteurs SHAP et narration en français).*

Des garde-fous au démarrage vérifient que l'ordre des variables est cohérent entre le
module, le fichier `feature_cols` sauvegardé et le booster XGBoost, que les contraintes de
monotonie sont présentes, et que `0 < surveillance < decision < 1`. À défaut, le service
refuse de démarrer.

## Explications SHAP

- Un `shap.TreeExplainer` est construit une seule fois sur le booster entraîné.
- Pour chaque prédiction, les valeurs SHAP sont calculées sur la ligne prétraitée ; les
  **principaux facteurs** (par contribution absolue) sont classés et renvoyés sous forme
  d'objets structurés : `feature_name`, `label` (français), `valeur` (formatée),
  `shap_value` (signée, en log-odds), `direction` (`true` = pousse vers le défaut),
  `ordre_importance`.
- `generer_narration()` transforme ces facteurs en une narration française lisible, adaptée
  au niveau de risque. Les facteurs et la narration sont persistés par le backend avec le
  Score.

## Points d'entrée de l'API

### `GET /health`
Renvoie les métadonnées du modèle et les seuils :

```json
{
  "status": "ok",
  "modele": "XGBoost calibré (isotonic)",
  "roc_auc": 0.8627,
  "features": 12,
  "version": "4.1.0 — pipeline rebuild (PD calibrée, seuils décision + surveillance)",
  "seuil_decision": 0.22265625,
  "seuil_surveillance": 0.1007080147267063
}
```

### `POST /predict`
**Requête** (14 champs ; seules les 10 variables brutes sont utilisées) :
`RevolvingUtilizationOfUnsecuredLines`, `age`, `NumberOfTime30-59DaysPastDueNotWorse`,
`DebtRatio`, `MonthlyIncome`, `NumberOfOpenCreditLinesAndLoans`,
`NumberOfTimes90DaysLate`, `NumberRealEstateLoansOrLines`,
`NumberOfTime60-89DaysPastDueNotWorse`, `NumberOfDependents` (+ 4 champs hérités ignorés).

**Réponse :**

| Champ | Signification |
|-------|---------|
| `score` | PD calibrée × 100 (par ex. `12` = 12 % de probabilité de défaut) |
| `niveau_risque` | `FAIBLE` / `MOYEN` / `ELEVE` |
| `narration` | Explication en langage naturel (français) |
| `facteurs` | Facteurs SHAP classés (voir ci-dessus) |
| `probabilite_brute` | Sortie brute de XGBoost avant calibration |
| `probabilite_calibree` | PD calibrée |
| `seuil_decision` | Seuil de décision « risque élevé » |
| `seuil_surveillance` | Seuil de surveillance (watch-list) |
| `decision` | `RISQUE_ELEVE` / `ACCEPTE` |
| `version_modele` | Version du modèle (issue des métadonnées d'entraînement) |

## Artefacts d'entraînement

Générés par les notebooks dans `models/` (**exclus de Git** — binaires volumineux). Le
service ne charge que les artefacts de production :

| Artefact | Rôle | Chargé par le service |
|----------|------|:-----------------:|
| `model_final.pkl` | `ScoringModel` = préprocesseur intégré + XGBoost contraint | ✅ |
| `calibrator.pkl` | Calibrateur isotonique (PD brute → PD calibrée) | ✅ |
| `decision_threshold.pkl` | Seuil de décision ≈ `0.2227` (F1-optimal) | ✅ |
| `niveau_moyen_threshold.pkl` | Seuil de surveillance ≈ `0.1007` (F2-optimal) | ✅ |
| `feature_cols.pkl` | Contrat d'ordre des variables | ✅ |
| `metadata_final.pkl` | Traçabilité complète : configuration, seed, versions, métriques CV + test | ✅ |
| `preprocessor.pkl`, `monotone_constraints.pkl` | Contrats de prétraitement / de contraintes | — |
| `model_random_forest.pkl`, `model_logistic_regression.pkl` (+ calibrateurs) | Modèles de comparaison (**non déployés**) | — |

> `model_final.pkl` est un objet personnalisé — `src/preprocessing.py` doit être importable
> avant le dépicklage (le service ajoute `src/` au `sys.path` au démarrage).

## Exécution en local

Prérequis : **Python 3.11+**. Les artefacts entraînés dans `models/` doivent être présents
(reproduisez-les depuis les notebooks, ou copiez un dossier `models/` existant).

```bash
# from ml-service/
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# smoke test
curl http://localhost:8000/health
python tests/test_api_e2e.py            # end-to-end API tests
```

### Reproduire le pipeline (optionnel)

Le jeu de données **n'est pas** versionné. Téléchargez les fichiers Kaggle
[Give Me Some Credit](https://www.kaggle.com/c/GiveMeSomeCredit/data) dans `data/`, puis
exécutez les notebooks **dans l'ordre** (chacun alimente le suivant) :

```bash
pip install -r requirements.txt -r requirements-notebooks.txt
jupyter nbconvert --to notebook --execute --inplace \
    notebooks/01_EDA.ipynb notebooks/02_preprocessing.ipynb \
    notebooks/03_training.ipynb notebooks/04_evaluation.ipynb notebooks/05_export.ipynb
```

Seed global = 42 ; le notebook 03 (CV 5-fold × 3 modèles) prend ~25 min. `archive_v1/`
conserve le pipeline précédent à titre de référence historique (non exécutable).

## Dépendances Python

Service (`requirements.txt`) : `fastapi`, `uvicorn[standard]`, `pydantic`, `numpy`,
`pandas`, `scikit-learn`, `xgboost`, `shap`. Les extras pour les notebooks/tests se
trouvent dans `requirements-notebooks.txt`.
