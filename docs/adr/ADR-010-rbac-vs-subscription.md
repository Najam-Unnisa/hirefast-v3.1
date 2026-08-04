# ADR-010: RBAC Roles vs Subscription Entitlements

## Status

**Accepted**

## Context

Platform users include Guest, registered candidates, Premium subscribers, and Admin. Product also requires subscription plans and plan features.

An earlier draft modeled commercial tiers as RBAC roles (`FREEMIUM`, `PREMIUM`) **and** as subscription plans, with identical role permissions. That duplicated sources of truth and invited `role === PREMIUM || subscription.active` checks.

## Decision

1. **Identity roles** (RBAC / JWT `role`): `ADMIN` | `USER` | `GUEST` only.
2. **Commercial access**: `subscription_plans` (`FREE`, `PREMIUM`, …) + `user_subscriptions` + `plan_features`.
3. **Authorization flow**: Authentication → RBAC (`authorize`) → Subscription validation (`requirePlan` / `requireFeature`) → feature handler.
4. JWT carries identity only. Plan tier is never encoded as `role`.
5. At most one `ACTIVE`/`TRIALING` subscription per user (partial unique index).
6. New commercial tiers (PRO, STUDENT, ENTERPRISE) add plans/features only — **no** new RBAC roles.

## Consequences

- Premium gates use subscription middleware / access service exclusively.
- Admin and Guest continue to work via identity roles without commercial role pollution.
- Seeds and migration remove legacy `FREEMIUM`/`PREMIUM` roles and rename plan `FREEMIUM` → `FREE`.

## References

- `docs/architecture/AUTHORIZATION_FLOW.md`
- `docs/architecture/RBAC_SUBSCRIPTION_SEPARATION.md`
- `apps/backend/src/middlewares/subscription.middleware.ts`
- Migration: `prisma/migrations/20260804090000_rbac_subscription_separation`
