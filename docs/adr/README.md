# ADR Index

Canonical decisions for HireFast. Full critique: `docs/reviews/ARCHITECTURE_REVIEW_v1.md`.

| ID                                              | Title                                  | Status                     |
| ----------------------------------------------- | -------------------------------------- | -------------------------- |
| [ADR-001](./ADR-001-modular-monolith.md)        | Modular monolith                       | Accepted                   |
| [ADR-002](./ADR-002-monorepo.md)                | pnpm monorepo                          | Accepted                   |
| [ADR-003](./ADR-003-postgres-prisma.md)         | PostgreSQL + Prisma                    | Accepted                   |
| [ADR-004](./ADR-004-rest-api-v1.md)             | REST `/api/v1` envelope                | Accepted                   |
| [ADR-005](./ADR-005-google-oauth.md)            | Google OAuth only                      | Accepted                   |
| [ADR-006](./ADR-006-jrs-vs-ai.md)               | Deterministic JRS vs AI                | Accepted                   |
| [ADR-007](./ADR-007-bullmq.md)                  | BullMQ async jobs                      | Accepted                   |
| [ADR-008](./ADR-008-ai-provider.md)             | AI provider abstraction                | Accepted                   |
| [ADR-009](./ADR-009-object-storage.md)          | R2/S3 file metadata                    | Accepted                   |
| [ADR-010](./ADR-010-rbac-vs-subscription.md)    | Roles vs subscriptions                 | **Contested — revise**     |
| [ADR-011](./ADR-011-openapi-source-of-truth.md) | OpenAPI design-time vs runtime Swagger | Accepted (revised)         |
| [ADR-012](./ADR-012-soft-deletes.md)            | Selective soft deletes                 | Accepted                   |
| [ADR-013](./ADR-013-dual-portals.md)            | Candidate + Admin portals              | Accepted (needs shared-ui) |
