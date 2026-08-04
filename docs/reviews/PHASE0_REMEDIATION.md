# Phase 0 Remediation Checklist

Mandatory before domain feature modules (assessments, AI, reports, etc.).

Source: `docs/reviews/ARCHITECTURE_REVIEW_v1.md`

## P0 Gate

- [x] **ADR-010 revised** — entitlement model documented + schema/seed adjusted (`docs/architecture/RBAC_SUBSCRIPTION_SEPARATION.md`)
- [x] Partial unique: one active/trialing subscription per user
- [ ] Auth vertical slice: Google OAuth → JWT → Redis refresh → `/auth/me` → logout
- [ ] `authenticate` / `authorize` mounted on protected routes
- [ ] `packages/shared-ui` extracted; portal duplicates removed
- [ ] BullMQ worker process convention + at least one registered consumer
- [ ] Request ID middleware; `RATE_LIMITED` error code alignment
- [ ] OpenAPI: freeze report-create status code (prefer 200 + GENERATING)
- [ ] CI runs `lint` (and ideally format check)
- [ ] Team rule: no module merge without ownership/authz tests

## Exit criteria

Architecture Review conditional approval becomes **full foundation approval** only when all P0 items are checked.
