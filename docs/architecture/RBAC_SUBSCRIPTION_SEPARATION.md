# Architecture Review — RBAC vs Subscription Separation

**Status:** Resolved (Blocker #2)  
**Scope:** Architectural refactor only — no domain feature modules  
**Related:** ADR-010 (Accepted), `docs/architecture/AUTHORIZATION_FLOW.md`

## Verdict

Identity, authorization, and commercial access are now **independent** concerns with a single source of truth each.

| Concern           | Model                                               | Status |
| ----------------- | --------------------------------------------------- | ------ |
| Identity          | Roles `ADMIN` \| `USER` \| `GUEST`                  | ✅     |
| Authorization     | RBAC permissions + `authorize(...)`                 | ✅     |
| Commercial access | Plans `FREE` \| `PREMIUM` + subscription middleware | ✅     |

## Checklist

- [x] RBAC no longer contains `FREEMIUM` or `PREMIUM` roles (seed + data migration)
- [x] Subscription plans are the only commercial model (`FREE`, `PREMIUM`)
- [x] JWT payload documents identity-only `role` (no commercial tier)
- [x] Premium middleware validates subscription (`requirePlan` / `requireFeature`)
- [x] Documentation updated (API matrix, ADR-010, DB architecture, OpenAPI enum)
- [x] No duplicate commercial concepts in role seeds
- [x] Admin authorization remains role-based (`ADMIN`) without subscription
- [x] Guest authorization remains role-based (`GUEST`) without commercial roles
- [x] Future plans (PRO / STUDENT / ENTERPRISE) require plan + features only — no RBAC role additions
- [x] Partial unique index: at most one `ACTIVE`/`TRIALING` subscription per user

## Deliverables

1. Updated role model — `packages/shared-types`, `constants/roles.ts`, seeds
2. Updated subscription model — `FREE` / `PREMIUM`, `constants/subscription.ts`
3. Updated permission model — distinct ADMIN / USER / GUEST maps
4. Updated JWT structure — identity claims only
5. Subscription middleware — `subscription.middleware.ts` + access service
6. Database seeds + migration `20260804090000_rbac_subscription_separation`
7. Documentation + authorization flow diagram
8. Migration plan — SQL migration + idempotent seed cleanup
9. This architecture review confirmation

## Migration plan

1. Deploy migration `20260804090000_rbac_subscription_separation`
2. Run foundational seed (re-upserts roles/plans; cleans legacy roles if any remain)
3. Invalidate existing JWTs that may still carry `FREEMIUM`/`PREMIUM` as `role` (force re-login when Auth ships)
4. Wire feature routes as: `authenticate` → `authorize` → `requirePlan`/`requireFeature`

## Out of scope

Auth module implementation, assessment features, billing provider integration — Phase 0/2 items remain separate.
