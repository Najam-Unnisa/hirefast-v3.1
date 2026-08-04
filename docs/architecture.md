# HireFast Architecture Overview

HireFast is a modular monolith monorepo.

## Apps

- `apps/candidate-portal` — Next.js 15 candidate experience
- `apps/admin-portal` — Next.js 15 admin console
- `apps/backend` — Express.js API (`/api/v1`)

## Packages

- `packages/shared-types` — shared TypeScript contracts
- `packages/shared-utils` — shared helpers (API envelope, pagination, dates)
- `packages/shared-config` — shared env helpers and design tokens

## Infrastructure

- PostgreSQL + Prisma ORM (full platform schema — see `docs/database/`)
- Redis + BullMQ
- Cloudflare R2 (S3-compatible) storage abstraction
- OpenAI via AI provider abstraction

## Database architecture

See:

- `docs/database/ARCHITECTURE.md` — entity analysis, ER model, design decisions
- `docs/database/erd.txt` — compact ERD
- `docs/database/TABLES.md` — table catalog
- `docs/database/INDEXES_AND_CONSTRAINTS.md` — indexing & CHECKs
- `docs/database/REVIEW.md` — validation & future notes

## Notes

This repository currently contains the **engineering foundation** plus the **complete database architecture**.
Application business features (auth flows, assessments runtime, JRS calculation, reports UI) are intentionally not implemented yet.
