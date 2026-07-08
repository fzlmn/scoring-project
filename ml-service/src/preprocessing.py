"""
preprocessing.py — Pipeline de préparation des données GMSC (rebuild 2026)
Application Intelligente de Scoring Client — Orus Services

Deux niveaux de traitement, avec une séparation stricte anti-fuite :

1. `clean_gmsc(df)`      — nettoyage SÉMANTIQUE, sans aucun paramètre statistique
                           (constantes issues du Data Dictionary uniquement).
                           Applicable à n'importe quelle ligne, y compris en production.
2. `FittedPreprocessor`  — transformations STATISTIQUES (winsorisation, médianes
                           d'imputation) dont les paramètres sont estimés sur le
                           train uniquement via .fit(). Compatible sklearn Pipeline,
                           donc ré-estimé proprement dans chaque fold de CV.

La suppression de lignes (age==0, doublons exacts) n'est PAS faite ici :
elle ne concerne que les données d'entraînement, jamais un client en production.
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

# Version du pipeline de preprocessing — consignée dans les métadonnées de déploiement.
PREPROCESSING_VERSION = "2.0-rebuild-2026-07"

# ── Constantes sémantiques (Data Dictionary — aucune statistique) ──────────
DELAY_COLS = [
    "NumberOfTime30-59DaysPastDueNotWorse",
    "NumberOfTimes90DaysLate",
    "NumberOfTime60-89DaysPastDueNotWorse",
]
SENTINEL_VALUES = (96, 98)     # codes "donnée inconnue" du bureau de crédit
INCOME_PLACEHOLDER_MAX = 1.0   # revenus 0 et 1 = placeholders (cf. audit phase 1/2)
UTIL_VALID_MAX = 2.0           # taux d'utilisation : ratio ; >2 impossible même en dépassement

RAW_FEATURES = [
    "RevolvingUtilizationOfUnsecuredLines",
    "age",
    "NumberOfTime30-59DaysPastDueNotWorse",
    "DebtRatio",
    "MonthlyIncome",
    "NumberOfOpenCreditLinesAndLoans",
    "NumberOfTimes90DaysLate",
    "NumberRealEstateLoansOrLines",
    "NumberOfTime60-89DaysPastDueNotWorse",
    "NumberOfDependents",
]

FLAG_FEATURES = ["delinq_info_missing", "income_missing"]

# Ordre final des features du modèle (10 originales + 2 indicateurs)
FEATURE_COLS = RAW_FEATURES + FLAG_FEATURES

TARGET = "SeriousDlqin2yrs"


def clean_gmsc(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoyage sémantique : sentinelles, placeholders, valeurs invalides → NaN + flags.

    N'utilise aucune statistique — uniquement des règles dérivées du Data
    Dictionary et de l'audit de la phase 1. Idempotent, applicable en production.
    Retourne un DataFrame avec exactement FEATURE_COLS (l'éventuelle target est
    conservée si présente).
    """
    x = df.copy()

    # 1. Sentinelles 96/98 : toujours co-occurrentes sur les 3 colonnes de retards.
    #    "Historique de retards inconnu" ≠ "aucun retard" → NaN + indicateur.
    sentinel_mask = x[DELAY_COLS].isin(SENTINEL_VALUES).any(axis=1)
    x["delinq_info_missing"] = sentinel_mask.astype(int)
    for col in DELAY_COLS:
        x.loc[sentinel_mask, col] = np.nan

    # 2. Revenus manquants OU placeholders (0 / 1) : un seul indicateur.
    #    (les lignes sans NumberOfDependents sont un sous-ensemble strict de
    #     celles sans revenu — vérifié en phase 2 — donc pas de second flag)
    income_bad = x["MonthlyIncome"].isna() | (x["MonthlyIncome"] <= INCOME_PLACEHOLDER_MAX)
    x["income_missing"] = income_bad.astype(int)
    x.loc[x["MonthlyIncome"] <= INCOME_PLACEHOLDER_MAX, "MonthlyIncome"] = np.nan

    # 3. DebtRatio n'est un vrai ratio que si le revenu est connu et valide.
    #    Sinon la colonne contient des charges ABSOLUES en dollars (piège GMSC).
    x.loc[income_bad, "DebtRatio"] = np.nan

    # 4. Taux d'utilisation > 2 : impossible pour un ratio, même en dépassement
    #    de plafond. Empiriquement le taux de défaut s'effondre au-delà de 2
    #    (45 % sur (1.5,2] → 5.6 % au-delà de 10) : valeurs corrompues → NaN.
    x.loc[x["RevolvingUtilizationOfUnsecuredLines"] > UTIL_VALID_MAX,
          "RevolvingUtilizationOfUnsecuredLines"] = np.nan

    keep = [c for c in [TARGET] if c in x.columns] + FEATURE_COLS
    return x[keep]


def drop_training_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Suppressions réservées aux données d'ENTRAÎNEMENT (jamais en production) :
    - age == 0 : erreur de saisie (1 ligne)
    - doublons exacts (11 colonnes) : évite qu'une même ligne tombe des deux
      côtés du split train/test (609 lignes)
    À appliquer AVANT le split, sur le fichier brut.
    """
    out = df[df["age"] != 0].copy()
    out = out[~out.duplicated(keep="first")].copy()
    return out


class FittedPreprocessor(BaseEstimator, TransformerMixin):
    """Winsorisation + imputation, paramètres estimés sur le train uniquement.

    Seuils statistiques (recalculés à chaque .fit, donc valides en CV) :
      - MonthlyIncome  : plafond au p99.5 des revenus valides (queue sans signal :
                         taux de défaut 5.8 % au-delà ≈ plateau, mais max 3 M$)
      - DebtRatio      : plafond au p99 des ratios valides (~2.0 ; le taux de
                         défaut culmine sur (1.5,2] à 14.6 % puis DÉCROÎT)
      - NumberOfDependents : plafond au p99.9 (=6 ; au-delà 66 lignes, non estimable)

    impute=False → laisse les NaN (XGBoost les gère nativement, branche manquante)
    impute=True  → impute par la médiane du train (requis pour LR / RandomForest)
    """

    def __init__(self, impute: bool = False):
        self.impute = impute

    def fit(self, X: pd.DataFrame, y=None):
        X = X[FEATURE_COLS]
        self.income_cap_ = float(X["MonthlyIncome"].quantile(0.995))
        self.debtratio_cap_ = float(X["DebtRatio"].quantile(0.99))
        self.dependents_cap_ = float(X["NumberOfDependents"].quantile(0.999))
        self.medians_ = X.median(numeric_only=True).to_dict()
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        x = X[FEATURE_COLS].copy()
        x["MonthlyIncome"] = x["MonthlyIncome"].clip(upper=self.income_cap_)
        x["DebtRatio"] = x["DebtRatio"].clip(upper=self.debtratio_cap_)
        x["NumberOfDependents"] = x["NumberOfDependents"].clip(upper=self.dependents_cap_)
        if self.impute:
            for col, med in self.medians_.items():
                x[col] = x[col].fillna(med)
        return x

    def get_feature_names_out(self, input_features=None):
        return np.asarray(FEATURE_COLS, dtype=object)


class ScoringModel:
    """Modèle de production déployable : préprocesseur fitté + XGBClassifier.

    Wrapper explicite plutôt qu'un Pipeline sklearn : l'API de tags de
    scikit-learn 1.6 est incompatible avec le wrapper sklearn de xgboost 2.1.3
    (`AttributeError: __sklearn_tags__` au predict_proba d'un Pipeline).
    Interface identique : predict_proba(X) → (n, 2).
    """

    def __init__(self, prep: "FittedPreprocessor", clf):
        self.prep = prep
        self.clf = clf

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return self.clf.predict_proba(self.prep.transform(X))

    def predict_pd(self, X: pd.DataFrame) -> np.ndarray:
        """Probabilité de défaut brute (avant calibration)."""
        return self.predict_proba(X)[:, 1]


class Log1pIncome(BaseEstimator, TransformerMixin):
    """log1p sur MonthlyIncome — pour la régression logistique uniquement.

    Même winsorisé au p99.5, le revenu reste asymétrique ; le log ramène la
    variable vers une échelle où la relation log-odds est plus proche du linéaire.
    À placer APRÈS l'imputation (ne gère pas les NaN). Les modèles d'arbres
    sont invariants aux transformations monotones → inutile pour RF/XGBoost.
    """

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        x = X.copy()
        x["MonthlyIncome"] = np.log1p(x["MonthlyIncome"])
        return x

    def get_feature_names_out(self, input_features=None):
        return np.asarray(FEATURE_COLS, dtype=object)


# Directions monotones vérifiées empiriquement en phase 2 (notebook 02, §6) :
#   -1 = le risque DIMINUE quand la feature augmente, +1 = il AUGMENTE, 0 = libre.
# DebtRatio, OpenCreditLines, RealEstateLoans : relations en U vérifiées → libres.
MONOTONE_CONSTRAINTS = {
    "RevolvingUtilizationOfUnsecuredLines": +1,
    "age": -1,
    "NumberOfTime30-59DaysPastDueNotWorse": +1,
    "DebtRatio": 0,
    "MonthlyIncome": -1,
    "NumberOfOpenCreditLinesAndLoans": 0,
    "NumberOfTimes90DaysLate": +1,
    "NumberRealEstateLoansOrLines": 0,
    "NumberOfTime60-89DaysPastDueNotWorse": +1,
    "NumberOfDependents": +1,
    "delinq_info_missing": +1,
    "income_missing": -1,
}
