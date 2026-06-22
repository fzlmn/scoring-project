"""
main.py — Service ML (FastAPI) - CORRIGÉ
Application Intelligente de Scoring Client
Orus Services — Salafin, Bank of Africa
"""

import os
import pickle
import logging
import numpy as np
import pandas as pd
import shap

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Union

# ── Configuration du logging ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Chemins des artefacts ─────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

def charger_artefact(nom: str):
    path = os.path.join(MODELS_DIR, nom)
    with open(path, "rb") as f:
        return pickle.load(f)

# ── Chargement des artefacts au démarrage ────────────────────────────────
logger.info("Chargement des artefacts ML...")
try:
    xgb_B1              = charger_artefact("model_B1.pkl")   
    xgb_B2              = charger_artefact("model_B2.pkl")   
    imputer             = charger_artefact("imputer.pkl")
    scaler              = charger_artefact("scaler.pkl")
    capping_thresholds  = charger_artefact("capping_thresholds.pkl")
    feature_cols        = charger_artefact("feature_cols.pkl")
    label_map_reverse   = charger_artefact("label_map_reverse.pkl")
    metadata            = charger_artefact("metadata_final.pkl")

    scaler_raw          = charger_artefact("scaler.pkl")  
    explainer = shap.TreeExplainer(xgb_B1)

    logger.info(f"✓ Modèle chargé : {metadata.get('strategie_retenue', 'B — Cascade')}")
except Exception as e:
    logger.error(f"Erreur de chargement des artefacts : {e}")
    raise

# ── Schéma de la requête (ADAPTÉ À SPRING BOOT) ───────────────────────────
class ClientData(BaseModel):
    age                  : int
    situation_pro        : str
    historique_financier : Union[str, int]  # Reçoit "BON", "MOYEN", "MAUVAIS" ou un code numérique
    revenus_mensuels     : float
    charges_mensuelles   : float
    taux_endettement     : float
    montant_demande      : float

# ── Schéma de la réponse ──────────────────────────────────────────────────
class PredictionResponse(BaseModel):
    score         : float  
    niveau_risque : str    
    narration     : str    

# ── Pipeline de preprocessing ─────────────────────────────────────────────
def appliquer_preprocessing(data: dict) -> pd.DataFrame:
    df = pd.DataFrame([data], columns=feature_cols)

    # 1. Capping
    for col, threshold in capping_thresholds.items():
        if col in df.columns:
            df[col] = df[col].clip(upper=threshold)

    # 2. Imputation
    cols_imputer = imputer.feature_names_in_.tolist()
    df[cols_imputer] = imputer.transform(df[cols_imputer])

    # 3. Scaling
    df[feature_cols] = scaler.transform(df[feature_cols])
    return df

# ── Cascade de prédiction ────────────────────────────────────────────────
def predict_cascade(X):
    """
    Calcule le score réel basé sur le modèle XGBoost unique exporté.
    Le score (0-100) est la probabilité directe de la classe ÉLEVÉ multipliée par 100.
    """
    # 1. Obtenir la probabilité d'appartenir à la classe critique (index 1)
    # xgb_B1 est ton modèle chargé depuis 'model_final.pkl'
    prob_high_risk = xgb_B1.predict_proba(X)[0][1] 
    
    # 2. Convertir en échelle de score 0 à 100
    score = prob_high_risk * 100.0
    
    # 3. Assigner la classe de risque de manière 100% logique selon le score
    # (Fini les conflits où le score dit 14 mais la classe crie ELEVE !)
    if score >= 60.0:
        classe = "ELEVE"
    elif score >= 30.0:
        classe = "MOYEN"
    else:
        classe = "FAIBLE"
        
    return score, classe

# ── Génération de la narration ────────────────────────────────────────────
def generer_narration(X_scaled: pd.DataFrame, score: float, classe: str) -> str:
    X_raw = pd.DataFrame(scaler_raw.inverse_transform(X_scaled), columns=feature_cols)
    feature_values_raw = X_raw.iloc[0]
    shap_vals = explainer.shap_values(X_scaled)[0]

    niveau_label = {"FAIBLE": "faible", "MOYEN": "modéré", "ELEVE": "élevé", "ÉLEVÉ": "élevé"}
    niveau = niveau_label.get(classe, classe.lower())

    indices_tries = np.argsort(np.abs(shap_vals))[::-1]
    top_indices   = indices_tries[:3]

    facteurs_pos = []
    facteurs_neg = []

    for idx in top_indices:
        nom    = feature_cols[idx]
        val    = feature_values_raw.iloc[idx]
        shap_v = shap_vals[idx]

        if nom == "age":
            val_fmt, label = f"{int(round(val))} ans", "âge"
        elif nom == "MonthlyIncome":
            val_fmt, label = f"{val:,.0f} MAD/mois", "revenu mensuel"
        elif nom == "charges_mensuelles":
            val_fmt, label = f"{val:,.0f} MAD/mois", "charges mensuelles"
        elif nom == "DebtRatio":
            val_fmt, label = f"{val * 100:.1f}%", "taux d'endettement"
        elif nom == "RevolvingUtilizationOfUnsecuredLines":
            val_fmt, label = f"{min(val * 100, 100):.0f}%", "taux d'utilisation du crédit"
        elif nom == "score_retards":
            val_fmt = "bon historique" if val <= 0 else "retards constatés"
            label = "historique de retards"
        elif nom == "historique_financier":
            mapping = {0: "BON", 1: "MOYEN", 2: "MAUVAIS"}
            val_fmt = mapping.get(int(round(val)), "MOYEN")
            label   = "historique financier"
        else:
            val_fmt, label = f"{val:.0f}", nom

        if shap_v > 0:
            facteurs_pos.append((label, val_fmt))
        else:
            facteurs_neg.append((label, val_fmt))

    intro = f"Ce client de {int(round(feature_values_raw.get('age', 40)))} ans présente un niveau de risque {niveau} (score : {score:.0f}/100). "
    
    if classe in ["ELEVE", "ÉLEVÉ"]:
        corps = "Facteurs de risque : " + ", ".join(f"{l} ({v})" for l, v in facteurs_pos) + ". "
    elif classe == "MOYEN":
        corps = f"Points de vigilance : {', '.join(f'{l} ({v})' for l, v in facteurs_pos)}. " if facteurs_pos else "Risque modéré. "
    else:
        corps = "Profil sain. Principaux atouts : " + ", ".join(f"{l} ({v})" for l, v in facteurs_neg) + ". "

    return intro + corps + "Cette analyse assistée par IA doit être validée par le superviseur."

# ── Application FastAPI ───────────────────────────────────────────────────
app = FastAPI(title="ScoringIA — Service ML Corrigé")

@app.post("/predict", response_model=PredictionResponse)
def predict(client: ClientData):
    try:
        # --- ADAPTATION & TRADUCTION DES VARIABLES REÇUES DE SPRING BOOT ---
        
        # 1. Encodage numérique de l'historique financier textuel ou numérique
        mapping_historique = {"BON": 0, "MOYEN": 1, "MAUVAIS": 2}
        historique_val = client.historique_financier
        if isinstance(historique_val, (int, float)):
            historique_num = int(historique_val) if int(historique_val) in (0, 1, 2) else 1
        else:
            historique_num = mapping_historique.get(str(historique_val).upper(), 1)

        # 2. Imputation de valeurs métiers par défaut pour les variables du dataset d'origine
        # non collectées sur votre interface graphique actuelle :
        revolving_util_default = 0.30  # Utilisation standard à 30%
        retards_30_59 = 0.0
        retards_60_89 = 0.0
        retards_90plus = 0.0
        open_lines = 2.0               # Moyenne de base
        real_estate_loans = 0.0
        dependents = 0.0
        
        # Calculs composites requis par le modèle
        score_retards_calc = float(retards_30_59 + (retards_60_89 * 2) + (retards_90plus * 3))
        nb_credits_total_calc = float(open_lines + real_estate_loans)

        # 3. Alignement strict avec l'ordre attendu par vos artefacts (feature_cols)
        data = {
            "RevolvingUtilizationOfUnsecuredLines" : revolving_util_default,
            "age"                                   : float(client.age),
            "NumberOfTime30-59DaysPastDueNotWorse"  : retards_30_59,
            "DebtRatio"                              : client.taux_endettement / 100.0, # Conversion en ratio décimal
            "MonthlyIncome"                          : client.revenus_mensuels,
            "NumberOfOpenCreditLinesAndLoans"        : open_lines,
            "NumberOfTimes90DaysLate"                : retards_90plus,
            "NumberRealEstateLoansOrLines"           : real_estate_loans,
            "NumberOfTime60-89DaysPastDueNotWorse"   : retards_60_89,
            "NumberOfDependents"                     : dependents,
            "charges_mensuelles"                     : client.charges_mensuelles,
            "score_retards"                          : score_retards_calc,
            "historique_financier"                   : float(historique_num),
            "nb_credits_total"                       : nb_credits_total_calc,
        }

        # Preprocessing & Scoring
        X = appliquer_preprocessing(data)
        score, classe = predict_cascade(X)
        narration = generer_narration(X, score, classe)

        return PredictionResponse(
            score         = round(score, 1),
            niveau_risque = classe,
            narration     = narration,
        )

    except Exception as e:
        logger.error(f"Erreur lors de la prédiction : {e}")
        raise HTTPException(status_code=500, detail=str(e))