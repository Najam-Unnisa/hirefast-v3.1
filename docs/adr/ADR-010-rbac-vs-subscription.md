# ADR-010: RBAC Roles vs Subscription Entitlements

## Status

**Contested — must revise before feature development**

## Context

Platform users include Guest, Freemium, Premium, Admin. Engineering Standards list these as RBAC roles. Product also requires subscription plans and plan features.

Current schema/seeds implement **both**:

- `roles.name` ∈ {ADMIN, GUEST, FREEMIUM, PREMIUM}
- `subscription_plans` / `user_subscriptions` / `plan_features`

FREEMIUM and PREMIUM seeded permissions are identical, so role does not encode capability differences — subscription/features should.

## Decision (recommended revision)

1. Treat **role** as security principal class: e.g. `ADMIN`, `GUEST`, `CANDIDATE` (or keep Freemium/Premium only as **derived claims**, not source of truth).
2. Treat **subscription + plan_features** as entitlement source for premium gates.
3. Expose a single server-side `assertFeature(userId, featureKey)` used by all premium routes.
4. Add partial unique index: at most one active/trialing subscription per user.

## Consequences if unrevised

Entitlement bugs on cancel/refund; duplicated checks; audit ambiguity; false confidence from permission tables that JWT auth never reads.
