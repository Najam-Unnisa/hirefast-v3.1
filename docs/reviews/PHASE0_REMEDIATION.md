# Phase 0 Remediation Checklist

Mandatory **architecture** remediation before unconstrained domain feature delivery.

Source: `docs/reviews/ARCHITECTURE_REVIEW_v1.md`  
Methodology: **Architecture-First** — see `docs/architecture/AUTHENTICATION_FOUNDATION.md`

## Authentication clarification

| Item                                                                                                | Classification                            | Status                                         |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| JWT utilities, auth/RBAC middleware, Google OAuth config, Redis, auth provider, refresh-token store | **Authentication Foundation**             | ✅ Complete                                    |
| Google login/callback, refresh/logout/session HTTP APIs, FE session flows                           | **Authentication Feature Implementation** | ⏳ Planned (not a Phase 0 architecture defect) |

Do **not** treat deferred auth feature APIs as a failed foundation gate.

## P0 Gate (architecture)

- [x] **ADR-010 revised** — entitlement model documented + schema/seed adjusted (`docs/architecture/RBAC_SUBSCRIPTION_SEPARATION.md`)
- [x] Partial unique: one active/trialing subscription per user
- [x] **Authentication Foundation** documented and production-ready (JWT, middleware, Google config/provider, Redis, refresh-token store)
- [x] `packages/shared-ui` extracted; portal duplicates removed
- [ ] BullMQ worker process convention + at least one registered consumer
- [ ] Request ID middleware; `RATE_LIMITED` error code alignment
- [ ] OpenAPI: freeze report-create status code (prefer 200 + GENERATING)
- [ ] CI runs `lint` (and ideally format check)
- [ ] Team rule: no module merge without ownership/authz tests

## Feature Implementation (not Phase 0 architecture)

Tracked separately — implemented when domain modules that need sessions begin:

- [ ] Auth feature vertical slice: Google OAuth routes → JWT issue → Redis refresh via `RefreshTokenStore` → `/auth/me` → logout
- [ ] `authenticate` / `authorize` mounted on protected **feature** routes as those modules ship

## Exit criteria

Architecture Review **foundation** approval recognizes Authentication Foundation as complete.

Authentication Feature Implementation is a **Feature Implementation phase** deliverable, not an architecture defect to remediate in Phase 0.
