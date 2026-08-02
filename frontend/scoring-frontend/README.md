# OScore — Frontend (Angular)

Application monopage (SPA) de la plateforme de risque de crédit **OScore**. Elle fournit la
connexion, les tableaux de bord par rôle et les écrans Clients / Scores / Validation /
Simulations / Alertes / Administration.

> Fait partie du mono-dépôt OScore — voir le [README racine](../../README.md) pour
> l'architecture complète, et le [README du backend](../../backend/scoring-backend/README.md)
> pour l'API consommée.

| Connexion | Tableau de bord par rôle (Superviseur) |
|:-----:|:---------------------------------:|
| ![Connexion](../../docs/screenshots/login-page.jpg) | ![Tableau de bord superviseur](../../docs/screenshots/superviseur-dashboard1.png) |

## Technologies & versions

| Élément | Version |
|------|---------|
| Angular | **17.3** (composants standalone, sans NgModules) |
| Angular CLI | 17.3.x |
| TypeScript | 5.4 |
| RxJS | 7.x |
| Node.js | 20+ recommandé |

L'état applicatif reste léger grâce à RxJS (`BehaviorSubject` dans `AuthService`) ; il n'y
a pas de bibliothèque externe de gestion d'état. Les échanges HTTP passent par un unique
intercepteur JWT.

## Structure des dossiers

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

Le routage est entièrement en chargement différé (`loadComponent`) ; toute route protégée
passe par `authGuard`, et les routes restreintes par rôle ajoutent `roleGuard` avec une
liste `data.roles`.

## Écrans

La SPA affiche un ensemble d'écrans différent selon le rôle ; l'accès est appliqué côté
serveur et reflété par les guards de route et la navigation. Ci-dessous, un écran
représentatif par rôle — la **visite complète des captures, rôle par rôle** (tous les
écrans, dans l'ordre du workflow) figure dans le
[README racine → Captures d'écran](../../README.md#captures-décran).

**Administrateur** — gestion des utilisateurs & audit (aucun accès opérationnel) :

![Administration — utilisateurs](../../docs/screenshots/utilisateurs.png)

**Superviseur** — clients, scores, validation, simulations et alertes. Exemple : l'écran de
validation d'un score (examiner les facteurs SHAP, puis valider ou rejeter) :

![Validation d'un score](../../docs/screenshots/valider-scores2.png)

**Chargé de clientèle** — crée et modifie des clients (formulaire multi-étapes ; le scoring
s'exécute à la soumission) et les consulte :

![Nouveau client (étape 1)](../../docs/screenshots/nouveau-client1.png)

**Analyste** — lecture seule ; consulte les clients, les scores et leurs explications SHAP :

![Détail d'un score avec SHAP (analyste)](../../docs/screenshots/analyste-score-detail2.png)

## Exécution en local

```bash
npm install
npm start          # = ng serve → http://localhost:4200 (auto-reload on save)
```

Le serveur de développement attend le backend sur `http://localhost:8080` et le service ML
joignable par le backend. Démarrez-les d'abord (voir le README racine), ou lancez toute la
stack avec Docker.

## Serveur de développement

```bash
ng serve                       # http://localhost:4200
ng serve --port 4300           # custom port
ng serve --host 0.0.0.0        # expose on the network
```

## Build

```bash
ng build                       # development build → dist/
```

## Build de production

```bash
ng build --configuration production
```

Produit un bundle optimisé et haché dans `dist/scoring-frontend/`. Les budgets sont
configurés dans `angular.json` (bundle initial et styles par composant) ; le build de
production se termine actuellement **sans aucun avertissement**.

## Configuration de l'environnement

> **État actuel (à noter) :** l'URL de base de l'API est **codée en dur** à
> `http://localhost:8080/api` dans chaque service sous `src/app/core/services/`
> (par ex. `auth.service.ts`, `client.service.ts`). Il n'existe pas encore de fichier
> `environments/` Angular.

Pour pointer l'application vers un autre backend aujourd'hui, modifiez les constantes
`apiUrl` / `base` dans ces services. **Amélioration recommandée :** introduire des fichiers
d'environnement Angular et un unique `API_BASE_URL` injectable :

```
src/environments/environment.ts          # { apiBaseUrl: 'http://localhost:8080/api' }
src/environments/environment.production.ts
```

puis référencer `environment.apiBaseUrl` depuis les services et ajouter une entrée
`fileReplacements` à la configuration de production dans `angular.json`.

## Commandes npm / Angular CLI utiles

| Commande | Rôle |
|---------|---------|
| `npm start` | Lancer le serveur de développement (`ng serve`) |
| `npm run build` | Build de développement |
| `npm run build -- --configuration production` | Build de production |
| `npm run watch` | Reconstruction à chaque changement (config de développement) |
| `npm test` | Tests unitaires (Karma/Jasmine) |
| `ng generate component features/<name>` | Générer un composant standalone |
| `ng lint` | Linter (si `@angular-eslint` est configuré) |

## Flux d'authentification (frontend)

1. `POST /api/auth/login` renvoie un JWT ; `AuthService` stocke le jeton + l'utilisateur
   dans `localStorage` et met à jour un `BehaviorSubject` d'authentification.
2. `jwtInterceptor` ajoute `Authorization: Bearer <token>` à chaque requête.
3. `authGuard` bloque la navigation non authentifiée ; `roleGuard` redirige vers le tableau
   de bord les utilisateurs ne disposant pas du rôle requis.
4. La déconnexion vide le stockage et renvoie vers `/login`.
