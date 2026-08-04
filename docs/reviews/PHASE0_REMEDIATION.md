# Phase 0 Remediation Checklist

Mandatory **architecture** remediation before unconstrained domain feature delivery.

Source: `docs/reviews/ARCHITECTURE_REVIEW_v1.md`  
Methodology: **Architecture-First**

## Clarifications (not architecture defects)

| Item                                                                         | Classification                        | Status      |
| ---------------------------------------------------------------------------- | ------------------------------------- | ----------- |
| JWT, auth/RBAC middleware, Google OAuth provider, Redis, refresh-token store | Authentication Foundation             | ✅          |
| Auth login/refresh/logout/session HTTP APIs + FE session                     | Authentication Feature Implementation | ⏳ Deferred |
| Redis, BullMQ, queue manager, worker factory                                 | Jobs Foundation                       | ✅          |
| AI / report / email / notification processors                                | Feature Workers                       | ⏳ Deferred |
| Logging, health checks, CI + format/lint gates, unit/integration tests       | Engineering Quality Foundation        | ✅          |
| E2E, APM/monitoring, backup automation                                       | Production readiness / later          | ⏳ Deferred |

## P0 Gate (architecture)

- [x] **ADR-010 revised** — entitlement model documented + schema/seed adjusted
- [x] Partial unique: one active/trialing subscription per user
- [x] **Authentication Foundation** documented and production-ready
- [x] `packages/shared-ui` extracted; portal duplicates removed
- [x] **BullMQ Foundation** clarified — queues at boot; workers feature-owned
- [x] **CI quality gates** — Prettier + ESLint fail the pipeline (`docs/engineering/QUALITY_AND_CI.md`)
- [ ] Request ID middleware; `RATE_LIMITED` error code alignment
- [ ] OpenAPI: freeze report-create status code (prefer 200 + GENERATING)
- [x] Team rule documented: no module merge without ownership/authz tests (enforced as features land)

## Feature Implementation (not Phase 0 architecture)

- [ ] Auth feature vertical slice
- [ ] `authenticate` / `authorize` on protected feature routes
- [ ] Feature-owned workers via `createWorker`
- [ ] E2E suite after core workflows exist

## Production readiness (not Phase 0)

- [ ] Monitoring / APM
- [ ] Backup & DR automation (see `docs/engineering/BACKUP_AND_DR.md`)

## Exit criteria

**Final sign-off:** `docs/reviews/FINAL_ARCHITECTURE_APPROVAL.md` — **APPROVED WITH MINOR RECOMMENDATIONS**.

Foundation approval recognizes completed Architecture-First gates above. Remaining unchecked Phase-0 items are **minor recommendations** (not architecture blockers). Deferred ops and feature work remain scheduled later — see `docs/engineering/OPERATIONS_ROADMAP.md`.
