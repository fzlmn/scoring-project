# OScore — Frontend (Angular)

Single-page application for the **OScore** credit-risk platform. Provides the login,
role-based dashboards, and the Clients / Scores / Validation / Simulations / Alerts /
Administration screens.

> Part of the OScore monorepo — see the [root README](../../README.md) for the full
> architecture, and the [backend README](../../backend/scoring-backend/README.md) for
> the API it consumes.

## Tech & versions

| Item | Version |
|------|---------|
| Angular | **17.3** (standalone components, no NgModules) |
| Angular CLI | 17.3.x |
| TypeScript | 5.4 |
| RxJS | 7.x |
| Node.js | 20+ recommended |

State is kept lightweight with RxJS (`BehaviorSubject` in `AuthService`); there is no
external state-management library. HTTP is wired through a single JWT interceptor.

## Folder structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/         # authGuard (authenticated), roleGuard (per-role)
│   │   ├── interceptors/   # jwtInterceptor (adds Bearer token)
│   │   ├── services/       # auth, client, score, simulation, alerte, dashboard, user, audit-log, toast, export, confirm…
│   │   ├── models/         # typed interfaces (User, Client, Score, Simulation, Alerte…)
│   │   ├── utils/          # helpers
│   │   └── branding.ts     # centralized brand config (name, logos)
│   ├── features/
│   │   ├── auth/           # login
│   │   ├── dashboard/      # role dashboard + admin dashboard
│   │   ├── clients/        # list, detail, form
│   │   ├── scores/         # list, validation queue
│   │   ├── simulations/    # simulation form, history
│   │   ├── alertes/        # alerts list
│   │   ├── admin/          # users, audit logs
│   │   └── profile/        # current-user profile
│   ├── shared/components/  # reusable UI (cards, data-table, modals, icons, kpi, gauge, sidebar…)
│   ├── app.component.ts    # root shell (router-outlet + toasts + confirm dialog)
│   ├── app.config.ts       # providers (router, HttpClient + interceptor)
│   └── app.routes.ts       # lazy-loaded routes with guards
├── assets/branding/        # PNG logos referenced by branding.ts
├── styles.css              # global styles / CSS variables (design tokens)
└── index.html
```

Routing is fully lazy-loaded (`loadComponent`); every protected route is behind
`authGuard`, and role-restricted routes add `roleGuard` with a `data.roles` list.

## Running locally

```bash
npm install
npm start          # = ng serve → http://localhost:4200 (auto-reload on save)
```

The dev server expects the backend at `http://localhost:8080` and the ML service to be
reachable by the backend. Start those first (see the root README), or run the whole
stack with Docker.

## Development server

```bash
ng serve                       # http://localhost:4200
ng serve --port 4300           # custom port
ng serve --host 0.0.0.0        # expose on the network
```

## Build

```bash
ng build                       # development build → dist/
```

## Production build

```bash
ng build --configuration production
```

Outputs a hashed, optimized bundle to `dist/scoring-frontend/`. Budgets are configured
in `angular.json` (initial bundle and per-component styles); the production build
currently completes with **no warnings**.

## Environment configuration

> **Current state (be aware):** the API base URL is **hardcoded** as
> `http://localhost:8080/api` inside each service under
> `src/app/core/services/` (e.g. `auth.service.ts`, `client.service.ts`). There is no
> Angular `environments/` file yet.

To point the app at a different backend today, update the `apiUrl` / `base` constants in
those services. **Recommended improvement:** introduce Angular environment files and a
single injectable `API_BASE_URL`:

```
src/environments/environment.ts          # { apiBaseUrl: 'http://localhost:8080/api' }
src/environments/environment.production.ts
```

then reference `environment.apiBaseUrl` from the services and add a `fileReplacements`
entry to the production configuration in `angular.json`.

## Useful npm / Angular CLI commands

| Command | Purpose |
|---------|---------|
| `npm start` | Run the dev server (`ng serve`) |
| `npm run build` | Development build |
| `npm run build -- --configuration production` | Production build |
| `npm run watch` | Rebuild on change (development config) |
| `npm test` | Unit tests (Karma/Jasmine) |
| `ng generate component features/<name>` | Scaffold a standalone component |
| `ng lint` | Lint (if `@angular-eslint` is configured) |

## Authentication flow (frontend)

1. `POST /api/auth/login` returns a JWT; `AuthService` stores the token + user in
   `localStorage` and updates an auth `BehaviorSubject`.
2. `jwtInterceptor` attaches `Authorization: Bearer <token>` to every request.
3. `authGuard` blocks unauthenticated navigation; `roleGuard` redirects users without
   the required role back to the dashboard.
4. Logout clears storage and returns to `/login`.
