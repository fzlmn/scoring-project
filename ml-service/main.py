"""
main.py — Service ML (FastAPI) v4.0
Application Intelligente de Scoring Client
Orus Services — Salafin, Bank of Africa
PFA 2025–2026 — Fatima Zahra Ait Lamine

Pipeline de production (rebuild 2026, phases 1-6 validées) :

    payload 14 champs (IaService.java)
        → 10 variables brutes du bureau de crédit
        → clean_gmsc()                      [règles sémantiques + 2 indicateurs]
        → FittedPreprocessor (embarqué)     [winsorisation fittée sur train]
        → XGBoost contraint (monotonies)    [probabilité brute]
        → calibrateur isotonique            [probabilité de défaut calibrée]
        → seuil de décision optimisé        [décision binaire]

Artefacts chargés (les seuls référencés par ce service) :
    model_final.pkl · calibrator.pkl · decision_threshold.pkl
    niveau_moyen_threshold.pkl · feature_cols.pkl · metadata_final.pkl

Deux seuils, deux rôles distincts (ne pas confondre) :
  - decision_threshold.pkl (0.22265625) — seuil de DÉCISION « risque élevé »,
    F1-optimal sur OOF calibré (phase 3), généralisation validée sur le test
    (phase 4). Approuvé, ne pas modifier.
  - niveau_moyen_threshold.pkl (0.1007)  — seuil de SURVEILLANCE (watch-list),
    F2-optimal sur les mêmes OOF calibrés (rappel pondéré 2× : au stade de la
    surveillance, manquer un défaut coûte plus qu'une revue inutile). Il sert
    UNIQUEMENT à la catégorisation FAIBLE/MOYEN/ÉLEVÉ affichée ; il ne modifie
    ni le modèle entraîné, ni la calibration, ni le seuil de décision.

Contrat API préservé : mêmes champs de requête (14) et de réponse
(score, niveau_risque, narration, facteurs) que la version précédente.
Champs de réponse AJOUTÉS (additifs, le backend lit un Map — sans impact) :
probabilite_brute, probabilite_calibree, seuil_decision, decision.

Les 4 champs composites hérités du payload (charges_mensuelles, score_retards,
historique_financier, nb_credits_total) restent acceptés pour compatibilité mais
ne sont plus utilisés : le modèle de production consomme les 10 variables brutes
+ 2 indicateurs calculés par clean_gmsc (cf. docs/phase2_preprocessing.md).
"""

import logging
import os
import pickle
import sys
from typing import List, Optional

import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Import du module de preprocessing AVANT tout dépicklage ───────────────
# (model_final.pkl contient un ScoringModel / FittedPreprocessor définis dans src/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "src"))
from preprocessing import (  # noqa: E402
    FEATURE_COLS,
    ScoringModel,
    clean_gmsc,
)

MODELS_DIR = os.path.join(BASE_DIR, "models")


def charger_artefact(nom: str):
    with open(os.path.join(MODELS_DIR, nom), "rb") as f:
        return pickle.load(f)


# ── Chargement et validation des artefacts de production ──────────────────
logger.info("Chargement des artefacts de production...")
try:
    model: ScoringModel = charger_artefact("model_final.pkl")
    calibrator = charger_artefact("calibrator.pkl")
    seuil_decision = float(charger_artefact("decision_threshold.pkl"))          # décision « risque élevé »
    seuil_surveillance = float(charger_artefact("niveau_moyen_threshold.pkl"))  # watch-list (niveau MOYEN)
    feature_cols = charger_artefact("feature_cols.pkl")
    metadata = charger_artefact("metadata_final.pkl")

    # Garde-fous de démarrage : ordre des features et contraintes monotones
    booster_features = list(model.clf.get_booster().feature_names)
    if not (feature_cols == FEATURE_COLS == booster_features):
        raise RuntimeError("Ordre des features incohérent entre artefacts, module et booster")
    if not model.clf.get_params().get("monotone_constraints"):
        raise RuntimeError("Contraintes monotones absentes du modèle chargé")
    if not (0.0 < seuil_surveillance < seuil_decision < 1.0):
        raise RuntimeError(
            f"Seuils incohérents : surveillance={seuil_surveillance}, décision={seuil_decision}")

    explainer = shap.TreeExplainer(model.clf)

    logger.info("✓ Modèle : %s (%s) — calibration %s, seuil %.4f",
                metadata.get("modele_production"),
                metadata.get("preprocessing_version"),
                calibrator.get("method"),
                seuil_decision)
    logger.info("  ROC-AUC test officiel : %s", metadata.get("phase4_test_metrics", {}).get("ROC-AUC"))
    logger.info("  Features (%d) : %s", len(feature_cols), feature_cols)
except Exception as e:
    logger.error("Erreur de chargement des artefacts : %s", e)
    raise

def appliquer_calibrateur(p: np.ndarray) -> np.ndarray:
    """PD brute → PD calibrée (isotonique en production ; Platt géré par symétrie)."""
    if calibrator["method"] == "isotonic":
        return calibrator["model"].predict(p)
    if calibrator["method"] == "platt":
        from scipy.special import logit
        z = logit(np.clip(p, 1e-6, 1 - 1e-6)).reshape(-1, 1)
        return calibrator["model"].predict_proba(z)[:, 1]
    return p


# Version du modèle exposée au backend (persistée dans scores.version_modele,
# colonne VARCHAR(20)) — dérivée des métadonnées d'entraînement, jamais codée en dur.
MODEL_VERSION = str(metadata.get("preprocessing_version", "inconnue"))[:20]


def determiner_niveau(pd_calibree: float) -> str:
    """Catégorisation à trois niveaux sur la PD calibrée (affichage uniquement) :
    ÉLEVÉ  : PD ≥ seuil de décision (0.2227, F1-optimal — approuvé phases 3-4)
    MOYEN  : PD ≥ seuil de surveillance (0.1007, F2-optimal — watch-list, phase 8)
    FAIBLE : en dessous.
    N'affecte ni le modèle, ni la calibration, ni la décision binaire."""
    if pd_calibree >= seuil_decision:
        return "ELEVE"
    if pd_calibree >= seuil_surveillance:
        return "MOYEN"
    return "FAIBLE"


# ── Schéma de la requête (contrat IaService.java inchangé) ─────────────────
class ClientData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    RevolvingUtilizationOfUnsecuredLines: float = Field(..., description="Taux utilisation crédit renouvelable [0, 1]")
    age: float = Field(..., description="Âge du client")
    NumberOfTime30_59DaysPastDueNotWorse: Optional[float] = Field(
        None, alias="NumberOfTime30-59DaysPastDueNotWorse", description="Nb retards 30-59j")
    DebtRatio: Optional[float] = Field(None, description="Taux d'endettement (ratio)")
    MonthlyIncome: Optional[float] = Field(None, description="Revenus mensuels (USD, convertis par le backend)")
    NumberOfOpenCreditLinesAndLoans: float = Field(..., description="Nb crédits ouverts")
    NumberOfTimes90DaysLate: Optional[float] = Field(None, description="Nb retards ≥90j")
    NumberRealEstateLoansOrLines: float = Field(..., description="Nb prêts immobiliers")
    NumberOfTime60_89DaysPastDueNotWorse: Optional[float] = Field(
        None, alias="NumberOfTime60-89DaysPastDueNotWorse", description="Nb retards 60-89j")
    NumberOfDependents: Optional[float] = Field(None, description="Nb personnes à charge")

    # Champs composites hérités — acceptés pour compatibilité, non utilisés par le
    # modèle de production (redondants : corr 0.79-0.98 avec leurs composantes).
    charges_mensuelles: Optional[float] = Field(None, description="(hérité, ignoré)")
    score_retards: Optional[float] = Field(None, description="(hérité, ignoré)")
    historique_financier: Optional[float] = Field(None, description="(hérité, ignoré)")
    nb_credits_total: Optional[float] = Field(None, description="(hérité, ignoré)")


# ── Schéma de la réponse (champs historiques + champs additifs) ────────────
class FacteurShap(BaseModel):
    feature_name: str      # nom technique (= feature_cols)
    label: str             # libellé lisible en français
    valeur: str            # valeur brute formatée pour l'affichage
    shap_value: float      # contribution SHAP (signée, log-odds)
    direction: bool        # True = pousse vers le défaut, False = protecteur
    ordre_importance: int  # 0 = facteur le plus important


class PredictionResponse(BaseModel):
    score: float                  # PD calibrée × 100 (lisible : « 12 » = 12 % de défaut)
    niveau_risque: str            # FAIBLE / MOYEN / ELEVE
    narration: str
    facteurs: List[FacteurShap] = []
    # Champs additifs (le backend lit un Map : aucun impact)
    probabilite_brute: float      # sortie XGBoost avant calibration
    probabilite_calibree: float   # PD calibrée (isotonique)
    seuil_decision: float         # seuil de décision « risque élevé » (0.2227)
    seuil_surveillance: float     # seuil watch-list du niveau MOYEN (0.1007)
    decision: str                 # "RISQUE_ELEVE" | "ACCEPTE"
    version_modele: str           # version du modèle (métadonnées d'entraînement)


# ── Formatage des facteurs pour la narration ───────────────────────────────
LABELS_FR = {
    "RevolvingUtilizationOfUnsecuredLines": "taux d'utilisation du crédit renouvelable",
    "age": "âge",
    "NumberOfTime30-59DaysPastDueNotWorse": "retards de 30 à 59 jours",
    "DebtRatio": "taux d'endettement",
    "MonthlyIncome": "revenu mensuel",
    "NumberOfOpenCreditLinesAndLoans": "crédits ouverts",
    "NumberOfTimes90DaysLate": "retards de plus de 90 jours",
    "NumberRealEstateLoansOrLines": "prêts immobiliers",
    "NumberOfTime60-89DaysPastDueNotWorse": "retards de 60 à 89 jours",
    "NumberOfDependents": "personnes à charge",
    "income_missing": "revenu non renseigné",
    "delinq_info_missing": "historique de retards inconnu",
}


def formater_valeur(nom: str, val) -> str:
    if pd.isna(val):
        return "non renseigné"
    if nom == "age":
        return f"{int(round(val))} ans"
    if nom == "MonthlyIncome":
        return f"{val:,.0f} USD/mois"
    if nom in ("DebtRatio", "RevolvingUtilizationOfUnsecuredLines"):
        return f"{min(val, 2.0) * 100:.1f}%"
    if nom in ("NumberOfTime30-59DaysPastDueNotWorse", "NumberOfTime60-89DaysPastDueNotWorse",
               "NumberOfTimes90DaysLate"):
        n = int(round(val))
        return f"{n} fois" if n > 0 else "aucun"
    if nom in ("income_missing", "delinq_info_missing"):
        return "oui" if round(val) == 1 else "non"
    return f"{int(round(val))}"


def generer_narration(shap_vals: np.ndarray, valeurs_affichage: pd.Series,
                      pd_calibree: float, niveau: str, age: int,
                      n_facteurs: int = 3):
    """Narration française + facteurs structurés, à partir des SHAP du modèle de
    production (la calibration isotonique est monotone : directions et classement
    des contributions restent valides pour la PD affichée)."""
    top = np.argsort(np.abs(shap_vals))[::-1][:n_facteurs]

    facteurs_pos, facteurs_neg, facteurs_struct = [], [], []
    for rang, idx in enumerate(top):
        nom = FEATURE_COLS[idx]
        label = LABELS_FR.get(nom, nom)
        val_fmt = formater_valeur(nom, valeurs_affichage.iloc[idx])
        (facteurs_pos if shap_vals[idx] > 0 else facteurs_neg).append((label, val_fmt))
        facteurs_struct.append({
            "feature_name": nom,
            "label": label,
            "valeur": val_fmt,
            "shap_value": float(shap_vals[idx]),
            "direction": bool(shap_vals[idx] > 0),
            "ordre_importance": int(rang),
        })

    niveau_label = {"FAIBLE": "faible", "MOYEN": "modéré", "ELEVE": "élevé"}[niveau]
    intro = (f"Ce client de {age} ans présente un niveau de risque {niveau_label} "
             f"(probabilité de défaut estimée : {pd_calibree * 100:.1f} %, "
             f"score {pd_calibree * 100:.0f}/100). ")

    if niveau == "ELEVE":
        corps = "Les principaux facteurs de risque identifiés sont : "
        if facteurs_pos:
            corps += ", ".join(f"{l} ({v})" for l, v in facteurs_pos) + ". "
        if facteurs_neg:
            corps += f"Éléments atténuants : {', '.join(f'{l} ({v})' for l, v in facteurs_neg)}. "
    elif niveau == "MOYEN":
        corps = "Ce profil présente des signaux de risque modérés. "
        if facteurs_pos:
            corps += f"Points de vigilance : {', '.join(f'{l} ({v})' for l, v in facteurs_pos)}. "
        if facteurs_neg:
            corps += f"Points favorables : {', '.join(f'{l} ({v})' for l, v in facteurs_neg)}. "
    else:
        corps = "Ce profil présente des indicateurs financiers sains. "
        if facteurs_neg:
            corps += f"Principaux atouts : {', '.join(f'{l} ({v})' for l, v in facteurs_neg)}. "
        if facteurs_pos:
            corps += f"Points à surveiller : {', '.join(f'{l} ({v})' for l, v in facteurs_pos)}. "

    conclusion = ("Cette analyse est fournie à titre d'aide à la décision "
                  "et doit être complétée par le jugement du superviseur.")
    return intro + corps + conclusion, facteurs_struct


# ── Application FastAPI ────────────────────────────────────────────────────
app = FastAPI(
    title="ScoringIA — Service ML",
    description="Scoring crédit par XGBoost contraint + calibration isotonique (rebuild 2026)",
    version="4.0.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "modele": f"{metadata.get('modele_production')} calibré ({calibrator.get('method')})",
        "roc_auc": metadata.get("phase4_test_metrics", {}).get("ROC-AUC"),
        "features": len(feature_cols),
        "version": "4.1.0 — pipeline rebuild (PD calibrée, seuils décision + surveillance)",
        "seuil_decision": seuil_decision,
        "seuil_surveillance": seuil_surveillance,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(client: ClientData):
    """
    Score de risque d'un client.
    Entrée  : payload 14 champs (IaService.java) — seules les 10 variables brutes
              sont utilisées ; les champs absents (null) sont gérés nativement.
    Sortie  : PD calibrée (score 0-100), niveau, narration, facteurs SHAP.
    """
    try:
        brut = pd.DataFrame([{
            "RevolvingUtilizationOfUnsecuredLines": client.RevolvingUtilizationOfUnsecuredLines,
            "age": client.age,
            "NumberOfTime30-59DaysPastDueNotWorse": client.NumberOfTime30_59DaysPastDueNotWorse,
            "DebtRatio": client.DebtRatio,
            "MonthlyIncome": client.MonthlyIncome,
            "NumberOfOpenCreditLinesAndLoans": client.NumberOfOpenCreditLinesAndLoans,
            "NumberOfTimes90DaysLate": client.NumberOfTimes90DaysLate,
            "NumberRealEstateLoansOrLines": client.NumberRealEstateLoansOrLines,
            "NumberOfTime60-89DaysPastDueNotWorse": client.NumberOfTime60_89DaysPastDueNotWorse,
            "NumberOfDependents": client.NumberOfDependents,
        }], dtype=float)

        # Nettoyage sémantique (sentinelles, placeholders, flags) puis préprocesseur
        # EMBARQUÉ du modèle — appliqué UNE seule fois, réutilisé pour le SHAP.
        X = clean_gmsc(brut)[FEATURE_COLS]
        Xt = model.prep.transform(X)

        p_brute = float(model.clf.predict_proba(Xt)[:, 1][0])
        p_calibree = float(appliquer_calibrateur(np.array([p_brute]))[0])
        niveau = determiner_niveau(p_calibree)
        decision = "RISQUE_ELEVE" if p_calibree >= seuil_decision else "ACCEPTE"

        shap_vals = explainer.shap_values(Xt)[0]
        narration, facteurs = generer_narration(
            shap_vals=shap_vals,
            valeurs_affichage=X.iloc[0],   # valeurs brutes nettoyées (pré-winsorisation)
            pd_calibree=p_calibree,
            niveau=niveau,
            age=int(client.age),
        )

        logger.info("Prédiction — age=%d : PD brute=%.4f → calibrée=%.4f, niveau=%s, %s",
                    int(client.age), p_brute, p_calibree, niveau, decision)

        return PredictionResponse(
            score=round(p_calibree * 100, 1),
            niveau_risque=niveau,
            narration=narration,
            facteurs=[FacteurShap(**f) for f in facteurs],
            probabilite_brute=round(p_brute, 6),
            probabilite_calibree=round(p_calibree, 6),
            seuil_decision=seuil_decision,
            seuil_surveillance=seuil_surveillance,
            decision=decision,
            version_modele=MODEL_VERSION,
        )

    except Exception as e:
        logger.error("Erreur lors de la prédiction : %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
