# HackHub

A full-stack **hackathon collaboration platform** — teams, projects, hackathons, submissions, judging, real-time chat, and a public showcase — built as a **pnpm + Turborepo monorepo** with 3 Next.js frontends, 7 Express microservices behind an API gateway, and a built-in **LGTM observability stack** (Grafana, Loki, Tempo, Mimir/Prometheus).

---

## Table of contents

- [What you get](#what-you-get)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Monorepo layout](#monorepo-layout)
- [Ports](#ports)
- [Quick start — Docker (full stack)](#quick-start--docker-full-stack)
- [Quick start — local dev](#quick-start--local-dev)
- [Scripts reference](#scripts-reference)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Testing & code quality](#testing--code-quality)
- [Observability (LGTM)](#observability-lgtm)
- [How the Docker images are built](#how-the-docker-images-are-built)
- [Troubleshooting](#troubleshooting)

---

## What you get

| Area                 | Features                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**             | Register, login, refresh-token rotation, OTP email verification, forgot/reset password, JWT access + refresh (httpOnly cookies), bcrypt hashing |
| **Projects & teams** | Create projects, tasks, team creation/join/leave, member management, submissions                                                                |
| **Hackathons**       | Create/browse hackathons, registration, project submission per hackathon                                                                        |
| **Judging**          | Judge login via registration codes, submission review, evaluations, leaderboard                                                                 |
| **Chat**             | Real-time Socket.io chat — rooms, DMs, unread counts, history                                                                                   |
| **Showcase**         | Public project feed, likes, comments, leaderboard, stats                                                                                        |
| **Admin console**    | Manage users, teams, projects, hackathons, judges + overview dashboard                                                                          |
| **Observability**    | OpenTelemetry traces/metrics/logs from every service → Grafana dashboard (auto-provisioned)                                                     |

---

## Tech stack

### Frontend (3 apps)

| Tech                                                       | Version / notes                      |
| ---------------------------------------------------------- | ------------------------------------ |
| **Next.js** (App Router)                                   | 16.2.6                               |
| **React**                                                  | 19.2.4                               |
| **Tailwind CSS**                                           | 4.3                                  |
| **shadcn/ui** + Radix UI + Base UI                         | component system in `packages/ui`    |
| **Zustand**                                                | client state                         |
| **Framer Motion**, **Lucide**, **Sonner**, **next-themes** | animations, icons, toasts, dark mode |
| **Axios**                                                  | HTTP client                          |
| **socket.io-client**                                       | real-time chat                       |

### Backend (7 services + gateway)

| Tech                                                             | Notes                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| **Express 5**                                                    | HTTP servers                                                   |
| **tsx**                                                          | TypeScript execution at runtime (no build step)                |
| **Socket.io 4**                                                  | chat service + WS proxying through the gateway                 |
| **Zod**                                                          | request validation + env validation (services exit on bad env) |
| **Prisma** (with `@prisma/adapter-pg`)                           | PostgreSQL ORM, 21 models                                      |
| **ioredis**                                                      | Redis client (Upstash `rediss://` TLS supported)               |
| **JWT + bcrypt**                                                 | auth (via `@workspace/utils` / auth-service)                   |
| **nodemailer (Gmail)**                                           | OTP / email verification                                       |
| **helmet, cors, compression, express-rate-limit, cookie-parser** | gateway middleware                                             |
| **express-http-proxy**                                           | gateway → service proxying                                     |

### Platform & tooling

| Tech                                        | Notes                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| **pnpm 10.33.4** workspaces                 | `apps/*` + `packages/*`                                                |
| **Turborepo 2.9**                           | task orchestration (build/dev/lint/typecheck/test)                     |
| **Node ≥ 20** (22 in Docker)                | engines requirement                                                    |
| **TypeScript 5**                            | strict, shared configs                                                 |
| **Vitest 4 + supertest**                    | 553 tests across the workspace                                         |
| **ESLint 9 + Prettier** (+ Tailwind plugin) | lint/format                                                            |
| **Husky + lint-staged**                     | pre-commit auto-fix                                                    |
| **PostgreSQL 16**                           | local Docker or Neon                                                   |
| **Redis 7**                                 | local Docker or Upstash                                                |
| **OpenTelemetry**                           | auto-instrumentations, OTLP HTTP exporters (traces, metrics @5s, logs) |
| **Winston** (+ daily rotate) + **morgan**   | structured logging / HTTP logs                                         |
| **ImageKit**                                | avatar & image uploads                                                 |
| **Docker**                                  | multi-stage images for all 10 apps + `docker compose` full stack       |

---

## Architecture

### System overview

```mermaid
flowchart LR
    B["🌐 Browsers<br/>(User / Judge / Admin)"]

    subgraph FE["Frontends — Next.js 16"]
        WEB["web :3000<br/>main platform"]
        ADM["admin :3001<br/>admin console"]
        JDG["judge :3002<br/>judge console"]
    end

    subgraph GW["API Gateway :8080"]
        GWK["express-http-proxy<br/>JWT guard · rate-limit<br/>helmet · CORS · compression"]
    end

    subgraph SVC["Backend services — Express + tsx"]
        AUTH["auth-service :6001"]
        PROJ["project-service :5002"]
        JUDG["judge-service :5003"]
        SHOW["showcase-service :5004"]
        CHAT["chat-service :5005<br/>socket.io"]
        ADMN["admin-service :5006"]
    end

    subgraph DATA["Data layer"]
        PG[("PostgreSQL 16<br/>Prisma · 21 models")]
        RD[("Redis 7<br/>cache · rate-limit · sessions")]
    end

    subgraph OBS["Observability — LGTM :3009"]
        OTLP["OTLP receiver<br/>:4317 gRPC / :4318 HTTP"]
        LOKI["Loki :3100<br/>logs"]
        TEMPO["Tempo<br/>traces"]
        MIMI["Prometheus/Mimir :9090<br/>metrics"]
        GRAF["Grafana :3009<br/>auto-provisioned dashboard"]
    end

    B --> FE
    FE -->|"REST + WS (socket.io)"| GWK
    GWK --> AUTH & PROJ & JUDG & SHOW & CHAT & ADMN
    AUTH & PROJ & JUDG & SHOW & CHAT & ADMN --> PG
    AUTH & CHAT & GWK --> RD

    SVC -.->|"OpenTelemetry"| OTLP
    OTLP --> LOKI & TEMPO & MIMI
    LOKI & TEMPO & MIMI --> GRAF
```

### Gateway routing

All traffic enters through **one origin** (`http://localhost:8080`). The gateway verifies the JWT, injects `x-user-id` / `x-user-role` headers, and proxies to the right service:

| Gateway path      | Target service           | Auth                                             |
| ----------------- | ------------------------ | ------------------------------------------------ |
| `/api/auth`       | auth-service `:6001`     | route guard (public auth endpoints pass through) |
| `/api/projects`   | project-service `:5002`  | JWT required                                     |
| `/api/hackathons` | project-service `:5002`  | GETs public, register/join needs JWT             |
| `/api/judges`     | judge-service `:5003`    | login public, rest JWT                           |
| `/api/showcase`   | showcase-service `:5004` | GETs public, like/comment JWT                    |
| `/api/chat`       | chat-service `:5005`     | JWT required (REST + WS upgrade)                 |
| `/api/admin`      | admin-service `:5006`    | JWT required (roles checked in-service)          |
| `/gateway-health` | gateway itself           | public health check                              |

### Auth request flow

```mermaid
sequenceDiagram
    participant C as Client (web app)
    participant G as api-gateway :8080
    participant A as auth-service :6001
    participant PJ as project-service :5002
    participant P as PostgreSQL

    C->>G: POST /api/auth/register
    G->>A: proxy → /register
    A->>P: create User (bcrypt hash)
    A->>A: send OTP email (nodemailer/Gmail)
    A-->>C: 201 created

    C->>G: POST /api/auth/login
    G->>A: proxy → /login
    A->>P: verify credentials
    A-->>C: access JWT + refresh token (httpOnly cookies)

    C->>G: GET /api/projects (Bearer access JWT)
    G->>G: verify JWT → inject x-user-id / x-user-role
    G->>PJ: proxy with identity headers
    PJ-->>C: protected data
```

### Real-time chat flow

```mermaid
sequenceDiagram
    participant A as User A (web)
    participant G as api-gateway :8080
    participant CS as chat-service :5005
    participant PG as PostgreSQL
    participant B as User B (web)

    A->>G: WS upgrade /api/chat (socket.io, JWT)
    G->>CS: proxied WebSocket
    B->>G: WS upgrade /api/chat (socket.io, JWT)
    G->>CS: proxied WebSocket

    A->>G: emit "chat:message"
    G->>CS: forward
    CS->>PG: persist Message
    CS-->>G: emit to room (User B's socket)
    G-->>B: forward event
    CS-->>G: emit unread count
    G-->>A: delivery confirmation
```

### Observability pipeline

```mermaid
flowchart LR
    subgraph EM["Emitters"]
        L["Local dev<br/>pnpm run dev"]
        D["Docker containers"]
    end

    L & D -->|"OTLP/HTTP :4318"| O["OpenTelemetry Collector<br/>(grafana/otel-lgtm)"]

    O --> LG["Loki :3100<br/>logs"]
    O --> TP["Tempo<br/>traces"]
    O --> PM["Prometheus :9090<br/>metrics (OTLP)"]

    LG & TP & PM --> GF["Grafana :3009<br/>📊 HackHub dashboard<br/>admin / admin"]

    GF -.-> DSH["33 panels: request rates,<br/>error rates, latencies,<br/>log streams, TraceQL search"]
```

---

## Monorepo layout

```
HackHub/
├── apps/                          # 10 deployable applications
│   ├── web/                       # main platform UI          :3000
│   ├── admin/                     # admin console             :3001
│   ├── judge/                     # judge console             :3002
│   ├── api-gateway/               # edge proxy + JWT guard    :8080
│   ├── auth-service/              # auth, OTP, profiles       :6001
│   ├── project-service/           # projects, teams, hackathons :5002
│   ├── judge-service/             # judging, leaderboard      :5003
│   ├── showcase-service/          # showcase feed, likes      :5004
│   ├── chat-service/              # socket.io chat            :5005
│   └── admin-service/             # admin backend             :5006
│
├── packages/                      # shared libraries
│   ├── config/                    # env schema (Zod) + constants
│   ├── database/                  # Prisma schema, client, migrations
│   ├── telemetry/                 # OpenTelemetry bootstrap (traces/metrics/logs)
│   ├── logger/                    # Winston + morgan HTTP logs
│   ├── error-handler/             # shared Express error middleware
│   ├── redis/                     # ioredis client (TLS-aware)
│   ├── utils/                     # JWT helpers, shared zod logic
│   ├── imagekit/                  # image upload client
│   ├── types/                     # shared TS types
│   ├── ui/                        # shadcn/ui component library
│   ├── eslint-config/             # shared ESLint config
│   └── typescript-config/         # shared tsconfig bases
│
├── observability/
│   ├── hackhub-lgtm-dashboard.json  # Grafana dashboard (33 panels)
│   └── grafana/provisioning/        # dashboard auto-provisioning
│
├── docker-compose.yml             # full stack: infra + apps + LGTM
├── apps/*/Dockerfile              # multi-stage image per app
├── turbo.json                     # task graph
├── pnpm-workspace.yaml
└── vitest.config.ts               # workspace-wide test runner
```

### Frontend pages

| App       | Routes                                                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **web**   | `/dashboard`, `/projects`, `/teams`, `/hackathons`, `/chat`, `/profile`, `/showcase`, `/leaderboard`, `/signin`, `/signup`, `/verify-email`, `/forgot-password` |
| **judge** | `/login`, `/console`, `/submissions`, `/leaderboard`                                                                                                            |
| **admin** | `/login`, `/console` → `overview`, `users`, `teams`, `projects`, `hackathons`, `judges`                                                                         |

---

## Ports

| Port        | What                               | Notes                                                                 |
| ----------- | ---------------------------------- | --------------------------------------------------------------------- |
| 3000        | web frontend                       |                                                                       |
| 3001        | admin frontend                     |                                                                       |
| 3002        | judge frontend                     |                                                                       |
| 4317 / 4318 | OTLP gRPC / HTTP receiver          | where services send telemetry                                         |
| 5002        | project-service                    | not published in Docker                                               |
| 5003        | judge-service                      | not published in Docker                                               |
| 5004        | showcase-service                   | not published in Docker                                               |
| 5005        | chat-service                       | not published in Docker                                               |
| 5006        | admin-service                      | not published in Docker                                               |
| 6001        | auth-service                       | not published in Docker                                               |
| 8080        | **api-gateway** (single API entry) | only backend port published in Docker                                 |
| 3009        | **Grafana UI** (admin/admin)       |                                                                       |
| 3100        | Loki                               |                                                                       |
| 9090        | Prometheus/Mimir                   |                                                                       |
| 3200        | Tempo (internal)                   | query via Grafana proxy only                                          |
| 5432 / 6379 | Postgres / Redis host access       | **commented out in compose** (uncomment if your host tools need them) |

> **Conflict rule:** Docker and local dev share these ports. Only run **one** mode at a time for the same port owner — e.g. the Docker `api-gateway` cannot bind 8080 while your local `pnpm run dev` gateway is running.

---

## Quick start — Docker (full stack)

Runs **everything** (databases, migrations, all 7 backends, all 3 frontends, observability) in containers — no local Node/Postgres/Redis needed. This is the fastest way to get the whole platform running.

### The commands

| #   | Command             | What it does                                                         |
| --- | ------------------- | -------------------------------------------------------------------- |
| 1️⃣  | `pnpm docker:build` | build all images (optional — `docker:start` builds automatically)    |
| 2️⃣  | `pnpm docker:start` | **run the project**: build + start everything + migrate + seed admin |
| 2️⃣  | `pnpm docker:up`    | same, but without seeding the admin (`build + up` only)              |
| 3️⃣  | `pnpm docker:down`  | stop everything (data is kept; add `pnpm docker:clean` to wipe it)   |

```bash
pnpm docker:build    # 1. build images
pnpm docker:start    # 2. start the full stack (incl. admin seed)
pnpm docker:up       # 2. or: start without seeding
pnpm docker:down     # 3. stop when done
```

### Prerequisites

- **Docker** with Compose v2 (`docker compose version`)
- A `.env` next to `docker-compose.yml` — Compose reads it for interpolation (e.g. the admin seed values). Images never bake secrets in.

### 1. Start everything (one command)

```bash
pnpm docker:start      # build + start all containers + seed the admin user
```

That single script does the whole flow:

1. `postgres` + `redis` start (health-gated)
2. one-shot **`migrate`** container runs `prisma migrate deploy`
3. all 7 backends boot (they wait for `service_completed_successfully`)
4. `api-gateway` publishes **:8080**, frontends publish **3000/3001/3002**
5. `lgtm` starts Grafana with the HackHub dashboard auto-provisioned
6. the first admin user is seeded (idempotent; needs `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` — skipped with a notice if unset)

> The one-shot `migrate` container is **removed automatically** once its migrations finish (`docker compose rm -sf migrate`), so it won't linger as an `Exited` row in `docker ps`. The seed step runs with `--no-deps`, so it doesn't re-create `migrate` either. Re-run it any time with `pnpm docker:migrate` if you add new migrations.

Prefer steps instead? Every piece is also available on its own:

```bash
pnpm docker:up          # steps 1–5 only
pnpm docker:seed-admin  # step 6 only
```

### 2. Open it

| URL                       | What                  |
| ------------------------- | --------------------- |
| http://localhost:3000     | web app               |
| http://localhost:3001     | admin console         |
| http://localhost:3002     | judge console         |
| http://localhost:8080/api | API gateway           |
| http://localhost:3009     | Grafana (admin/admin) |

### Useful Docker workflows

```bash
# start EVERYTHING (build + migrate + all services + seed admin)
pnpm docker:start

# infra only (Postgres + Redis + LGTM) — for local dev beside it
pnpm docker:infra

# run migrations manually after adding a new one
pnpm docker:migrate

# create the first admin user inside Docker
pnpm docker:seed-admin

# view status / logs / restart
pnpm docker:ps
pnpm docker:logs            # all services, tail 200
docker compose logs -f auth-service     # one service

# rebuild one app after changes (run each line separately)
docker compose build auth-service
docker compose up -d auth-service

# stop (keep data)  /  stop + wipe data + local images
pnpm docker:down
pnpm docker:clean
```

> **Frontends in Docker are production builds** — changes require a rebuild (`pnpm docker:build` or `docker compose build web`). For hot reload, use [local dev mode](#quick-start--local-dev) instead.
>
> **Shell tip:** commands above are written one per line because Windows PowerShell 5.1 doesn't support `&&` as a separator (PowerShell 7+ does). In `package.json` scripts `&&` is fine — pnpm runs those through `cmd.exe`.

---

## Quick start — local dev

The other way to run HackHub: apps on your host machine with **hot reload**, only the infra (or nothing) in Docker. Prefer this for day-to-day development.

### 1. Prerequisites

- **Node ≥ 20** (`node -v`)
- **pnpm 10** — `corepack enable` (Node ≥ 25: `npm i -g pnpm@10.33.4`)
- **PostgreSQL** and **Redis** — one of:
  - local installs, or
  - Docker infra only: `pnpm docker:infra` (then uncomment the `ports:` blocks for 5432/6379 in `docker-compose.yml`), or
  - cloud instances (Neon + Upstash) as this repo's `.env` currently uses.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — at minimum set:

```
DATABASE_URL=postgresql://user:password@localhost:5432/hackhub
ACCESS_SECRET=generate-a-long-random-string
REFRESH_SECRET=generate-another-long-random-string
REDIS_URL=redis://localhost:6379        # Upstash → rediss://... (TLS)
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

Every service validates this schema on boot (`packages/config/src/env.ts`) and **exits with a clear error** if something required is missing.

### 4. Create the database

```bash
pnpm db:generate     # prisma generate (client)
pnpm db:migrate      # prisma migrate dev  — apply all migrations
pnpm db:seed-admin   # optional: create the first admin user
```

### 5. Start everything

```bash
pnpm run dev
```

This runs `turbo dev` — all 10 apps start concurrently:

- 🌐 web → **http://localhost:3000**
- 🛠 admin → **http://localhost:3001**
- ⚖️ judge → **http://localhost:3002**
- 🚪 gateway → **http://localhost:8080/api** (health: `/gateway-health`)
- 6 backend services on 6001 / 5002–5006 (health: `GET /health`)

Start a single app instead:

```bash
pnpm --filter web dev            # just the main frontend
pnpm --filter auth-service dev   # just one backend
```

### 6. (Optional) Observability while developing locally

Services export telemetry to `http://localhost:4318` by default:

```bash
pnpm docker:obs       # starts only the LGTM container
```

Then open **http://localhost:3009** (admin/admin) — your local dev logs, metrics, and traces appear in the pre-provisioned **HackHub** dashboard.

---

## Scripts reference

Run from the repo root:

| Script                   | What it does                                           |
| ------------------------ | ------------------------------------------------------ |
| `pnpm run dev`           | start all 10 apps with hot reload (turbo)              |
| `pnpm build`             | production build of every package/app                  |
| `pnpm test`              | run the full Vitest suite                              |
| `pnpm test:watch`        | Vitest watch mode                                      |
| `pnpm test:coverage`     | V8 coverage report (`text` + `html`)                   |
| `pnpm lint`              | ESLint across the workspace                            |
| `pnpm format`            | Prettier across the workspace                          |
| `pnpm typecheck`         | `tsc --noEmit` across the workspace                    |
| `pnpm db:generate`       | `prisma generate`                                      |
| `pnpm db:migrate`        | `prisma migrate dev`                                   |
| `pnpm db:studio`         | Prisma Studio (DB browser)                             |
| `pnpm db:seed-admin`     | seed the initial admin user                            |
| `pnpm docker:start`      | **one command**: build + start full stack + seed admin |
| `pnpm docker:up`         | build + start the full Docker stack (no seeding)       |
| `pnpm docker:build`      | build all images (no start)                            |
| `pnpm docker:infra`      | start only postgres + redis + LGTM                     |
| `pnpm docker:obs`        | start only the LGTM observability stack                |
| `pnpm docker:migrate`    | run migrations once in Docker                          |
| `pnpm docker:seed-admin` | seed admin once in Docker (`--profile tools`)          |
| `pnpm docker:ps`         | container status                                       |
| `pnpm docker:logs`       | follow all container logs (tail 200)                   |
| `pnpm docker:restart`    | restart all containers                                 |
| `pnpm docker:down`       | stop the stack (data volumes kept)                     |
| `pnpm docker:clean`      | stop + delete volumes + local images ⚠️                |

---

## Environment variables

Full template: [`.env.example`](./.env.example). All services read the **root** `.env` (loaded by `packages/config/src/env.ts`).

| Variable                                                                 | Required    | Default                          | Purpose                                          |
| ------------------------------------------------------------------------ | ----------- | -------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                                                           | ✅          | —                                | PostgreSQL connection string                     |
| `ACCESS_SECRET`                                                          | ✅          | —                                | JWT access-token signing key                     |
| `REFRESH_SECRET`                                                         | ✅          | —                                | JWT refresh-token signing key                    |
| `REDIS_URL`                                                              | ✅          | —                                | Redis (`redis://` local, `rediss://` Upstash)    |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD`                                      | ✅          | —                                | OTP + verification emails                        |
| `AUTH_SERVICE_PORT`                                                      |             | 6001                             | auth-service listen port                         |
| `API_GATEWAY_PORT`                                                       |             | 8080                             | gateway listen port                              |
| `PROJECT_SERVICE_PORT`                                                   |             | 5002                             |                                                  |
| `JUDGE_SERVICE_PORT`                                                     |             | 5003                             |                                                  |
| `SHOWCASE_SERVICE_PORT`                                                  |             | 5004                             |                                                  |
| `CHAT_SERVICE_PORT`                                                      |             | 5005                             |                                                  |
| `ADMIN_SERVICE_PORT`                                                     |             | 5006                             |                                                  |
| `*_SERVICE_URL`                                                          |             | `http://localhost:<port>`        | gateway → service targets                        |
| `CORS_ORIGIN`                                                            |             | `http://localhost:3000`          | allowed origin                                   |
| `JUDGE_CODES`                                                            |             | empty                            | comma-separated judge registration codes         |
| `API_URL`                                                                |             | `http://localhost:4000`          | public API URL used in emails/links              |
| `NEXT_PUBLIC_API_URL`                                                    |             | `http://localhost:8080/api/auth` | browser-facing API base (web)                    |
| `LOG_LEVEL`                                                              |             | `info`                           | Winston log level                                |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                            |             | `http://localhost:4318`          | telemetry destination                            |
| `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` / `IMAGEKIT_URL_ENDPOINT` | ⬜ optional | —                                | image uploads (endpoints error clearly if unset) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME`                      | ⬜ optional | —                                | admin seed values                                |

**Docker overrides:** compose injects its own values for everything (in-network URLs like `http://auth-service:6001`, `DATABASE_URL` → container Postgres, `REDIS_URL` → container Redis) via the `x-backend-env` anchor — your local `.env` service URLs are _not_ used inside containers.

---

## Database

- **Schema:** `packages/database/prisma/schema.prisma` — 21 models (`User`, `Team`, `Project`, `Task`, `Submission`, `Judge`, `Evaluation`, `JudgeScore`, `Hackathon`, `Room`, `Message`, `ShowcaseProject`, `Comment`, `Badge`, …)
- **Migrations:** `packages/database/prisma/migrations/` applied with:
  - local: `pnpm db:migrate` (dev, interactive)
  - deploy/Docker: `prisma migrate deploy` (idempotent, non-interactive)
- **Client:** generated at install/dev time (`pnpm db:generate`); Docker images run `prisma generate` during build.
- **Browse data:** `pnpm db:studio`

---

## Testing & code quality

```bash
pnpm test           # Vitest — 553 tests (unit + integration, supertest)
pnpm typecheck      # tsc across all workspaces
pnpm lint           # ESLint 9
pnpm format         # Prettier
```

- Tests live next to code: `**/*.test.ts` (coverage excludes `.next`, `dist`, config files).
- **Husky** runs `lint-staged` on every commit: ESLint + Prettier auto-fix for staged files.

---

## Observability (LGTM)

One container (`grafana/otel-lgtm`) provides **Grafana, Loki, Tempo, and Prometheus/Mimir** plus the OTLP receiver.

- **Every backend** boots `@workspace/telemetry` (OpenTelemetry NodeSDK):
  - traces + metrics (5s interval) + logs exported over **OTLP/HTTP → :4318**
  - auto-instrumentations cover HTTP, Express, Prisma, Redis, Socket.io…
- **Logs:** Winston (with daily rotation files) + morgan HTTP logs ship to Loki.
- **Grafana:** http://localhost:3009 — login `admin`/`admin`.
- **Dashboard:** the **HackHub** dashboard (33 panels — request rates, error rates, latency percentiles, service log streams, TraceQL trace search) is **auto-provisioned from the repo** on every container start; nothing to import manually.
- State persists in the `lgtmdata` volume — restarting or recreating the container keeps your dashboards and telemetry history.
- Tempo (`:3200`) is internal-only; query it through Grafana (datasource proxy).

```bash
pnpm docker:obs          # start observability only
pnpm docker:down         # stop everything (lgtmdata volume is kept)
```

---

## How the Docker images are built

Every app has its own **multi-stage Dockerfile** (`apps/*/Dockerfile`), sharing one pattern:

```mermaid
flowchart LR
    S1["<b>base</b><br/>node:22-bookworm-slim<br/>+ pnpm 10.33.4"] -->
    S2["<b>deps</b><br/>manifests only<br/>→ cached on lockfile<br/>pnpm install --frozen-lockfile"] -->
    S3["<b>build</b><br/>full source<br/>→ prisma generate<br/>(placeholder env)"] -->
    S4["<b>runner</b><br/>lean runtime<br/>USER node<br/>CMD start"]
```

Design decisions:

- **Layer caching** — only `package.json` files are copied before `pnpm install`, so dependency layers rebuild only when `pnpm-lock.yaml` changes.
- **`pnpm pkg delete scripts.prepare`** — husky needs `.git`, which isn't in the build context.
- **Prisma generate at build time** with placeholder env values (`prisma.config.ts` validates env at import), real values are injected at **runtime** by compose.
- **Backends run via `tsx`** at runtime — no compiled `dist/`.
- **`openssl` in the runner stage** (backends only) — Prisma probes the OpenSSL CLI to pick its engine; `bookworm-slim` ships only `libssl3`, so without it you'd see `prisma:warn ... failed to detect the libssl/openssl version`. Added in the cheap last stage so the heavy dependency layers stay cached.
- **`.dockerignore`** excludes `node_modules`, build outputs, `.env` files, logs, tests, and git — secrets never enter an image.
- **Non-root `node` user** in the final stage.

---

## Troubleshooting

| Symptom                                        | Fix                                                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `❌ Environment validation failed!` on boot    | A required variable is missing/invalid in root `.env` — the message lists exactly which keys failed.                        |
| `EADDRINUSE` on 8080/3000/3001/3002            | Local dev and Docker both own that port — stop one side (`pnpm docker:down` or `Ctrl+C` the dev server).                    |
| Redis `MaxRetriesPerRequestError` with Upstash | `REDIS_URL` must be `rediss://…` (TLS). Local Redis uses `redis://`. Restart dev servers after changing `.env`.             |
| Prisma errors after pulling changes            | `pnpm db:generate && pnpm db:migrate`                                                                                       |
| Docker backend won't start                     | Check env inside compose (`x-backend-env`): required vars are validated at boot. `pnpm docker:logs` shows which key failed. |
| Migrations not applied in Docker               | They run automatically via the one-shot `migrate` service; run manually with `pnpm docker:migrate`.                         |
| `[docker:start] seed-admin skipped`            | `ADMIN_EMAIL` / `ADMIN_PASSWORD` missing from `.env` — the stack still starts; set them and run `pnpm docker:seed-admin`.   |
| Frontend can't reach API in Docker             | Frontends are baked with `NEXT_PUBLIC_API_URL` / `GATEWAY_URL` build args — rebuild after changing them.                    |
| No telemetry in Grafana                        | Ensure LGTM is up (`pnpm docker:obs`) and `OTEL_EXPORTER_OTLP_ENDPOINT` points to `:4318`.                                  |
| Reset everything                               | `pnpm docker:clean` — removes containers, **volumes (all data)**, and local images.                                         |

---

## Health checks

```bash
curl http://localhost:8080/gateway-health        # api-gateway
curl http://localhost:6001/health                # auth-service (any backend port)
# every backend exposes GET /health → { "status": "healthy", "service": "..." }
```
