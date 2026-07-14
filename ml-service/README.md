# OScore — Machine Learning Service

FastAPI micro-service that scores **Credit Risk** for the **OScore** platform. It turns a
client's financial profile into a **calibrated probability of default (PD)**, a risk
level, an explainable set of **SHAP** factors, and a French-language narration.

> Part of the OScore monorepo — see the [root README](../README.md). The backend calls
> this service at scoring time (`POST /predict`); it never talks to the browser directly.

## Model Overview

- **Estimator:** XGBoost with **monotonic constraints** (so the model's response to each
  feature is directionally sensible and defensible).
- **Calibration:** **isotonic** regression maps the raw XGBoost score to a calibrated PD.
- **Decision:** an F1-optimal **decision threshold** (≈ `0.2227`) flags *high risk*.
- **Display bands:** an F2-optimal **surveillance threshold** (≈ `0.1007`) drives the
  Faible / Moyen / Élevé categorization only — it does **not** affect the model, its
  calibration, or the binary decision.
- **Dataset:** *Give Me Some Credit* (Kaggle). Selection and evaluation are documented
  phase-by-phase in [`docs/`](docs/) (`phase1_dataset_audit` → `phase8_final_validation`).

**Official hold-out test metrics** (single evaluation, phase 4):

| ROC-AUC | PR-AUC | KS | Brier | ECE | F1 @ 0.2227 |
|:-------:|:------:|:--:|:-----:|:---:|:-----------:|
| **0.8627** | 0.4060 | 0.5726 | 0.0489 | 0.0030 | 0.4512 |

## Data Preprocessing

Implemented in [`src/preprocessing.py`](src/preprocessing.py) (shared by the notebooks
and the service, so training and inference are identical):

1. **`clean_gmsc()`** — semantic cleaning of the raw credit-bureau variables: neutralizes
   known sentinel/placeholder values and derives **two missingness indicators**
   (`income_missing`, `delinq_info_missing`).
2. **Fitted preprocessor** — winsorization and transforms **fitted on the training set
   only** and embedded inside the model artifact, so no leakage occurs at inference.

The model consumes **12 features** (`FEATURE_COLS`): 10 raw variables + 2 computed
indicators. The request accepts 14 fields for backward compatibility; four legacy
composite fields (`charges_mensuelles`, `score_retards`, `historique_financier`,
`nb_credits_total`) are **accepted but ignored** by the production model.

## Inference Pipeline

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

Startup guards validate that feature order is consistent across the module, the saved
`feature_cols`, and the XGBoost booster, that monotonic constraints are present, and
that `0 < surveillance < decision < 1`. The service refuses to start otherwise.

## SHAP Explanations

- A `shap.TreeExplainer` is built once on the trained booster.
- For each prediction, SHAP values are computed on the preprocessed row; the **top
  factors** (by absolute contribution) are ranked and returned as structured objects:
  `feature_name`, `label` (French), `valeur` (formatted), `shap_value` (signed,
  log-odds), `direction` (`true` = pushes toward default), `ordre_importance`.
- `generer_narration()` turns those factors into a readable French narration tailored to
  the risk level. Factors and narration are persisted by the backend with the Score.

## API Endpoints

### `GET /health`
Returns model metadata and thresholds:

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
**Request** (14 fields; only the 10 raw variables are used):
`RevolvingUtilizationOfUnsecuredLines`, `age`, `NumberOfTime30-59DaysPastDueNotWorse`,
`DebtRatio`, `MonthlyIncome`, `NumberOfOpenCreditLinesAndLoans`,
`NumberOfTimes90DaysLate`, `NumberRealEstateLoansOrLines`,
`NumberOfTime60-89DaysPastDueNotWorse`, `NumberOfDependents` (+ 4 ignored legacy fields).

**Response:**

| Field | Meaning |
|-------|---------|
| `score` | calibrated PD × 100 (e.g. `12` = 12 % default probability) |
| `niveau_risque` | `FAIBLE` / `MOYEN` / `ELEVE` |
| `narration` | French natural-language explanation |
| `facteurs` | ranked SHAP factors (see above) |
| `probabilite_brute` | raw XGBoost output before calibration |
| `probabilite_calibree` | calibrated PD |
| `seuil_decision` | high-risk decision threshold |
| `seuil_surveillance` | watch-list threshold |
| `decision` | `RISQUE_ELEVE` / `ACCEPTE` |
| `version_modele` | model version (from training metadata) |

## Training Artifacts

Generated by the notebooks into `models/` (**git-ignored** — large binaries). The
service loads only the production artifacts:

| Artifact | Role | Loaded by service |
|----------|------|:-----------------:|
| `model_final.pkl` | `ScoringModel` = embedded preprocessor + constrained XGBoost | ✅ |
| `calibrator.pkl` | Isotonic calibrator (raw PD → calibrated PD) | ✅ |
| `decision_threshold.pkl` | Decision threshold ≈ `0.2227` (F1-optimal) | ✅ |
| `niveau_moyen_threshold.pkl` | Surveillance threshold ≈ `0.1007` (F2-optimal) | ✅ |
| `feature_cols.pkl` | Ordered feature contract | ✅ |
| `metadata_final.pkl` | Full traceability: config, seed, versions, CV + test metrics | ✅ |
| `preprocessor.pkl`, `monotone_constraints.pkl` | Preprocessing / constraint contracts | — |
| `model_random_forest.pkl`, `model_logistic_regression.pkl` (+ calibrators) | Comparison models (**not deployed**) | — |

> `model_final.pkl` is a custom object — `src/preprocessing.py` must be importable
> before unpickling (the service adds `src/` to `sys.path` at startup).

## Running Locally

Prerequisites: **Python 3.11+**. The trained artifacts in `models/` must be present
(reproduce them from the notebooks, or copy an existing `models/` folder).

```bash
# from ml-service/
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# smoke test
curl http://localhost:8000/health
python tests/test_api_e2e.py            # end-to-end API tests
```

### Reproducing the pipeline (optional)

The dataset is **not** versioned. Download the Kaggle
[Give Me Some Credit](https://www.kaggle.com/c/GiveMeSomeCredit/data) files into `data/`,
then run the notebooks **in order** (each feeds the next):

```bash
pip install -r requirements.txt -r requirements-notebooks.txt
jupyter nbconvert --to notebook --execute --inplace \
    notebooks/01_EDA.ipynb notebooks/02_preprocessing.ipynb \
    notebooks/03_training.ipynb notebooks/04_evaluation.ipynb notebooks/05_export.ipynb
```

Global seed = 42; notebook 03 (5-fold CV × 3 models) takes ~25 min. `archive_v1/` holds
the previous pipeline for historical reference (not executable).

## Python Dependencies

Service (`requirements.txt`): `fastapi`, `uvicorn[standard]`, `pydantic`, `numpy`,
`pandas`, `scikit-learn`, `xgboost`, `shap`. Notebook/test extras live in
`requirements-notebooks.txt`.
