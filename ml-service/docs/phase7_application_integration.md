# Phase 7 — Intégration applicative (réécriture de main.py)

**Date :** 2026-07-06 · **Livrables :** `main.py` v4.0.0, `tests/test_api_e2e.py`, `README.md` mis à jour
**Statut :** ⏸ En attente d'approbation avant la phase 8 (validation finale d'intégration)

---

## 1. Nouvelle chaîne de scoring du service

```
payload 14 champs (IaService.java, inchangé)
    → 10 variables brutes                     (les 4 composites hérités : acceptés, ignorés)
    → clean_gmsc()                            (sentinelles 96/98, placeholders, 2 indicateurs)
    → FittedPreprocessor EMBARQUÉ dans model_final.pkl   (winsorisation fittée sur train)
    → XGBoost contraint                       (probabilité brute)
    → calibrator.pkl (isotonique)             (PD calibrée)
    → decision_threshold.pkl (0.2227)         (décision binaire)
```

Artefacts référencés par le service — **exclusivement** : `model_final.pkl`, `calibrator.pkl`, `decision_threshold.pkl`, `feature_cols.pkl`, `metadata_final.pkl` (+ import de `src/preprocessing.py` avant dépicklage). Le preprocessing n'est appliqué qu'**une seule fois** par requête (`model.prep.transform` explicite, réutilisé pour le SHAP) — aucune duplication.

**Garde-fous au démarrage** (le service refuse de démarrer sinon) : `feature_cols.pkl` ≡ module ≡ noms du booster ; contraintes monotones présentes dans le modèle chargé ; seuil ∈ (0, 1).

## 2. Contrat API

**Requête — inchangée** : les 14 champs exacts d'`IaService.buildPayload`, y compris les 4 composites hérités (`charges_mensuelles`, `score_retards`, `historique_financier`, `nb_credits_total`) désormais documentés « acceptés, ignorés ». Assouplissement additif : les champs financiers peuvent être `null` (revenu/DebtRatio/retards/personnes à charge inconnus → NaN natifs du modèle) — les appels existants, qui envoient toujours des nombres, sont inchangés.

**Réponse — champs historiques conservés** : `score`, `niveau_risque`, `narration`, `facteurs[]` (avec les sous-champs exacts lus par `IaService.mapExplications` : `feature_name`, `shap_value`, `direction`, `ordre_importance`, plus `label`/`valeur` pour l'affichage). **Champs additifs** (sans impact : le backend désérialise en `Map`) : `probabilite_brute`, `probabilite_calibree`, `seuil_decision`, `decision`.

**Changements de sémantique à connaître (inévitables et voulus)** :
1. `score` = **PD calibrée × 100** — « 12 » signifie 12 % de probabilité de défaut. L'ancien score (P(ÉLEVÉ) de la cascade) était gonflé ~3× par le double rééquilibrage ; les valeurs typiques baissent donc fortement (client médian ≈ 1–3). C'est la correction de calibration validée aux phases 3-4, pas une régression.
2. `niveau_risque` : **ÉLEVÉ = PD ≥ 0.2227** (seuil de décision optimisé, validé phases 3-4). **MOYEN = PD ≥ 0.1007** — seuil de **surveillance** F2-optimal, approuvé en phase 8 et stocké dans l'artefact dédié `niveau_moyen_threshold.pkl` (chargé comme `decision_threshold.pkl` ; cf. `docs/phase8_final_validation.md` §2 pour la justification et le rôle watch-list). *(La version initiale de cette phase utilisait provisoirement le taux de base 6.7 % — remplacé.)*
3. La narration affiche la PD calibrée et le revenu en **USD** (unité réellement transmise par le backend après conversion MAD→USD).

Le backend conserve ses règles aval inchangées (escalade « taux d'endettement ≥ 50 % », repli `determinerNiveau` si niveau invalide).

## 3. Tests de bout en bout (`tests/test_api_e2e.py`, interpréteur vierge)

| Profil | PD brute | PD calibrée | Seuil | Décision | Niveau |
|---|---|---|---|---|---|
| Risque faible (profil « sain » du notebook 05) | 0.0789 | **0.0089** | 0.2227 | ACCEPTE | FAIBLE |
| Proche du seuil (util. 85 %, 1 retard 30-59 j) | 0.7414 | **0.1708** | 0.2227 | ACCEPTE | MOYEN |
| Risque élevé (2×30-59 j, 1×90 j, util. 95 %) | 0.9755 | **0.5480** | 0.2227 | RISQUE_ELEVE | ELEVE |
| Valeurs manquantes (revenu et DebtRatio `null` — profil « risqué » du notebook 05) | 0.9763 | **0.5480** | 0.2227 | RISQUE_ELEVE | ELEVE |

Vérifications automatiques (toutes ✓) :
- **API ≡ chemin direct des notebooks** : `probabilite_brute`/`probabilite_calibree` identiques au calcul direct `clean_gmsc → prep → booster → calibrateur` (à l'arrondi de la réponse, 6 décimales) ; le profil « valeurs manquantes » reproduit exactement la PD 54.8 % du notebook 05.
- **Préprocesseur embarqué réellement actif** : revenu 10⁹ ≡ revenu plafonné (35 000 $) → PD strictement identique (test d'équivalence de winsorisation).
- **NaN gérés** : requête avec `null` JSON traitée nativement (aucune imputation, branche manquante du booster).
- **Contrat de réponse** : champs historiques + sous-champs `facteurs` requis par le backend + champs additifs, tous présents ; narration cohérente avec la PD affichée.
- **Session vierge** : le script s'exécute dans un interpréteur indépendant — l'import de `main` réalise le chargement + validation des artefacts (= test de démarrage).

## 4. Audit de cohérence final

- `grep model_B1|model_B2|imputer|scaler|capping|label_map|seuil_F|predict_cascade|model_A` sur `main.py` : **aucune occurrence**. Les seules mentions des noms composites hérités sont le schéma de compatibilité (champs acceptés-ignorés) et sa documentation.
- Analyse AST des imports : **aucun import inutilisé**.
- Aucune logique de preprocessing dupliquée : le service appelle exclusivement `clean_gmsc` (module partagé) + le préprocesseur embarqué du modèle.
- L'ancienne implémentation (cascade B1/B2, proxies, re-scaling) a entièrement disparu ; `notebooks/archive_v1/` reste la seule trace (référence historique).

## 5. Dépendances et déploiement

Aucune dépendance nouvelle pour le service (`requirements.txt` inchangé). `httpx` ajouté à `requirements-notebooks.txt` (dépendance de test uniquement). Lancement : `uvicorn main:app --port 8000` depuis `ml-service/` (URL par défaut attendue par le backend : `http://localhost:8000`). `docker-compose.yml` ne référence pas le service ML — rien à modifier.
