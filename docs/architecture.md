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
- `packages/shared-ui` — shared UI primitives, providers, stores, theme (`docs/architecture/SHARED_UI.md`)

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
- `docs/api/openapi.yaml` — authoritative **design-time** OpenAPI contract (full roadmap)
- `docs/api/CONTRACT_VS_RUNTIME.md` — design-time contract vs runtime `/docs`
- Runtime Swagger (`/docs`) documents **implemented Express routes only**
- `docs/api/REVIEW.md` — API architecture review

## Authorization & authentication model

Identity, RBAC, and commercial access are separated:

- `docs/architecture/AUTHORIZATION_FLOW.md` — Auth → RBAC → Subscription → Feature
- `docs/architecture/RBAC_SUBSCRIPTION_SEPARATION.md` — Blocker #2 resolution review
- `docs/architecture/AUTHENTICATION_FOUNDATION.md` — Foundation (✅) vs Feature Implementation (⏳)

Roles (`ADMIN` | `USER` | `GUEST`) are identity only. Plans (`FREE` | `PREMIUM`) are commercial only.

Authentication **Foundation** (JWT, middleware, Google OAuth provider, Redis refresh store) is implemented. Authentication **Feature Implementation** (login/session HTTP APIs) is intentionally deferred.

## Architecture review (gate)

See:

- `docs/reviews/ARCHITECTURE_REVIEW_v1.md` — full critical review & scores
- `docs/reviews/PHASE0_REMEDIATION.md` — mandatory P0 checklist
- `docs/adr/` — Architecture Decision Records

**Status:** Conditional approval for remaining Phase 0 **architecture** items. Authentication Foundation is complete; auth HTTP APIs are Feature Implementation (not a foundation defect).

## Notes

This repository currently contains the **engineering foundation**, **complete database architecture**, and **REST API contract**.

Under **Architecture-First** methodology:

- Authentication **Foundation** is implemented and production-ready for feature teams to consume.
- Authentication **Feature Implementation** (Google login routes, refresh/logout/session APIs, FE session UX) and other business features (assessments, JRS, reports UI) are intentionally not implemented yet.
