# OScore — Documentation Assets

This directory holds the visual and diagrammatic material referenced by the
project documentation (root `README.md`) and by the internship report.

## Structure

```
docs/
├── screenshots/   Application screenshots referenced by the main README
├── diagrams/      UML / architecture / database / sequence / activity diagrams
└── README.md      This file
```

### `screenshots/`

PNG captures of the running application, one per screen/role. They are linked
from the root `README.md` (see its **Screenshots** section). Suggested naming:

| File | Screen |
|------|--------|
| `login.png` | Login page |
| `dashboard-supervisor.png` | Supervisor dashboard (KPIs, charts) |
| `dashboard-charge.png` | Chargé de clientèle dashboard |
| `dashboard-analyste.png` | Analyste (read-only) dashboard |
| `dashboard-admin.png` | Administrator dashboard |
| `clients-list.png` | Clients list (search / filter / sort) |
| `client-detail.png` | Client detail with latest Score |
| `score-detail-shap.png` | Score detail with SHAP explanation |
| `scores-validation.png` | Score validation queue (Supervisor) |
| `simulation.png` | What-if Simulation form + result |
| `alerts.png` | Alerts list |
| `admin-users.png` | User management (Admin) |
| `audit-logs.png` | Audit log (Admin) |

### `diagrams/`

Diagrams used in the internship report. Suggested set:

| File | Diagram |
|------|---------|
| `architecture.png` | System / deployment architecture |
| `use-case.png` | Use-case diagram (per role) |
| `class-diagram.png` | Backend domain model (entities) |
| `erd.png` | Database entity-relationship diagram |
| `sequence-scoring.png` | Sequence: client creation → scoring → validation |
| `sequence-auth.png` | Sequence: login → JWT → authorized request |
| `activity-validation.png` | Activity: Score validation workflow |
| `ml-pipeline.png` | Machine Learning training/inference pipeline |

> Keep source files (`.drawio`, `.puml`, `.mmd`) next to their exported `.png`
> so diagrams remain editable.

## Related documentation

- Root overview: [`../README.md`](../README.md)
- Frontend: [`../frontend/scoring-frontend/README.md`](../frontend/scoring-frontend/README.md)
- Backend: [`../backend/scoring-backend/README.md`](../backend/scoring-backend/README.md)
- Machine Learning service: [`../ml-service/README.md`](../ml-service/README.md)
- Machine Learning phase reports: [`../ml-service/docs/`](../ml-service/docs/)
- Docker / operations: [`../DOCKER.md`](../DOCKER.md)
