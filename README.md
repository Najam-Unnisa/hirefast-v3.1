# HireFast

AI-powered employability assessment platform.

This repository currently contains the **project foundation** (Architecture-First).

- **Authentication Foundation** is implemented (JWT, auth/RBAC middleware, Google OAuth provider, Redis, refresh-token store).
- **Authentication Feature Implementation** (login/refresh/logout/session APIs and FE session UX) and other business features (assessments, Job Readiness Score, reports, dashboards) are intentionally deferred to the Feature Implementation phase.

See `docs/architecture/AUTHENTICATION_FOUNDATION.md`.

## Monorepo Structure

```text
apps/
  candidate-portal/   # Next.js 15 — Candidate experience
  admin-portal/       # Next.js 15 — Admin console
  backend/            # Express.js + TypeScript API
packages/
  shared-types/       # Shared TypeScript types
  shared-utils/       # Shared utilities
  shared-config/      # Shared config + design tokens
prisma/               # Prisma schema & migrations
docker/               # Dockerfiles + docker-compose
docs/                 # Architecture notes
```

## Tech Stack

| Layer           | Technology                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Frontend        | Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, RHF + Zod, Framer Motion |
| Backend         | Node.js, Express.js, TypeScript                                                                                 |
| Database        | PostgreSQL + Prisma ORM                                                                                         |
| Auth foundation | Google OAuth provider, JWT utilities, RBAC middleware, Redis refresh-token store                                |
| Jobs            | Redis + BullMQ                                                                                                  |
| AI              | Provider abstraction (OpenAI implementation)                                                                    |
| Storage         | Cloudflare R2 (S3-compatible) abstraction                                                                       |
| Docs            | Swagger/OpenAPI at `/docs`                                                                                      |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (recommended for PostgreSQL + Redis)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
```

### 3. Start infrastructure

```bash
pnpm docker:up
```

This starts PostgreSQL, Redis, and optionally the app containers via `docker/docker-compose.yml`.

For local app development, you can start only infrastructure:

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
```

### 4. Build shared packages & generate Prisma client

```bash
pnpm --filter @hirefast/shared-types build
pnpm --filter @hirefast/shared-utils build
pnpm --filter @hirefast/shared-config build
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
```

Database architecture docs live in `docs/database/`.
API contract docs live in `docs/api/` (`openapi.yaml` = design-time target contract;
runtime Swagger at `/docs` = implemented routes only — see `docs/api/CONTRACT_VS_RUNTIME.md`).

### 5. Run apps

```bash
# All apps
pnpm dev

# Or individually
pnpm dev:backend      # http://localhost:4000
pnpm dev:candidate    # http://localhost:3000
pnpm dev:admin        # http://localhost:3001
```

### Useful endpoints

- Health: `GET http://localhost:4000/health`
- API health: `GET http://localhost:4000/api/v1/health`
- Swagger: `http://localhost:4000/docs`

## Scripts

| Script                | Description                   |
| --------------------- | ----------------------------- |
| `pnpm dev`            | Start backend + both portals  |
| `pnpm build`          | Build all packages and apps   |
| `pnpm test`           | Run all tests                 |
| `pnpm lint`           | Lint all workspaces           |
| `pnpm format`         | Prettier format               |
| `pnpm db:generate`    | Generate Prisma client        |
| `pnpm db:migrate:dev` | Create/apply migrations (dev) |
| `pnpm docker:up`      | Start Docker compose stack    |

## Commit Conventions

Use focused, meaningful commits. Prefer Conventional Commit style:

- `feat:` new capability
- `fix:` bug fix
- `chore:` tooling / scaffolding
- `docs:` documentation
- `test:` tests
- `refactor:` internal restructuring without behavior change

## Engineering Standards

Follow:

1. HireFast Master Context
2. HireFast Engineering Standards v1.0
3. Architecture Review (`docs/reviews/ARCHITECTURE_REVIEW_v1.md`) — **conditional approval; complete Phase 0 before domain features**

Frozen stack and modular monolith architecture must not be changed unless explicitly instructed.

## License

Proprietary — HireFast.
