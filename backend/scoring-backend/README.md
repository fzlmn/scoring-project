# OScore — Backend (Spring Boot)

API REST de la plateforme de risque de crédit **OScore**. Elle prend en charge
l'authentification, l'autorisation, le modèle de domaine (Clients, Scores, Simulations,
Validation, Alertes, Utilisateurs, Audit), la persistance et l'orchestration du service de
Machine Learning.

> Fait partie du mono-dépôt OScore — voir le [README racine](../../README.md) pour
> l'architecture d'ensemble.

## Présentation

| Élément | Valeur |
|------|-------|
| Framework | **Spring Boot 4.0.5** |
| Langage | **Java 21** |
| Modules | Web MVC, Security, Data JPA, Validation, Flyway |
| Authentification | JWT (JJWT 0.12, HS512), sans état |
| Base de données | PostgreSQL 15 (migrée par Flyway) |
| Export Excel | Apache POI 5.2 |
| Build | Maven (wrapper inclus) |
| Chemin de base | `/api` · port par défaut `8080` |

L'architecture suit un découpage en couches classique :

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

Le modèle de domaine (entités JPA et leurs énumérations) est résumé ci-dessous.

![Diagramme de classes du domaine](../../docs/diagrams/class-diagram.png)

*Figure — Modèle de domaine du backend : entités (User, Client, Score, Explication, Alerte, Simulation, AuditLog) et leurs énumérations.*

## Sécurité

- Sessions **sans état** (`SessionCreationPolicy.STATELESS`), CSRF désactivé (API basée sur
  jetons), CORS restreint à l'origine Angular (`http://localhost:4200`).
- **Point d'entrée public :** uniquement `POST /api/auth/login`. Tout le reste exige une
  authentification (`anyRequest().authenticated()`).
- **RBAC au niveau des méthodes :** `@EnableMethodSecurity` + `@PreAuthorize("hasRole(...)")`
  / `hasAnyRole(...)` sur chaque méthode de contrôleur. L'autorisation est appliquée **côté
  serveur** — les guards Angular ne sont qu'un confort d'utilisation.
- Les mots de passe sont hachés avec **BCrypt**.
- Contrat d'erreur JSON : `401` (`Authentification requise`) si non authentifié,
  `403` (`Accès refusé — droits insuffisants`) en cas d'échec d'autorisation.

### Rôles

`ADMINISTRATEUR`, `SUPERVISEUR`, `CHARGE_CLIENTELE`, `ANALYSTE` — voir le
[README racine](../../README.md#authentification-et-rôles) pour la matrice complète des
permissions. Le rôle **ANALYSTE** est strictement en lecture seule (tout endpoint mutant
renvoie `403`).

## Authentification JWT

1. `POST /api/auth/login` vérifie les identifiants et renvoie un JWT signé
   (`AuthService` → `JwtService.generateToken`).
2. `JwtAuthFilter` s'exécute avant le filtre username/password, extrait le jeton Bearer,
   valide la signature + l'expiration, et peuple le `SecurityContext` avec le principal
   `User`.
3. Les paramètres du jeton se trouvent dans `application.yaml` :
   - `jwt.secret` — clé de signature HS512 (à surcharger via `JWT_SECRET` en production).
   - `jwt.expiration` — `86400000` ms (**24 h**).

`GET /api/auth/me` renvoie l'utilisateur actuellement authentifié (nécessite un jeton
valide).

![Diagramme de séquence de l'authentification JWT](../../docs/diagrams/jwt-auth-sequence.png)

*Figure — Flux d'authentification : la connexion émet un JWT signé ; chaque requête suivante est validée par `JwtAuthFilter` et autorisée selon le rôle.*

## Migrations Flyway

Le schéma est versionné et appliqué automatiquement au démarrage
(`spring.jpa.hibernate.ddl-auto: validate` — Hibernate ne modifie jamais le schéma ;
c'est Flyway qui en est propriétaire). Les migrations se trouvent dans
`src/main/resources/db/migration/` :

| Migration | Rôle |
|-----------|---------|
| `V1__init.sql` | Schéma initial : `users`, `clients`, `scores`, `explications`, `alertes`, `simulations`, `audit_logs` |
| `V2__add_client_scoring_features.sql` | Variables de scoring supplémentaires du client |
| `V3__add_score_decided_at.sql` | Colonne `decided_at` sur les scores |
| `V4__backfill_score_decided_at.sql` | Remplissage rétroactif de `decided_at` |
| `V5__simulation_parametres.sql` | Persistance des paramètres de simulation |
| `V6__add_credit_plafond_solde.sql` | Champs plafond / solde du crédit |

> ⚠️ Dans `application.yaml`, Flyway est configuré pour le développement avec
> `clean-on-validation-error: true` et `clean-disabled: false` — une incohérence de
> checksum **supprimera et reconstruira** la base. À désactiver pour tout profil autre que
> développement.

## PostgreSQL

- La connexion est configurée via `DB_HOST` / `DB_USER` / `DB_PASS` (valeurs par défaut :
  `localhost` / `scoring_user` / `scoring_pass`, base `scoring_db`).
- Sous Docker, `DB_HOST=postgres` (nom de service Compose).
- Le modèle de domaine est entièrement relationnel avec des clés étrangères (par ex.
  `scores.client_id → clients.id`, `explications.score_id → scores.id`,
  `audit_logs.user_id → users.id`).

![Diagramme entité-association de la base de données](../../docs/diagrams/er-diagram.png)

*Figure — Schéma relationnel construit par les migrations Flyway (V1 → V6) : tables, colonnes, clés primaires et étrangères.*

## API REST

Toutes les routes sont préfixées par `/api`. L'autorisation est indiquée par route.

### Auth
| Méthode | Chemin | Rôles |
|--------|------|-------|
| POST | `/auth/login` | public |
| GET | `/auth/me` | authentifié |

### Tableau de bord
| Méthode | Chemin | Rôles |
|--------|------|-------|
| GET | `/dashboard` | tout utilisateur authentifié |
| GET | `/dashboard/evolution/validations` | ANALYSTE, SUPERVISEUR |
| GET | `/dashboard/evolution/scores` | ANALYSTE, SUPERVISEUR |
| GET | `/dashboard/evolution/alertes` | SUPERVISEUR |
| GET | `/dashboard/evolution/clients` | CHARGE_CLIENTELE |

### Clients
| Méthode | Chemin | Rôles |
|--------|------|-------|
| GET | `/clients` | CHARGE, ANALYSTE, SUPERVISEUR |
| GET | `/clients/{id}` | CHARGE, ANALYSTE, SUPERVISEUR |
| POST | `/clients` | CHARGE_CLIENTELE |
| PUT | `/clients/{id}` | CHARGE_CLIENTELE |
| POST | `/clients/{id}/recalculer-score` | SUPERVISEUR |
| GET | `/clients/{id}/export` | CHARGE, ANALYSTE, SUPERVISEUR |
| GET | `/clients/export` | CHARGE, ANALYSTE, SUPERVISEUR |

### Scores
| Méthode | Chemin | Rôles |
|--------|------|-------|
| GET | `/scores` | ANALYSTE, SUPERVISEUR |
| GET | `/scores/en-attente` | SUPERVISEUR |
| GET | `/scores/client/{clientId}` | CHARGE, ANALYSTE, SUPERVISEUR |
| GET | `/scores/{id}` | CHARGE, ANALYSTE, SUPERVISEUR |
| PATCH | `/scores/{id}/valider` | SUPERVISEUR |

### Simulations
| Méthode | Chemin | Rôles |
|--------|------|-------|
| POST | `/simulations` | SUPERVISEUR |
| GET | `/simulations` | SUPERVISEUR |
| GET | `/simulations/client/{clientId}` | SUPERVISEUR |

### Alertes
| Méthode | Chemin | Rôles |
|--------|------|-------|
| GET | `/alertes` | SUPERVISEUR, ADMINISTRATEUR |
| GET | `/alertes/non-lues` | SUPERVISEUR, ADMINISTRATEUR |
| GET | `/alertes/summary` | SUPERVISEUR, ADMINISTRATEUR |
| POST | `/alertes/regenerer` | SUPERVISEUR, ADMINISTRATEUR |
| PATCH | `/alertes/{id}/statut` | SUPERVISEUR |
| PATCH | `/alertes/marquer-vues` | SUPERVISEUR, ADMINISTRATEUR |

### Utilisateurs (admin)
| Méthode | Chemin | Rôles |
|--------|------|-------|
| GET | `/users` | ADMINISTRATEUR |
| GET | `/users/{id}` | ADMINISTRATEUR |
| POST | `/users` | ADMINISTRATEUR |
| PUT | `/users/{id}` | ADMINISTRATEUR |
| PATCH | `/users/{id}/desactiver` | ADMINISTRATEUR |
| PATCH | `/users/{id}/activer` | ADMINISTRATEUR |
| PATCH | `/users/{id}/reinitialiser-mot-de-passe` | ADMINISTRATEUR |

### Journal d'audit (admin)
| Méthode | Chemin | Rôles |
|--------|------|-------|
| GET | `/audit-logs` | ADMINISTRATEUR |
| GET | `/audit-logs/user/{userId}` | ADMINISTRATEUR |
| GET | `/audit-logs/{entite}/{entiteId}` | ADMINISTRATEUR |

## Exécution en local

Prérequis : **Java 21**, une instance **PostgreSQL 15** en cours d'exécution (base
`scoring_db`), et le **service ML** sur `:8000` (ou définir `IA_SERVICE_ENABLED=false` pour
désactiver le scoring).

```bash
# from backend/scoring-backend/
export DB_HOST=localhost DB_USER=scoring_user DB_PASS=scoring_pass
export IA_SERVICE_URL=http://localhost:8000
./mvnw spring-boot:run          # Flyway migrates, app starts on :8080
```

Au premier démarrage, `DataInitializer` crée un **unique administrateur d'amorçage**
(`admin@orus.ma`) à partir de `ADMIN_PASSWORD` (par défaut `Admin1234!`). Aucun autre
compte n'est initialisé — les comptes Superviseur, Chargé de clientèle et Analyste sont
créés manuellement par l'administrateur via **Administration → Utilisateurs**.

## Commandes Maven

| Commande | Rôle |
|---------|---------|
| `./mvnw spring-boot:run` | Lancer l'application |
| `./mvnw compile` | Compiler |
| `./mvnw test` | Exécuter les tests |
| `./mvnw clean package` | Construire le JAR exécutable (`target/*.jar`) |
| `./mvnw clean package -DskipTests` | Construire sans les tests |
| `java -jar target/scoring-backend-0.0.1-SNAPSHOT.jar` | Lancer le JAR construit |

> Sous Windows, utilisez `mvnw.cmd` au lieu de `./mvnw`.

## Configuration

Tous les paramètres se trouvent dans `src/main/resources/application.yaml`, surchargables
par variables d'environnement :

| Propriété | Variable d'env. | Défaut |
|----------|-----|---------|
| `spring.datasource.url` (hôte) | `DB_HOST` | `localhost` |
| `spring.datasource.username` | `DB_USER` | `scoring_user` |
| `spring.datasource.password` | `DB_PASS` | `scoring_pass` |
| `jwt.secret` | `JWT_SECRET` | valeur de dev par défaut |
| `jwt.expiration` | — | `86400000` (24 h) |
| `ia.service.url` | `IA_SERVICE_URL` | `http://localhost:8000` |
| `ia.service.enabled` | `IA_SERVICE_ENABLED` | `true` |
| `ia.mad-to-usd-rate` | — | `10.0` (mise à l'échelle des revenus pour le modèle) |
| `admin.password` | `ADMIN_PASSWORD` | `Admin1234!` |
| `server.port` | — | `8080` |
