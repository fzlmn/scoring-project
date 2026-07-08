# ML Service — Scoring Client (Rebuild 2026)

Service de scoring crédit du projet **Application Intelligente de Scoring Client**
(Orus Services — Salafin, Bank of Africa · PFE 2025–2026).

Modèle de production : **XGBoost contraint (monotonie) + calibration isotonique + seuil optimisé**
— sélection et évaluation documentées dans `docs/` (phases 1 à 5).

## Arborescence

```
ml-service/
├── data/                          # NON versionné (.gitignore) — voir « Données » ci-dessous
│   ├── GiveMeSomeCredit-training.csv
│   ├── GiveMeSomeCredit-testing.csv
│   ├── Data Dictionary.xls
│   └── processed/                 # généré par le notebook 02
├── docs/                          # rapports de phase (audit → export)
├── models/                        # NON versionné — artefacts générés par les notebooks 02-04
├── notebooks/
│   ├── 01_EDA.ipynb               # audit du dataset
│   ├── 02_preprocessing.ipynb     # nettoyage, winsorisation justifiée, monotonies vérifiées
│   ├── 03_training.ipynb          # CV 5-fold, calibration, seuil, sélection du modèle
│   ├── 04_evaluation.ipynb        # évaluation unique du test set (résultats officiels)
│   ├── 05_export.ipynb            # validation du paquet de déploiement
│   ├── figures/                   # figures générées par les notebooks
│   └── archive_v1/                # ancien pipeline (référence historique, non exécutable)
├── src/preprocessing.py           # module partagé : nettoyage, préprocesseur, ScoringModel
├── main.py                        # service FastAPI v4 — artefacts finaux uniquement (phase 7)
├── tests/test_api_e2e.py          # tests de bout en bout de l'API (session vierge)
├── requirements.txt               # dépendances du service
└── requirements-notebooks.txt     # dépendances supplémentaires (notebooks + tests)
```

## Données

Les fichiers Kaggle ne sont pas versionnés. Télécharger la compétition
[Give Me Some Credit](https://www.kaggle.com/c/GiveMeSomeCredit/data) et placer dans `data/` :
`GiveMeSomeCredit-training.csv`, `GiveMeSomeCredit-testing.csv`, `Data Dictionary.xls`
(renommer `cs-training.csv`/`cs-test.csv` si besoin).

## Reproduire le pipeline complet

```bash
pip install -r requirements.txt -r requirements-notebooks.txt
jupyter nbconvert --to notebook --execute --inplace \
    notebooks/01_EDA.ipynb notebooks/02_preprocessing.ipynb \
    notebooks/03_training.ipynb notebooks/04_evaluation.ipynb notebooks/05_export.ipynb
```

L'ordre est obligatoire (02 produit `data/processed/` et les artefacts de preprocessing,
03 les modèles, 04 les métriques officielles, 05 valide le paquet). Tous les chemins sont
relatifs ; seed global = 42 ; le notebook 03 dure ~25 min (CV 5-fold × 3 modèles).

## Artefacts de déploiement (générés dans `models/`)

| Artefact | Rôle |
|---|---|
| `model_final.pkl` | `ScoringModel` (préprocesseur + XGBoost) — importer `src/preprocessing.py` avant dépicklage |
| `calibrator.pkl` | Calibreur isotonique (PD brute → PD calibrée) |
| `decision_threshold.pkl` | Seuil de décision « risque élevé » (0.22265625, F1-optimal) |
| `niveau_moyen_threshold.pkl` | Seuil de surveillance du niveau MOYEN (0.1007, F2-optimal — watch-list uniquement) |
| `feature_cols.pkl`, `preprocessor.pkl`, `monotone_constraints.pkl` | Contrats de features et preprocessing |
| `metadata_final.pkl` | Traçabilité complète : config, seed, versions, métriques CV + test |
| `model_random_forest.pkl`, `model_logistic_regression.pkl` (+ calibreurs) | Modèles de comparaison (non déployés) |

Résultats officiels (test 20 %, une seule évaluation — phase 4) : **ROC-AUC 0.8627 · PR-AUC 0.4060 ·
KS 0.5726 · Brier 0.0489 · ECE 0.0030 · F1 0.4512 au seuil 0.2227**.

## Lancer le service

```bash
uvicorn main:app --host 0.0.0.0 --port 8000     # depuis ml-service/
python tests/test_api_e2e.py                     # tests de bout en bout
```

Le service expose `GET /health` et `POST /predict` (payload 14 champs d'`IaService.java`,
inchangé). Réponse : `score` = PD calibrée × 100, `niveau_risque` (ÉLEVÉ = PD ≥ 0.2227,
seuil de décision `decision_threshold.pkl` ; MOYEN = PD ≥ 0.1007, seuil de surveillance
`niveau_moyen_threshold.pkl` — watch-list F2-optimale, sans effet sur le modèle ni la
décision), `narration`, `facteurs` SHAP + champs additifs `probabilite_brute`,
`probabilite_calibree`, `seuil_decision`, `seuil_surveillance`, `decision`.
