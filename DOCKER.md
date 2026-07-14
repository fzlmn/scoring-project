# Running OScore with Docker

A single `docker compose up` brings up the entire **OScore** platform — PostgreSQL,
pgAdmin, the Machine Learning service, the Spring Boot backend, and the Angular
frontend — wired together on Compose's default network.

> Requires **Docker Desktop** with Compose v2 (BuildKit enabled by default).

---

## Architecture

```
        Host browser ──► frontend  :4200 ──► backend :8080
                                                 │   │
                              JDBC :5432 ◄───────┘   └──────► ml-service :8000
                                   │                             (/predict)
                              postgres  ◄── pgadmin :5050
```

- The **frontend** runs in your browser (on the host), so its API calls target
  `http://localhost:8080` — a browser cannot resolve Docker service names.
- The **backend** reaches other containers by **service name**: `postgres:5432` and
  `ml-service:8000`.
- The **ML service** is called lazily by the backend at scoring time.
- PostgreSQL data lives in a named volume and survives `docker compose down`.

---

## Services

| Service | Image / build | Host URL | Notes |
|---------|---------------|----------|-------|
| `postgres` | `postgres:15` | `localhost:5432` | DB `scoring_db` (user `scoring_user` / `scoring_pass`); healthcheck via `pg_isready` |
| `pgadmin` | `dpage/pgadmin4` | http://localhost:5050 | `admin@admin.com` / `admin`; `scoring_db` pre-registered |
| `ml-service` | `ml-service/Dockerfile.dev` | http://localhost:8000 | FastAPI + XGBoost + SHAP; uvicorn `--reload` |
| `backend` | `backend/scoring-backend/Dockerfile.dev` | http://localhost:8080 | Spring Boot; Flyway migrates on start; DevTools |
| `frontend` | `frontend/scoring-frontend/Dockerfile.dev` | http://localhost:4200 | Angular dev server with live reload |

Startup order is enforced with `depends_on` + healthchecks: `postgres` (healthy) →
`backend`; `ml-service` (started) → `backend`; `backend` (started) → `frontend`.

---

## Docker networking

- All services share Compose's default bridge network and resolve each other by
  **service name** (`postgres`, `ml-service`, `backend`).
- Only the ports listed above are published to the host.
- CORS on the backend allows the frontend origin `http://localhost:4200`.

---

## Startup

```bash
docker compose up              # build (first time) + start, logs in foreground
docker compose up -d           # detached
docker compose up --build      # force image rebuild, then start
```

First run is slow: the ML image installs xgboost/shap/scikit-learn and the backend
downloads its Maven dependencies into a cache volume. Subsequent runs are fast.

Check status / logs:

```bash
docker compose ps
docker compose logs -f backend       # follow one service
docker compose logs -f               # follow everything
```

---

## Shutdown

```bash
docker compose stop            # stop containers, keep them
docker compose down            # stop & remove containers (DB volume preserved)
docker compose down -v         # ALSO delete volumes (⚠️ wipes the database)
```

---

## Rebuild

```bash
docker compose build backend               # rebuild one image
docker compose up -d --build backend       # rebuild + restart one service
docker compose build                       # rebuild all
docker compose up -d --build               # rebuild all + restart
```

### Applying backend code changes (dev)

The backend runs via `mvn spring-boot:run` with **spring-boot-devtools**. Source is
bind-mounted, but nothing recompiles `.java` inside the container automatically, so
trigger a compile once — DevTools then hot-restarts in ~3 s:

```bash
docker compose exec backend mvn compile
```

Changing `pom.xml` (dependencies) needs a full restart:
`docker compose restart backend`. The **frontend** and **ML service** hot-reload on save
without extra steps.

---

## Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL data — **preserved** across `down`; only `down -v` deletes it |
| `pgadmin_data` | pgAdmin settings / registered servers |
| `maven_repo` | Backend Maven dependency cache (survives rebuilds) |
| `frontend_node_modules` | Linux-built `node_modules` (kept separate from the host copy) |
| `frontend_angular_cache` | Angular build cache |

> Don't rename the project folder — Compose derives volume names from it, so a rename
> orphans your existing `postgres_data`.

---

## pgAdmin

Open http://localhost:5050 and log in with `admin@admin.com` / `admin`. The `scoring_db`
server is pre-registered (`pgadmin/servers.json`); on first connect enter the database
password `scoring_pass` (pgAdmin offers to save it).

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `curl localhost:8080` refused for a while after `up` | Backend still starting (first run downloads Maven deps — minutes). Watch `docker compose logs -f backend`. |
| Backend exits / Flyway error on start | Migration checksum mismatch. In dev, `clean-on-validation-error` rebuilds the DB; if it persists, `docker compose down -v` (⚠️ wipes data) and start fresh. |
| Frontend can't reach the API | Confirm the backend is up on `:8080`; the frontend must call `localhost`, not `backend`. |
| `port is already allocated` | Another process uses 4200/8080/8000/5432/5050. Stop it or change the published port in `docker-compose.yml`. |
| ML service unhealthy at first | Model + SHAP explainer load takes a few seconds (healthcheck has a start-period grace window). |
| Backend code change not applied | Run `docker compose exec backend mvn compile` (DevTools restarts after). |
| Docker daemon not reachable | Start Docker Desktop and wait for the engine before `docker compose up`. |
