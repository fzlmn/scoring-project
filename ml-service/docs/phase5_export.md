# Phase 5 (notebook 05) — Export et validation du paquet de déploiement

**Date :** 2026-07-06 · **Livrables :** `notebooks/05_export.ipynb` (exécuté), `README.md`, `requirements-notebooks.txt`
**Statut :** ✅ Paquet de déploiement validé — l'explicabilité SHAP du modèle de production reste une phase dédiée à venir

---

## 1. Objet

Valider que le **paquet de déploiement** (XGBoost contraint + calibration isotonique + seuil optimisé,
sélection phase 3, mesure officielle phase 4) est complet, cohérent, et rechargeable à l'identique
hors de tout contexte d'entraînement.

## 2. Contrôles effectués (tous ✓, notebook 05)

| Contrôle | Détail |
|---|---|
| Inventaire | 17 artefacts présents dans `models/`, chacun avec un rôle documenté (production / comparaison / résultats / qualité) |
| Type du modèle | `model_final.pkl` = `ScoringModel(FittedPreprocessor + XGBClassifier)` ; métadonnées cohérentes (production = XGBoost, calibration = isotonique) |
| Préprocesseur | Caps et médianes du modèle ≡ `preprocessor.pkl` autonome (revenu 35 000 $, DebtRatio 2.016, dependents 6) |
| Features | `feature_cols.pkl` ≡ module `src/preprocessing.py` ≡ noms du booster (12 features, ordre canonique) |
| Contraintes monotones | `monotone_constraints.pkl` ≡ module ≡ paramètres réellement actifs dans le booster |
| Bout-en-bout | 3 profils bruts (sain / intermédiaire / risqué) → `clean_gmsc` → PD brute → PD calibrée → décision : 0.9 % / 14.6 % / 54.8 %, ordre cohérent ; le profil risqué exerce le chemin NaN natif (revenu inconnu) |
| Session vierge | Un sous-processus Python indépendant recharge le paquet et reproduit les prédictions de `sample_check.pkl` à 10⁻¹⁰ |

## 3. Contrat d'intégration FastAPI (pour la phase 7)

- Charger au démarrage : `model_final.pkl`, `calibrator.pkl`, `decision_threshold.pkl`, `feature_cols.pkl`, `metadata_final.pkl` — **importer `src/preprocessing.py` avant le dépicklage**.
- Conserver le payload 14 champs d'`IaService.java` (aucun changement backend) : utiliser les 10 variables brutes, recalculer les flags via `clean_gmsc`, ignorer les 4 composites héritées.
- Score applicatif = PD calibrée × 100 ; décision binaire au seuil 0.2227 ; niveaux FAIBLE/MOYEN/ÉLEVÉ à définir en phase 6 sur la PD calibrée.
- `main.py` actuel cible encore les artefacts de l'ancien pipeline : sa réécriture est l'objet de la phase 7 (volontairement non anticipée).

## 4. Reproductibilité du dépôt

- Notebooks canoniques `01 → 05` exécutés dans l'ordre, chemins **relatifs** uniquement, seed 42.
- `README.md` : obtention des données Kaggle (non versionnées), commande de reproduction (`jupyter nbconvert --execute`), inventaire des artefacts.
- `requirements.txt` (service) + `requirements-notebooks.txt` (matplotlib, seaborn, scipy, xlrd, jupyter, nbformat, nbclient).
- Ancien pipeline archivé dans `notebooks/archive_v1/` (référence historique, non exécutable — données `cs-training.csv` retirées du projet).
