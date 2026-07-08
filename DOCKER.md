# Running the scoring platform with Docker (development)

One command brings up PostgreSQL, pgAdmin, the FastAPI ML service, the Spring Boot backend,
and the Angular frontend, wired together over Compose's default network.

> Requires Docker Desktop with BuildKit (the default) — the dev images use `--mount=type=cache`.

## Services & ports

| Service    | URL (from your machine)     | Hot reload |
|------------|-----------------------------|------------|
| Frontend   | http://localhost:4200       | Yes — live-reload/HMR (polling) |
| Backend    | http://localhost:8080       | Yes — auto recompile + DevTools restart (~5–10s) |
| ML service | http://localhost:8000       | Yes — uvicorn `--reload` |
| pgAdmin    | http://localhost:5050       | n/a |
| PostgreSQL | localhost:5432              | n/a |

Container names are managed by Compose (`scoring-project-<service>-1`); interact via the
**service name**, e.g. `docker compose logs -f backend`.

## Start / stop

```bash
docker compose up            # build (first time) + start everything, logs in foreground
docker compose up -d         # same, detached
docker compose up --build    # force image rebuild, then start

docker compose down          # stop & remove containers (DB data is kept in the volume)
docker compose stop          # just stop, keep containers
```

## Rebuild

```bash
docker compose build backend           # rebuild one service image
docker compose up -d --build backend   # rebuild + restart just the backend
docker compose build                   # rebuild all images
docker compose up -d --build           # rebuild all + restart
```

## Logs

```bash
docker compose logs -f backend         # follow one service
docker compose logs -f ml-service
docker compose logs -f                 # follow everything
```

## pgAdmin

Open http://localhost:5050 — login `admin@admin.com` / `admin`. The `scoring_db` server
is pre-registered (via `pgadmin/servers.json`); on first connect enter the DB password
`scoring_pass` (pgAdmin offers to save it).

## Hot reload per service

- **ML service** — full auto-reload. Edit anything under `ml-service/` and uvicorn restarts.
  (`WATCHFILES_FORCE_POLLING=true` makes the watcher work across the Windows bind mount.)
- **Frontend (Angular)** — live-reload/HMR on save. `--poll 2000` enables file-watching inside
  the container; `node_modules` lives in a named volume so the host (Windows-built) copy never
  shadows the container's Linux build.
- **Backend (Spring Boot)** — runs via `mvn spring-boot:run` with **spring-boot-devtools**.
  DevTools hot-restarts the running context (~3s) the moment `target/classes` changes. To apply
  a code change, trigger a recompile once:

  ```bash
  docker compose exec backend mvn compile      # DevTools then hot-restarts in ~3s
  ```

  **Limitation (tested, cannot be avoided):** a bare source save does *not* auto-reload. DevTools
  supplies the *restart* half, but nothing recompiles `.java` → `target/classes` inside the
  container. That compile step normally comes from your IDE; running the app from a terminal
  (your requirement) removes it. Docker Desktop on Windows also doesn't forward filesystem events
  across the bind mount, so a native file-watcher wouldn't fire either. So the reliable,
  zero-extra-complexity workflow is edit → `mvn compile` (one command) → automatic ~3s restart.
  Changing `pom.xml` (dependencies) needs a full restart: `docker compose restart backend`.
  - *Want fully-automatic save-to-reload?* It requires a recompile trigger — either point your
    IDE's build output at the mounted `target/`, or add a small polling loop that runs
    `mvn compile` on change. Both are deliberately left out to keep this setup simple; the
    one-command flow above is the recommended default.

## Why the frontend still calls `localhost:8080`

Angular API calls execute in your **browser**, which runs on the host, not inside a container.
Browsers cannot resolve Docker service names (`backend`, `postgres`, …) — that DNS only works
container-to-container. Since the backend publishes port 8080 to the host, `http://localhost:8080`
is the correct address for the browser, and CORS already allows `http://localhost:4200`. Service
names ARE used where they apply: backend→postgres, backend→ml-service, pgadmin→postgres.

## Notes

- Your existing **`postgres_data`** volume is preserved (its real name,
  `scoring-project_postgres_data`, is unaffected by these changes). `docker compose down` keeps it;
  only `docker compose down -v` would delete it. Don't rename the project folder — Compose derives
  the volume name from it.
- First `docker compose up` is slow (ML installs xgboost/shap/scikit-learn; backend downloads its
  Maven dependencies into `maven_repo`). Every run after that is fast thanks to layer/volume caches.
