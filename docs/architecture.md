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

## REST API architecture

See:

- `docs/api/ARCHITECTURE.md` — modules & resource map
- `docs/api/ENDPOINT_CATALOG.md` — full endpoint catalog
- `docs/api/STANDARDS.md` — envelopes, pagination, security, rate limits
- `docs/api/AUTH_MATRIX.md` — authz matrix
- `docs/api/openapi.yaml` — normative OpenAPI 3 contract (served at `/docs`)
- `docs/api/REVIEW.md` — API architecture review

## Architecture review (gate)

See:

- `docs/reviews/ARCHITECTURE_REVIEW_v1.md` — full critical review & scores
- `docs/reviews/PHASE0_REMEDIATION.md` — mandatory P0 checklist
- `docs/adr/` — Architecture Decision Records

**Status:** Conditional approval — complete Phase 0 before domain features.

## Notes

This repository currently contains the **engineering foundation**, **complete database architecture**, and **REST API contract**.
Application business features (auth flows, assessments runtime, JRS calculation, reports UI) are intentionally not implemented yet.
