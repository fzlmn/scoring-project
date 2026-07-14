# OScore — Backend (Spring Boot)

REST API for the **OScore** credit-risk platform. Owns authentication, authorization,
the domain model (Clients, Scores, Simulations, Validation, Alerts, Users, Audit),
persistence, and orchestration of the Machine Learning service.

> Part of the OScore monorepo — see the [root README](../../README.md) for the overall
> architecture.

## Overview

| Item | Value |
|------|-------|
| Framework | **Spring Boot 4.0.5** |
| Language | **Java 21** |
| Modules | Web MVC, Security, Data JPA, Validation, Flyway |
| Auth | JWT (JJWT 0.12, HS512), stateless |
| Database | PostgreSQL 15 (Flyway-migrated) |
| Excel export | Apache POI 5.2 |
| Build | Maven (wrapper included) |
| Base path | `/api` · default port `8080` |

Architecture is a classic layered design:

```
controllers/   REST endpoints (@RestController, @PreAuthorize)
services/      business logic (scoring, validation, alerts, simulations, audit, export)
repositories/  Spring Data JPA
entities/      JPA entities  — User, Client, Score, Explication, Simulation, Alerte, AuditLog
dto/           request/response objects (validated)
enums/         Role, StatutScore, NiveauRisque, StatutAlerte, TypeAlerte, SituationPro, HistoriqueFinancier…
security/      JwtService, JwtAuthFilter
config/        SecurityConfig, AppConfig (CORS + RestTemplate), DataInitializer
```

## Security

- **Stateless** sessions (`SessionCreationPolicy.STATELESS`), CSRF disabled (token-based
  API), CORS restricted to the Angular origin (`http://localhost:4200`).
- **Public endpoint:** only `POST /api/auth/login`. Everything else requires
  authentication (`anyRequest().authenticated()`).
- **Method-level RBAC:** `@EnableMethodSecurity` + `@PreAuthorize("hasRole(...)")` /
  `hasAnyRole(...)` on each controller method. Authorization is enforced **on the
  server** — the Angular guards are only a UX convenience.
- Passwords are hashed with **BCrypt**.
- JSON error contract: `401` (`Authentification requise`) for unauthenticated,
  `403` (`Accès refusé — droits insuffisants`) for authorization failures.

### Roles

`ADMINISTRATEUR`, `SUPERVISEUR`, `CHARGE_CLIENTELE`, `ANALYSTE` — see the
[root README](../../README.md#authentication--roles) for the full permission matrix.
The **ANALYSTE** role is strictly read-only (every mutating endpoint returns `403`).

## JWT Authentication

1. `POST /api/auth/login` verifies credentials and returns a signed JWT
   (`AuthService` → `JwtService.generateToken`).
2. `JwtAuthFilter` runs before the username/password filter, extracts the Bearer token,
   validates signature + expiry, and populates the `SecurityContext` with the `User`
   principal.
3. Token settings live in `application.yaml`:
   - `jwt.secret` — HS512 signing key (override via `JWT_SECRET` in production).
   - `jwt.expiration` — `86400000` ms (**24 h**).

`GET /api/auth/me` returns the current authenticated user (requires a valid token).

## Flyway Migrations

Schema is versioned and applied automatically on startup
(`spring.jpa.hibernate.ddl-auto: validate` — Hibernate never mutates the schema;
Flyway owns it). Migrations live in `src/main/resources/db/migration/`:

| Migration | Purpose |
|-----------|---------|
| `V1__init.sql` | Initial schema: `users`, `clients`, `scores`, `explications`, `alertes`, `simulations`, `audit_logs` |
| `V2__add_client_scoring_features.sql` | Additional client scoring features |
| `V3__add_score_decided_at.sql` | `decided_at` column on scores |
| `V4__backfill_score_decided_at.sql` | Backfill of `decided_at` |
| `V5__simulation_parametres.sql` | Simulation parameters persistence |
| `V6__add_credit_plafond_solde.sql` | Credit ceiling / balance fields |

> ⚠️ In `application.yaml`, Flyway is configured for development with
> `clean-on-validation-error: true` and `clean-disabled: false` — a checksum mismatch
> will **drop and rebuild** the database. Disable this for any non-dev profile.

## PostgreSQL

- Connection is configured through `DB_HOST` / `DB_USER` / `DB_PASS` (defaults:
  `localhost` / `scoring_user` / `scoring_pass`, database `scoring_db`).
- In Docker, `DB_HOST=postgres` (Compose service name).
- The domain model is fully relational with foreign keys (e.g. `scores.client_id →
  clients.id`, `explications.score_id → scores.id`, `audit_logs.user_id → users.id`).

## REST API

All routes are prefixed with `/api`. Authorization shown per route.

### Auth
| Method | Path | Roles |
|--------|------|-------|
| POST | `/auth/login` | public |
| GET | `/auth/me` | authenticated |

### Dashboard
| Method | Path | Roles |
|--------|------|-------|
| GET | `/dashboard` | any authenticated |
| GET | `/dashboard/evolution/validations` | ANALYSTE, SUPERVISEUR |
| GET | `/dashboard/evolution/scores` | ANALYSTE, SUPERVISEUR |
| GET | `/dashboard/evolution/alertes` | SUPERVISEUR |
| GET | `/dashboard/evolution/clients` | CHARGE_CLIENTELE |

### Clients
| Method | Path | Roles |
|--------|------|-------|
| GET | `/clients` | CHARGE, ANALYSTE, SUPERVISEUR |
| GET | `/clients/{id}` | CHARGE, ANALYSTE, SUPERVISEUR |
| POST | `/clients` | CHARGE_CLIENTELE |
| PUT | `/clients/{id}` | CHARGE_CLIENTELE |
| POST | `/clients/{id}/recalculer-score` | SUPERVISEUR |
| GET | `/clients/{id}/export` | CHARGE, ANALYSTE, SUPERVISEUR |
| GET | `/clients/export` | CHARGE, ANALYSTE, SUPERVISEUR |

### Scores
| Method | Path | Roles |
|--------|------|-------|
| GET | `/scores` | ANALYSTE, SUPERVISEUR |
| GET | `/scores/en-attente` | SUPERVISEUR |
| GET | `/scores/client/{clientId}` | CHARGE, ANALYSTE, SUPERVISEUR |
| GET | `/scores/{id}` | CHARGE, ANALYSTE, SUPERVISEUR |
| PATCH | `/scores/{id}/valider` | SUPERVISEUR |

### Simulations
| Method | Path | Roles |
|--------|------|-------|
| POST | `/simulations` | SUPERVISEUR |
| GET | `/simulations` | SUPERVISEUR |
| GET | `/simulations/client/{clientId}` | SUPERVISEUR |

### Alerts
| Method | Path | Roles |
|--------|------|-------|
| GET | `/alertes` | SUPERVISEUR, ADMINISTRATEUR |
| GET | `/alertes/non-lues` | SUPERVISEUR, ADMINISTRATEUR |
| GET | `/alertes/summary` | SUPERVISEUR, ADMINISTRATEUR |
| POST | `/alertes/regenerer` | SUPERVISEUR, ADMINISTRATEUR |
| PATCH | `/alertes/{id}/statut` | SUPERVISEUR |
| PATCH | `/alertes/marquer-vues` | SUPERVISEUR, ADMINISTRATEUR |

### Users (admin)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/users` | ADMINISTRATEUR |
| GET | `/users/{id}` | ADMINISTRATEUR |
| POST | `/users` | ADMINISTRATEUR |
| PUT | `/users/{id}` | ADMINISTRATEUR |
| PATCH | `/users/{id}/desactiver` | ADMINISTRATEUR |
| PATCH | `/users/{id}/activer` | ADMINISTRATEUR |
| PATCH | `/users/{id}/reinitialiser-mot-de-passe` | ADMINISTRATEUR |

### Audit logs (admin)
| Method | Path | Roles |
|--------|------|-------|
| GET | `/audit-logs` | ADMINISTRATEUR |
| GET | `/audit-logs/user/{userId}` | ADMINISTRATEUR |
| GET | `/audit-logs/{entite}/{entiteId}` | ADMINISTRATEUR |

## Running locally

Prerequisites: **Java 21**, a running **PostgreSQL 15** (database `scoring_db`), and the
**ML service** on `:8000` (or set `IA_SERVICE_ENABLED=false` to skip scoring).

```bash
# from backend/scoring-backend/
export DB_HOST=localhost DB_USER=scoring_user DB_PASS=scoring_pass
export IA_SERVICE_URL=http://localhost:8000
./mvnw spring-boot:run          # Flyway migrates, app starts on :8080
```

On first startup a bootstrap administrator (`admin@orus.ma`) is created with
`ADMIN_PASSWORD` (default `Admin1234!`).

## Maven commands

| Command | Purpose |
|---------|---------|
| `./mvnw spring-boot:run` | Run the application |
| `./mvnw compile` | Compile |
| `./mvnw test` | Run tests |
| `./mvnw clean package` | Build the executable JAR (`target/*.jar`) |
| `./mvnw clean package -DskipTests` | Build without tests |
| `java -jar target/scoring-backend-0.0.1-SNAPSHOT.jar` | Run the built JAR |

> On Windows use `mvnw.cmd` instead of `./mvnw`.

## Configuration

All settings are in `src/main/resources/application.yaml`, overridable via environment
variables:

| Property | Env | Default |
|----------|-----|---------|
| `spring.datasource.url` (host) | `DB_HOST` | `localhost` |
| `spring.datasource.username` | `DB_USER` | `scoring_user` |
| `spring.datasource.password` | `DB_PASS` | `scoring_pass` |
| `jwt.secret` | `JWT_SECRET` | dev default |
| `jwt.expiration` | — | `86400000` (24 h) |
| `ia.service.url` | `IA_SERVICE_URL` | `http://localhost:8000` |
| `ia.service.enabled` | `IA_SERVICE_ENABLED` | `true` |
| `ia.mad-to-usd-rate` | — | `10.0` (income scaling for the model) |
| `admin.password` | `ADMIN_PASSWORD` | `Admin1234!` |
| `server.port` | — | `8080` |
