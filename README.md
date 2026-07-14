<div align="center">

# OScore

### AI-Powered Credit Risk Platform

Intelligent credit-scoring application: automated, **explainable** risk scoring with
supervised validation, what-if simulations, alerting, and role-based dashboards.

[![Frontend](https://img.shields.io/badge/Frontend-Angular%2017-DD0031)](frontend/scoring-frontend)
[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%204-6DB33F)](backend/scoring-backend)
[![ML](https://img.shields.io/badge/ML-FastAPI%20%2B%20XGBoost-009688)](ml-service)
[![DB](https://img.shields.io/badge/DB-PostgreSQL%2015-4169E1)](docker-compose.yml)
[![Docker](https://img.shields.io/badge/Orchestration-Docker%20Compose-2496ED)](DOCKER.md)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Authentication & Roles](#authentication--roles)
- [Machine Learning Workflow](#machine-learning-workflow)
- [Application Workflow](#application-workflow)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Running with Docker](#running-with-docker)
- [Running Locally](#running-locally-without-docker)
- [Environment Variables](#environment-variables)
- [Default Users](#default-users)
- [Folder Structure](#folder-structure)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Project Overview

**OScore** is a credit-risk scoring platform built as an end-of-studies internship
project (PFE 2025–2026, *Orus Services — Salafin, Bank of Africa*). It lets a credit
team capture client financial profiles, score them for **Credit Risk** using a
machine-learning model, **explain** each score with SHAP factors and a natural-language
narration, route scores through a human **Validation** workflow, run what-if
**Simulations**, and monitor risk through **Alerts** and per-role dashboards.

The platform is split into three cooperating services — an Angular single-page
application, a Spring Boot REST API, and a Python Machine Learning micro-service —
backed by PostgreSQL and orchestrated with Docker Compose.

Design principles:

- **Explainability first** — every Score ships with the top SHAP factors and a
  human-readable narration; the model is monotonically constrained so its behaviour
  is defensible.
- **Human-in-the-loop** — the model *assists*; a Supervisor validates or rejects
  every Score. Nothing is auto-approved.
- **Least privilege** — four Roles with strictly scoped permissions, enforced
  server-side on every endpoint.
- **Auditability** — every sensitive action is written to an immutable audit log.

---

## Key Features

| Domain | Capabilities |
|--------|--------------|
| **Clients** | Create, edit, list (search / filter / sort), detail view, Excel export |
| **Scores** | Automatic ML scoring on client creation, score history, risk level (Faible / Moyen / Élevé), SHAP explanation + narration, manual recalculation |
| **Validation** | Pending queue, approve / reject with decision timestamp, validation history |
| **Simulations** | What-if scoring (override income, charges, credit usage…) without touching the client's real data; real-vs-simulated comparison; history |
| **Alerts** | Automatic risk alerts (high score, high debt ratio, inconsistent data, pending validation…), read/unread, mark-as-seen |
| **Dashboards** | Role-specific KPIs, charts, and evolution widgets with period selection |
| **Administration** | User CRUD, enable/disable, role assignment, password reset, immutable audit log |
| **Security** | JWT authentication, method-level RBAC, stateless sessions |

---

## System Architecture

```
                         ┌──────────────────────────────┐
                         │        Browser (host)         │
                         │   Angular 17 SPA · :4200      │
                         └───────────────┬──────────────┘
                                         │  HTTPS/JSON + JWT (Bearer)
                                         ▼
                         ┌──────────────────────────────┐
                         │   Spring Boot REST API :8080  │
                         │  Security · JWT · RBAC · JPA  │
                         └──────┬─────────────────┬──────┘
                    JDBC        │                 │   HTTP/JSON (/predict)
                                ▼                 ▼
              ┌────────────────────────┐   ┌───────────────────────────┐
              │   PostgreSQL 15 :5432  │   │   ML Service (FastAPI)     │
              │   Flyway-migrated      │   │   XGBoost + SHAP · :8000   │
              └────────────────────────┘   └───────────────────────────┘
```

- The **browser** talks to the backend at `http://localhost:8080`; browser calls can't
  resolve Docker service names, so the frontend always uses `localhost`.
- **Backend → PostgreSQL** and **Backend → ML Service** communicate over the Compose
  network using service names (`postgres`, `ml-service`).
- The **ML Service** is called lazily, only at scoring time. Scores, factors, and
  narrations are persisted by the backend.

See [`DOCKER.md`](DOCKER.md) for the full container/networking model and
[`docs/diagrams/`](docs/diagrams/) for UML/architecture diagrams.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 17.3 (standalone components), TypeScript, RxJS |
| **Backend** | Spring Boot 4.0.5, Java 21, Spring Security, Spring Data JPA, Flyway, Apache POI (Excel) |
| **Authentication** | JWT (JJWT 0.12, HS512) |
| **Machine Learning** | Python 3, FastAPI, Uvicorn, XGBoost, scikit-learn, SHAP, pandas, NumPy |
| **Database** | PostgreSQL 15 |
| **Tooling** | Docker & Docker Compose, pgAdmin, Maven, Angular CLI |

---

## Project Structure

```
scoring-project/
├── frontend/scoring-frontend/     # Angular SPA (see its README)
├── backend/scoring-backend/       # Spring Boot REST API (see its README)
├── ml-service/                    # FastAPI ML micro-service (see its README)
├── pgadmin/                       # Pre-registered pgAdmin server config
├── docs/                          # Screenshots & diagrams for the report
├── docker-compose.yml             # Full-stack orchestration
├── DOCKER.md                      # Docker architecture & operations
└── README.md                      # This file
```

---

## Authentication & Roles

Authentication is **stateless JWT**. The client logs in at `POST /api/auth/login`,
receives a signed token, and sends it as `Authorization: Bearer <token>` on every
request. A route guard protects the SPA; **authorization is enforced server-side**
with method-level checks (`@PreAuthorize`) on every endpoint — the UI restrictions are
a convenience, the API is the source of truth.

There are four **Roles**:

| Role | Purpose | Can do | Cannot do |
|------|---------|--------|-----------|
| **ADMINISTRATEUR** | Platform administration | Manage users (CRUD, enable/disable, reset password, assign roles), read audit log, view alerts | No operational access to Clients / Scores / Simulations |
| **SUPERVISEUR** | Risk supervision | Everything operational: view Clients & Scores, **validate/reject Scores**, recalculate, run **Simulations**, manage **Alerts** | User administration |
| **CHARGE_CLIENTELE** | Client officer | Create & edit Clients, view their Scores & SHAP explanations (via client detail), export | Validate scores, simulate, alerts, admin |
| **ANALYSTE** | Read-only analyst | View dashboards, Clients, Scores, SHAP explanations, validation status | **Any write action** — validate, recalculate, simulate, alerts, admin |

> The **Analyste** role is strictly read-only: every mutating endpoint returns
> `403 Forbidden` for it, at the API level.

---

## Machine Learning Workflow

The **Machine Learning** service scores **Credit Risk** as a calibrated probability of
default (PD). Model selection and evaluation are documented phase-by-phase in
[`ml-service/docs/`](ml-service/docs/).

**Training pipeline** (offline, reproducible from notebooks):

```
Give Me Some Credit dataset
   → semantic cleaning (clean_gmsc: sentinels, placeholders, 2 missingness flags)
   → fitted preprocessor (winsorization fitted on train only)
   → XGBoost with monotonic constraints
   → isotonic calibration (raw PD → calibrated PD)
   → decision threshold optimization (F1-optimal)
```

**Inference pipeline** (online, per request):

```
Backend payload (14 fields)
   → 10 raw credit-bureau variables (+ 2 computed indicators = 12 features)
   → clean_gmsc → embedded preprocessor → XGBoost → isotonic calibrator
   → calibrated PD → risk level + decision + SHAP factors + French narration
```

- **Explainability** — a SHAP `TreeExplainer` produces the top contributing factors
  (signed, ranked); a narration turns them into readable French. Both are persisted
  with the Score.
- **Two thresholds, two roles** — a **decision threshold** (≈ 0.223, F1-optimal) flags
  *high risk*; a **surveillance threshold** (≈ 0.101, F2-optimal) drives the
  Faible/Moyen/Élevé display only. Neither changes the model or its calibration.
- **Official test performance** (single hold-out evaluation): **ROC-AUC 0.8627**,
  PR-AUC 0.4060, KS 0.5726, Brier 0.0489, ECE 0.0030.

---

## Application Workflow

A typical Score lifecycle:

1. A **Chargé de clientèle** creates a **Client** → the backend calls the ML service
   and persists a **Score** (`EN_ATTENTE`) with SHAP factors and a narration.
2. Business rules may **escalate** the risk level (e.g. debt ratio ≥ 50 %) and raise
   **Alerts**.
3. A **Supervisor** reviews the pending Score and **validates** or **rejects** it; the
   decision and its timestamp are recorded, and the action is audited.
4. Anyone with access can consult the Score, its **SHAP explanation**, and its
   validation status; the Supervisor can **recalculate** or run a **Simulation**.
5. The **Administrator** oversees users and reviews the **audit log**.

---

## Screenshots

> Place captures under [`docs/screenshots/`](docs/screenshots/). Replace the
> placeholders below with real images.

| | |
|---|---|
| **Login** | **Supervisor Dashboard** |
| ![Login](docs/screenshots/login.png) | ![Supervisor Dashboard](docs/screenshots/dashboard-supervisor.png) |
| **Clients List** | **Client Detail + Score** |
| ![Clients](docs/screenshots/clients-list.png) | ![Client Detail](docs/screenshots/client-detail.png) |
| **Score + SHAP Explanation** | **Validation Queue** |
| ![SHAP](docs/screenshots/score-detail-shap.png) | ![Validation](docs/screenshots/scores-validation.png) |
| **Simulation** | **Alerts** |
| ![Simulation](docs/screenshots/simulation.png) | ![Alerts](docs/screenshots/alerts.png) |
| **User Management (Admin)** | **Audit Log (Admin)** |
| ![Users](docs/screenshots/admin-users.png) | ![Audit](docs/screenshots/audit-logs.png) |

---

## Installation

### Prerequisites

- **Docker Desktop** (with Compose v2) — recommended path, runs the whole stack.
- For local (non-Docker) runs: **Java 21**, **Node.js 20+**, **Python 3.11+**,
  and a **PostgreSQL 15** instance.

### Clone

```bash
git clone <your-repository-url> scoring-project
cd scoring-project
```

---

## Running with Docker

One command builds and starts PostgreSQL, pgAdmin, the ML service, the backend, and
the frontend:

```bash
docker compose up --build          # foreground, with logs
docker compose up -d --build       # detached
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:8080 |
| ML Service | http://localhost:8000 (`/health`, `/predict`) |
| pgAdmin | http://localhost:5050 |
| PostgreSQL | localhost:5432 |

Stop / rebuild:

```bash
docker compose down                # stop & remove containers (DB volume preserved)
docker compose up -d --build backend   # rebuild + restart one service
```

The first run is slow (Maven dependencies, xgboost/shap wheels); later runs are fast.
Full details and troubleshooting: [`DOCKER.md`](DOCKER.md).

---

## Running Locally (without Docker)

Start each service in its own terminal. See each component's README for details.

```bash
# 1) PostgreSQL — create database `scoring_db` (user scoring_user / pass scoring_pass)

# 2) ML service
cd ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# 3) Backend (Flyway migrates on startup)
cd backend/scoring-backend
./mvnw spring-boot:run

# 4) Frontend
cd frontend/scoring-frontend
npm install
npm start        # ng serve → http://localhost:4200
```

---

## Environment Variables

Configured via `docker-compose.yml` (Docker) or the OS environment / `application.yaml`
(local). Defaults exist for development.

| Variable | Used by | Default | Description |
|----------|---------|---------|-------------|
| `DB_HOST` | Backend | `localhost` (`postgres` in Docker) | PostgreSQL host |
| `DB_USER` | Backend | `scoring_user` | Database user |
| `DB_PASS` | Backend | `scoring_pass` | Database password |
| `JWT_SECRET` | Backend | *(dev default in `application.yaml`)* | HS512 signing key — **override in production** |
| `ADMIN_PASSWORD` | Backend | `Admin1234!` | Bootstrap admin password — **override in production** |
| `IA_SERVICE_URL` | Backend | `http://localhost:8000` (`http://ml-service:8000` in Docker) | ML service base URL |
| `IA_SERVICE_ENABLED` | Backend | `true` | Toggle ML scoring |
| `SPRING_DEVTOOLS_RESTART_ENABLED` | Backend | `true` (Docker dev) | Hot restart |

> **Security note:** the JWT secret and admin password ship with development defaults.
> Provide real secrets via environment variables (never commit them) before any real
> deployment. The frontend currently points at `http://localhost:8080` in its services
> (see the frontend README — *Environment configuration*).

---

## Default Users

Only the **bootstrap administrator** is created automatically on first startup
(`DataInitializer`), using `ADMIN_PASSWORD`:

| Role | Email | Password |
|------|-------|----------|
| Administrator | `admin@orus.ma` | `Admin1234!` *(from `ADMIN_PASSWORD`)* |

All other accounts (Supervisor, Chargé de clientèle, Analyste) are created by the
administrator through **Administration → Users**. In this project's demo environment
the following example accounts were used for testing each Role:

| Role | Email | Password |
|------|-------|----------|
| Supervisor | `kaoutar.loutfi@orus.ma` | `Kaoutar1234!` |
| Chargé de clientèle | `sara.benali@orus.ma` | `e93def0d-7` |
| Analyste | `youssef.chakir@orus.ma` | `Youssef1234!` |

> These are **development-only credentials** for demonstration. Change/remove them and
> rotate the admin password before any real deployment.

---

## Folder Structure

```
scoring-project/
├── frontend/scoring-frontend/
│   └── src/app/
│       ├── core/           # guards, interceptors, services, models, branding
│       ├── features/       # auth, dashboard, clients, scores, simulations, alertes, admin, profile
│       └── shared/         # reusable UI components (cards, tables, modals, icons…)
├── backend/scoring-backend/
│   └── src/main/
│       ├── java/com/orus/scoringbackend/
│       │   ├── config/         # security, CORS, data initializer
│       │   ├── security/       # JWT filter & service
│       │   ├── controllers/    # REST endpoints
│       │   ├── services/       # business logic (scoring, validation, alerts…)
│       │   ├── repositories/   # Spring Data JPA
│       │   ├── entities/       # JPA entities (User, Client, Score, …)
│       │   ├── dto/            # request/response DTOs
│       │   └── enums/          # Role, StatutScore, NiveauRisque, …
│       └── resources/
│           ├── application.yaml
│           └── db/migration/   # Flyway migrations (V1…V6)
├── ml-service/
│   ├── main.py             # FastAPI app (/health, /predict)
│   ├── src/preprocessing.py# shared cleaning + preprocessor + ScoringModel
│   ├── models/             # trained artifacts (git-ignored)
│   ├── notebooks/          # reproducible training pipeline
│   ├── docs/               # phase reports (audit → validation)
│   └── tests/
└── docs/                   # screenshots & diagrams
```

---

## Future Improvements

- **Frontend API configuration** — move the hardcoded `http://localhost:8080` base URL
  into Angular `environments/` (dev/prod) instead of per-service constants.
- **Session expiry UX** — add an HTTP interceptor that catches `401` and redirects to
  login (token lifetime is 24 h; expiry is currently enforced server-side only).
- **Production database safety** — disable Flyway's `clean-on-validation-error` and set
  `clean-disabled: true` for non-dev profiles.
- **Secrets management** — remove development default secrets; require them from the
  environment.
- **Testing** — expand automated backend (MockMvc) and frontend (Jasmine/Karma) test
  coverage; add CI.
- **Observability** — structured logging, metrics, and health dashboards.

---

## License

This project was produced as an academic end-of-studies internship project (PFE
2025–2026). No open-source license is currently applied; add one (e.g. MIT) here if you
intend to distribute it. All rights reserved by the author unless stated otherwise.
