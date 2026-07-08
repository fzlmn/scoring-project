# Phase 1 — Dataset Audit (GiveMeSomeCredit originals)

**Date:** 2026-07-05 · **Source files:** `data/GiveMeSomeCredit-training.csv` (150,000 × 11), `data/GiveMeSomeCredit-testing.csv` (101,503 × 11), `data/Data Dictionary.xls`
**Status:** ⏸ Awaiting approval before Phase 2 (Preprocessing)

---

## 1. Variables (from the official Data Dictionary)

| Variable | Official definition | Type |
|---|---|---|
| `SeriousDlqin2yrs` | **TARGET** — person experienced 90-days-past-due delinquency or worse | Y/N |
| `RevolvingUtilizationOfUnsecuredLines` | Balance on cards/personal lines ÷ credit limits | **percentage** |
| `age` | Age of borrower in years | integer |
| `NumberOfTime30-59DaysPastDueNotWorse` | Times 30–59 days past due (not worse) in last 2 years | integer |
| `DebtRatio` | Monthly debt payments + alimony + living costs ÷ monthly gross income | **percentage** |
| `MonthlyIncome` | Monthly income (USD) | real |
| `NumberOfOpenCreditLinesAndLoans` | Open installment loans + credit lines | integer |
| `NumberOfTimes90DaysLate` | Times 90+ days past due | integer |
| `NumberRealEstateLoansOrLines` | Mortgages + home-equity lines | integer |
| `NumberOfTime60-89DaysPastDueNotWorse` | Times 60–89 days past due (not worse) in last 2 years | integer |
| `NumberOfDependents` | Dependents excluding self/spouse | integer |

The dictionary declaring `RevolvingUtilization` and `DebtRatio` as *percentages* is the key to §6: values in the thousands are definitionally invalid, not merely "outliers".

## 2. Target verification

- Training: 10,026 defaults / 150,000 = **6.68% default rate** (imbalance ratio ≈ 14 : 1). No missing values, strictly {0, 1}.
- **`GiveMeSomeCredit-testing.csv` has a 100% empty target column** (101,503 NaN). It is the Kaggle *competition submission* file. ⇒ **It cannot be used for supervised evaluation.** Our train/validation/test split must be carved from the 150k labeled file. The testing file remains useful as an unlabeled drift check (§9).
- Leakage assessment of the target definition: the target is serious delinquency over the *following* 2-year performance window; the delinquency counters are *historical*. `NumberOfTimes90DaysLate` is therefore a legitimate behavioral predictor, not leakage — but its strength (default rate 4.6% at 0 lates → 33.7% at 1 → 49.9% at 2) must be *predicted*, never used to *define* the label. The previous pipeline's 3-class target (ÉLEVÉ if `n90 ≥ 2`, MOYEN if `n30 ≥ 1` or `DebtRatio > 0.5`) was circular — 100% of MOYEN and 25% of ÉLEVÉ labels were computable from the inputs, which inflated ROC-AUC to 0.955. The rebuild predicts `SeriousDlqin2yrs` directly.

## 3. Missing values

| Column | Train | Test | Mechanism |
|---|---|---|---|
| `MonthlyIncome` | 19.82% | 19.81% | **MAR** — missing-income rows default *less* (5.61% vs 6.95%) and missingness rises with age (15.9% at ≤30 → 30.6% at 70+; retirees). Missingness is itself informative → indicator flag, not silent imputation. |
| `NumberOfDependents` | 2.62% | 2.59% | MAR-ish (4.56% vs 6.74% default) → indicator flag costs nothing. |

## 4. Duplicates

- **609 exact duplicate rows** (all 11 columns) in training; 646 duplicate *feature vectors*, of which 37 groups (145 rows) carry **conflicting labels** (identical features, different outcomes).
- Risk: if duplicates straddle a train/test split, the model is evaluated on rows it memorized. **Decision needed: drop exact duplicates (keep first) *before* splitting.** Conflicting-label rows are genuine aleatoric noise (different people, same measured features) — keep them.

## 5. Sentinel values 96 / 98

- The three delinquency columns contain sentinels **96 (5 rows) and 98 (264 rows)** — always in *all three columns simultaneously* (269 rows total). The previous pipeline handled 98 only and imputed to median (=0), i.e. converted "unknown delinquency history" into "perfect history".
- These rows have a **54.6% default rate** (vs 6.60% otherwise) and median revolving utilization of exactly 1.0. The sentinel is one of the strongest risk markers in the dataset — it must become a *feature* (NaN + `delinq_info_missing` flag), not be erased.

## 6. Impossible values & outliers (train | test)

| Issue | Train | Test | Verdict |
|---|---|---|---|
| `age == 0` | 1 row | 0 | Entry error → drop (only age < 21 value in the file) |
| `age > 100` (max 109/104) | 13 | 3 | Plausible elderly → keep |
| `RevolvingUtil > 1` | 3,321 (2.2%) | 2,181 (2.1%) | Slight over-limit (1–2] is real; **> 2 (371 rows, max 50,708) is invalid** for a percentage → cap |
| `DebtRatio > 2` | 31,045 (20.7%) | 20,815 (20.5%) | **96% of DebtRatio > 2 rows have MonthlyIncome missing, 0, or 1.** When income is absent, Kaggle stored *absolute monthly debt* (median ≈ 1,159) instead of a ratio. Two different physical quantities share one column. |
| `MonthlyIncome` 0 / 1 | 1,634 / 605 | 1,020 / 407 | Placeholder-like; income 0–1 makes DebtRatio denominator meaningless → treat like missing income for the ratio |
| `MonthlyIncome` max | $3.0M/mo | $7.7M/mo | p99.9 = $78k → winsorize tail |
| `NumberOfDependents` max | 20 | **43** | Cap at a sane bound (e.g. 10) |

Skewness: `MonthlyIncome` 114, `RevolvingUtil` 98, `DebtRatio` 95 — heavy tails driven mostly by the invalid values above.

## 7. Feature–target relationships (sanity of signal)

Banded default rates (the honest view — raw Pearson is destroyed by outliers, e.g. corr(`RevolvingUtil`, target) = −0.002 despite it being the strongest single predictor):

- **RevolvingUtil** (≤1 only): 1.8% → 3.1% → 5.9% → 9.6% → 14.9% → **19.4%** across [0–0.1 … 0.9–1]. Strong, monotone. ✔ economically sensible
- **n90 lates**: 4.6% (0) → 33.7% (1) → 49.9% (2) → 57.7% (3). Strong, monotone. ✔
- **age**: 11.6% (≤30) → 2.3% (70+). Monotone *decreasing* — the "younger = riskier" pattern is genuinely in the data, consistent with retail-credit literature. To make it defensible, enforce a **monotone constraint** in the model rather than letting trees create wiggles.
- **DebtRatio** (valid-income rows only): 6.1% → 5.6% → 7.7% → 10.1% → 11.9% → 13.7% rising up to ratio 2. Real signal *once the polluted rows are separated*. ✔
- Delinquency inter-correlations: 0.22–0.31 on clean rows, but a fake 0.98–0.99 with sentinels left in — another reason sentinels must go to NaN.

## 8. Suspicious variables / leakage sweep

- No feature is a function of the target. No post-outcome information identified. The only "too good" pattern (sentinel rows at 54.6% default) is informative missingness, not leakage.
- Main leakage risks for this project are *procedural*: fitting transforms before splitting, dropping duplicates after splitting, or re-deriving the label from features (previous pipeline's mistake). All addressed in the Phase 2 design.

## 9. Train/test file consistency

Distributions of all 10 features match between the two Kaggle files (median/mean/p99 within rounding; missing rates 19.82% vs 19.81% and 2.62% vs 2.59%; same sentinel and DebtRatio pathologies at the same rates). The labeled file is representative; models built on it should transfer to unseen data from the same population.

---

## 10. Problems found (summary)

| # | Problem | Severity | Phase 2 answer |
|---|---|---|---|
| P1 | Kaggle testing file has no labels | High (evaluation design) | Split 150k file: 80% train (with CV) / 20% untouched test |
| P2 | DebtRatio holds absolute debt when income missing/0/1 (~21% of rows) | High | Split into valid ratio + flag; NaN otherwise |
| P3 | Sentinels 96 & 98 (269 rows, 54.6% default) | High | NaN + `delinq_info_missing` flag (96 was previously unhandled) |
| P4 | 609 exact duplicates, 37 conflicting-label groups | Medium | Drop exact dups before split; keep conflicts |
| P5 | Class imbalance 14:1 | Medium | Class weighting + post-hoc calibration; **no SMOTE** |
| P6 | Invalid RevolvingUtil > 2 (371 rows) | Medium | Cap at business bound |
| P7 | Income missingness is informative (MAR) | Medium | Median impute + indicator flag |
| P8 | Extreme tails (income max $3M, dependents 43 in test) | Low | Winsorize / cap |
| P9 | age = 0 row | Low | Drop 1 row |

## 11. Recommended preprocessing strategy (for approval)

1. **Target:** binary `SeriousDlqin2yrs` (PD model). 3-class app levels derived later from calibrated PD thresholds (Phase 6) — never baked into the label.
2. **Order of operations:** drop age=0 + exact duplicates → stratified **80/20 train/test split** (test untouched until Phase 4/9; hyperparameter tuning via stratified 5-fold CV inside the 80%) → all statistical fits on train only, wrapped in an sklearn `Pipeline`/`ColumnTransformer` so CV re-fits transforms per fold.
3. **Sentinels:** 96/98 → NaN in all three delinquency columns + one `delinq_info_missing` flag.
4. **DebtRatio:** valid only where income > 1 and present; else NaN + rely on `income_missing`-family flag. Winsorize valid ratios at a fixed bound (e.g. 3).
5. **RevolvingUtil:** cap at 2 (over-limit real, beyond invalid).
6. **MonthlyIncome:** winsorize p99.5 (train-fitted); `income_missing` flag; median impute for models that need it; log1p version for Logistic Regression.
7. **Dependents:** cap 10, median impute + flag.
8. **Imbalance:** `class_weight`/`scale_pos_weight` only; no SMOTE (previous pipeline's SMOTE + scale_pos_weight double-correction inflated probabilities ~3×; SMOTE also fabricated impossible clients, e.g. 1.3 ninety-day lates).
9. **Feature set:** the 10 original features + 2–3 missingness flags. No composite features (`score_retards`, `historique_financier`, `nb_credits_total`, `charges_mensuelles`) — they were 0.79–0.98 correlated with their parents and diluted SHAP attributions. Backend compatibility is preserved at the API layer in Phase 7–8 (FastAPI keeps accepting the 14-field payload and maps it to the new feature vector internally).
10. **Monotone constraints** (XGBoost) on age (−), utilization (+), delinquency counts (+) so tree wiggles can't produce indefensible local behavior.
