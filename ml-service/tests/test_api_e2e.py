# -*- coding: utf-8 -*-
"""Tests de bout en bout du service FastAPI (phase 7 — intégration applicative).

À lancer depuis ml-service/ dans un interpréteur VIERGE (c'est le test) :
    python tests/test_api_e2e.py

Vérifie :
  1. démarrage de l'application + chargement des 5 artefacts de production ;
  2. 4 requêtes représentatives (risque faible / proche du seuil / élevé / valeurs
     manquantes) — probabilité brute, calibrée, seuil, décision rapportés ;
  3. égalité EXACTE entre les prédictions de l'API et le chemin direct des
     notebooks (clean_gmsc → préprocesseur embarqué → booster → calibrateur) ;
  4. le préprocesseur embarqué est réellement appliqué (test d'équivalence de
     winsorisation : revenu 10^9 ≡ revenu plafonné) ;
  5. contrat de réponse : champs historiques + sous-champs facteurs lus par
     IaService.java + champs additifs.
"""
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")   # console Windows (cp1252) — sortie UTF-8

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ML_DIR)

import main  # noqa: E402 — importe l'app : charge et valide les artefacts (test du démarrage)
from preprocessing import FEATURE_COLS, clean_gmsc  # noqa: E402

client = TestClient(main.app)


def payload_backend(util, age, n30, dr, inc, nopen, n90, nre, n60, ndep):
    """Payload 14 champs tel que construit par IaService.buildPayload (composites inclus)."""
    dr_val = 0.0 if dr is None else dr
    inc_val = 0.0 if inc is None else inc
    sr = (n30 or 0) * 1.0 + (n60 or 0) * 2.0 + (n90 or 0) * 3.0
    return {
        "RevolvingUtilizationOfUnsecuredLines": util,
        "age": age,
        "NumberOfTime30-59DaysPastDueNotWorse": n30,
        "DebtRatio": dr,
        "MonthlyIncome": inc,
        "NumberOfOpenCreditLinesAndLoans": nopen,
        "NumberOfTimes90DaysLate": n90,
        "NumberRealEstateLoansOrLines": nre,
        "NumberOfTime60-89DaysPastDueNotWorse": n60,
        "NumberOfDependents": ndep,
        # composites hérités : envoyés comme le backend, ignorés par le modèle
        "charges_mensuelles": dr_val * inc_val,
        "score_retards": sr,
        "historique_financier": 0.0 if sr == 0 else (1.0 if sr <= 3 else 2.0),
        "nb_credits_total": nopen + nre,
    }


def prediction_directe(p):
    """Chemin « notebook » : mêmes artefacts, sans l'API."""
    brut = pd.DataFrame([{k: (np.nan if p[k] is None else p[k])
                          for k in list(p)[:10]}], dtype=float)
    X = clean_gmsc(brut)[FEATURE_COLS]
    p_brute = float(main.model.clf.predict_proba(main.model.prep.transform(X))[:, 1][0])
    p_cal = float(main.appliquer_calibrateur(np.array([p_brute]))[0])
    return p_brute, p_cal


# ── 1. Démarrage / santé ────────────────────────────────────────────────────
r = client.get("/health")
assert r.status_code == 200, r.text
h = r.json()
assert h["status"] == "ok" and h["features"] == 12 and "XGBoost" in h["modele"]
print(f"[1] /health OK — {h['modele']} | ROC-AUC test {h['roc_auc']} | seuil {h['seuil_decision']:.4f}")

# ── 2-3. Quatre profils représentatifs + égalité API ≡ chemin direct ────────
profils = {
    # profil « sain » du notebook 05 (PD attendue ≈ 0.9 %)
    "risque faible":        payload_backend(0.05, 45, 0, 0.25, 6500, 6, 0, 1, 0, 1),
    # utilisation forte + 1 retard 30-59j : voisin du seuil de décision
    "proche du seuil":      payload_backend(0.85, 38, 1, 0.50, 2800, 4, 0, 0, 0, 2),
    # retards graves multiples, toutes valeurs présentes
    "risque élevé":         payload_backend(0.95, 27, 2, 0.55, 2200, 3, 1, 0, 1, 2),
    # profil « risqué » du notebook 05 : revenu et DebtRatio inconnus (null JSON)
    "valeurs manquantes":   payload_backend(0.98, 28, 2, None, None, 3, 2, 0, 1, 0),
}

print(f"\n[2] Tests de bout en bout (seuil = {main.seuil_decision:.4f}) :")
print(f"{'profil':<20} {'p brute':>9} {'p calibrée':>11} {'seuil':>8} {'décision':>14} {'niveau':>8}")
for nom, p in profils.items():
    rep = client.post("/predict", json=p)
    assert rep.status_code == 200, f"{nom}: {rep.text}"
    j = rep.json()

    # égalité exacte avec le chemin direct (au même arrondi que la réponse)
    p_brute, p_cal = prediction_directe(p)
    assert j["probabilite_brute"] == round(p_brute, 6), (nom, j["probabilite_brute"], p_brute)
    assert j["probabilite_calibree"] == round(p_cal, 6), (nom, j["probabilite_calibree"], p_cal)
    assert j["score"] == round(p_cal * 100, 1)
    assert j["seuil_decision"] == main.seuil_decision
    attendu = "RISQUE_ELEVE" if p_cal >= main.seuil_decision else "ACCEPTE"
    assert j["decision"] == attendu

    # contrat de réponse : champs historiques + sous-champs lus par IaService
    for champ in ["score", "niveau_risque", "narration", "facteurs"]:
        assert champ in j, f"champ manquant : {champ}"
    assert j["niveau_risque"] in ("FAIBLE", "MOYEN", "ELEVE")
    assert len(j["facteurs"]) == 3
    for f in j["facteurs"]:
        for sous in ["feature_name", "label", "valeur", "shap_value", "direction", "ordre_importance"]:
            assert sous in f, f"sous-champ facteur manquant : {sous}"

    print(f"{nom:<20} {j['probabilite_brute']:>9.4f} {j['probabilite_calibree']:>11.4f} "
          f"{j['seuil_decision']:>8.4f} {j['decision']:>14} {j['niveau_risque']:>8}")

print("    → API ≡ chemin direct des notebooks (égalité au 6e décimal, arrondi de la réponse)")

# ── 3bis. Seuils : deux artefacts distincts, mapping à trois niveaux ────────
assert main.seuil_decision == 0.22265625, "seuil de décision modifié !"
assert abs(main.seuil_surveillance - 0.1007080147267063) < 1e-12, "seuil de surveillance inattendu"
assert 0.0 < main.seuil_surveillance < main.seuil_decision < 1.0
assert main.determiner_niveau(0.05) == "FAIBLE"      # sous la watch-list
assert main.determiner_niveau(0.08) == "FAIBLE"      # au-dessus du taux de base mais sous 0.1007
assert main.determiner_niveau(0.15) == "MOYEN"       # zone de surveillance
assert main.determiner_niveau(0.2226) == "MOYEN"     # juste sous le seuil de décision
assert main.determiner_niveau(0.2227) == "ELEVE"     # au seuil (arrondi au-dessus de 0.22265625)
print(f"\n[3bis] Seuils distincts OK : surveillance {main.seuil_surveillance:.4f} (F2, watch-list) "
      f"< décision {main.seuil_decision:.4f} (F1, approuvé) — mapping 3 niveaux vérifié")

# ── 4. Le préprocesseur embarqué est réellement appliqué ────────────────────
# La winsorisation (plafond revenu p99.5 fitté sur train) doit rendre équivalents
# un revenu de 10^9 et un revenu égal au plafond.
cap = main.model.prep.income_cap_
j_extreme = client.post("/predict", json=payload_backend(0.30, 40, 0, 0.35, 1e9, 5, 0, 1, 0, 1)).json()
j_cap     = client.post("/predict", json=payload_backend(0.30, 40, 0, 0.35, cap, 5, 0, 1, 0, 1)).json()
assert j_extreme["probabilite_calibree"] == j_cap["probabilite_calibree"]
print(f"\n[4] Préprocesseur embarqué actif : revenu 1e9 ≡ revenu plafonné ({cap:,.0f} $) "
      f"→ PD identique ({j_extreme['probabilite_calibree']:.6f})")

# ── 5. Narration cohérente avec la PD affichée ──────────────────────────────
j = client.post("/predict", json=profils["risque faible"]).json()
assert f"{j['probabilite_calibree']*100:.1f}" in j["narration"]
print(f"[5] Narration : « {j['narration'][:110]}... »")

print("\n=== TOUS LES TESTS DE BOUT EN BOUT PASSENT ===")
