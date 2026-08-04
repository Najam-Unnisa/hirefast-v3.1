# Phase 0 Remediation Checklist

Mandatory **architecture** remediation before unconstrained domain feature delivery.

Source: `docs/reviews/ARCHITECTURE_REVIEW_v1.md`  
Methodology: **Architecture-First** — see `docs/architecture/AUTHENTICATION_FOUNDATION.md`, `docs/architecture/BULLMQ_FOUNDATION.md`

## Clarifications (not architecture defects)

| Item                                                                         | Classification                            | Status      |
| ---------------------------------------------------------------------------- | ----------------------------------------- | ----------- |
| JWT, auth/RBAC middleware, Google OAuth provider, Redis, refresh-token store | **Authentication Foundation**             | ✅          |
| Auth login/refresh/logout/session HTTP APIs + FE session                     | **Authentication Feature Implementation** | ⏳ Deferred |
| Redis, BullMQ, queue manager, worker factory                                 | **Jobs Foundation**                       | ✅          |
| AI / report / email / notification processors                                | **Feature Workers**                       | ⏳ Deferred |

Do **not** treat deferred feature workers or auth APIs as failed foundation gates.

## P0 Gate (architecture)

- [x] **ADR-010 revised** — entitlement model documented + schema/seed adjusted (`docs/architecture/RBAC_SUBSCRIPTION_SEPARATION.md`)
- [x] Partial unique: one active/trialing subscription per user
- [x] **Authentication Foundation** documented and production-ready
- [x] `packages/shared-ui` extracted; portal duplicates removed
- [x] **BullMQ Foundation** clarified — queues at boot; workers feature-owned (`docs/architecture/BULLMQ_FOUNDATION.md`)
- [ ] Request ID middleware; `RATE_LIMITED` error code alignment
- [ ] OpenAPI: freeze report-create status code (prefer 200 + GENERATING)
- [ ] CI runs `lint` (and ideally format check)
- [ ] Team rule: no module merge without ownership/authz tests

## Feature Implementation (not Phase 0 architecture)

- [ ] Auth feature vertical slice: Google OAuth routes → JWT issue → Redis refresh → `/auth/me` → logout
- [ ] `authenticate` / `authorize` mounted on protected feature routes as those modules ship
- [ ] Feature-owned workers (AI evaluation, reports, email, notifications) via `createWorker`

## Exit criteria

Architecture Review **foundation** approval recognizes Authentication + BullMQ + Shared UI foundations as complete.

Feature workers and auth HTTP APIs are **Feature Implementation** deliverables.
