# OScore — Ressources de documentation

Ce répertoire regroupe les éléments visuels et schématiques référencés par la
documentation du projet (le `README.md` racine) et par le rapport de stage.

## Structure

```
docs/
├── screenshots/   Application screenshots referenced by the main README
├── diagrams/      UML / architecture / database / sequence / activity diagrams
└── README.md      This file
```

### `screenshots/`

Captures de l'application en fonctionnement, regroupées par domaine. Plusieurs écrans sont
capturés en plusieurs parties (par ex. `…1` / `…2`) ou selon le rôle (superviseur /
analyste / chargé / admin).

| Domaine | Fichiers |
|------|-------|
| **Authentification** | `login-page.jpg` |
| **Tableaux de bord** | `superviseur-dashboard1‑3.png`, `charge-dashboard1‑2.png`, `dashboard-analyste1‑2.png`, `admin-dashboard1‑2.png` |
| **Clients — liste** | `superviseur-clients.png`, `analyste-clients.png`, `charge-clients.png` |
| **Clients — création / modification** | `nouveau-client1‑3.png`, `modifier-client1‑3.png` |
| **Clients — détail** | `superviseur-client-details1‑2.png`, `details-client1‑2.png` |
| **Scores — liste** | `superviseur-scores.png`, `analyste-scores.png` |
| **Scores — détail + SHAP** | `superviseur-score-details1.png`, `superviseur-scores-details2.png`, `analyste-score-detail1‑2.png` |
| **Validation des scores** | `valider-scores1.png` (file d'attente), `valider-scores2.png` (SHAP + décision) |
| **Simulations** | `simulation1‑2.png`, `simulation.jpg`, `details-simulation1‑2.png` |
| **Historiques** | `historique-simulations.png`, `client-scores-historique.png`, `client-simulations-historique.png` |
| **Alertes** | `alertes.png` |
| **Administration** | `utilisateurs.png`, `ajouter-utilisateur.png`, `modifier-utilisateur.png`, `audit-logs.png`, `profil.png` |
| **Exploitation & exports** | `docker-desktop.jpg` (conteneurs), `export-clients-excel.jpg`, `generer-rapport.jpg` |

### `diagrams/`

Diagrammes utilisés dans le rapport de stage et dans les README (tous exportés en PNG).

| Fichier | Diagramme | Notation |
|------|---------|----------|
| `architecture-diagram.png` | Architecture du système (couches logiques) | Architecture |
| `repository-tree.png` | Organisation du dépôt / du projet | Arborescence de fichiers |
| `use-case-diagram.png` | Diagramme de cas d'utilisation (par rôle) | Cas d'utilisation UML |
| `class-diagram.png` | Modèle de domaine du backend (entités + énumérations) | Classes UML |
| `er-diagram.png` | Schéma de la base (PostgreSQL / Flyway) | Entité–Association |
| `credit-scoring-workflow.png` | Processus métier (client → scoring → validation) | Logigramme |
| `ml-inference-pipeline.png` | Pipeline d'inférence du Machine Learning | Logigramme |
| `jwt-auth-sequence.png` | Connexion → JWT → requête autorisée | Séquence UML |
| `client-scoring-sequence.png` | Création d'un client → scoring automatique | Séquence UML |
| `score-validation-sequence.png` | Validation / rejet d'un score | Séquence UML |
| `simulation-sequence.png` | Simulation « what-if » | Séquence UML |
| `score-recalculation-sequence.png` | Recalcul manuel d'un score | Séquence UML |
| `alert-management-sequence.png` | Consultation et traitement des alertes | Séquence UML |
| `validation-activity-diagram.png` | Processus de validation d'un score | Activité UML |

> Les sources éditables sont conservées à côté du rapport (Mermaid / PlantUML pour les
> diagrammes UML, Graphviz pour l'architecture, matplotlib pour l'arborescence du dépôt).

## Documentation associée

- Présentation générale : [`../README.md`](../README.md)
- Frontend : [`../frontend/scoring-frontend/README.md`](../frontend/scoring-frontend/README.md)
- Backend : [`../backend/scoring-backend/README.md`](../backend/scoring-backend/README.md)
- Service de Machine Learning : [`../ml-service/README.md`](../ml-service/README.md)
- Rapports de phases du Machine Learning : [`../ml-service/docs/`](../ml-service/docs/)
- Docker / exploitation : [`../DOCKER.md`](../DOCKER.md)
