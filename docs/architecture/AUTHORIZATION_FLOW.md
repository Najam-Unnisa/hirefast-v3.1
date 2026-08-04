# Authorization Flow — Identity, RBAC, Subscription

HireFast separates three concerns. They must never be collapsed into a single role claim.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐     ┌──────────────┐
│ Identity    │────►│ RBAC             │────►│ Subscription Validation │────►│ Feature      │
│ (who)       │     │ (what ops)       │     │ (what plan / features)  │     │ Access       │
└─────────────┘     └──────────────────┘     └─────────────────────────┘     └──────────────┘
   JWT role            authorize(...)           requirePlan / requireFeature
   ADMIN|USER|GUEST    permissions via roles    user_subscriptions + plan_features
```

## Responsibility matrix

| Concern               | Source of truth                                               | Examples                              |
| --------------------- | ------------------------------------------------------------- | ------------------------------------- |
| **Identity**          | `roles` + JWT `role` claim                                    | `ADMIN`, `USER`, `GUEST`              |
| **Authorization**     | RBAC (`permissions` / role mapping)                           | `assessments.read`, `users.manage`    |
| **Commercial access** | `subscription_plans` + `user_subscriptions` + `plan_features` | `FREE`, `PREMIUM` (+ future `PRO`, …) |

## JWT (identity only)

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER"
}
```

Do **not** put `FREE` / `PREMIUM` (or any plan code) in `role`.
If clients need plan context, load it from `GET /subscriptions/me` or attach a **separate** claim only after the subscription service resolves it.

## Middleware composition (feature routes)

```typescript
router.get(
  '/premium/assessments',
  authenticate,
  authorize(ROLES.USER), // identity
  requirePlan(PLAN_CODES.PREMIUM), // commercial — NOT role === 'PREMIUM'
  handler,
);

router.get(
  '/admin/users',
  authenticate,
  authorize(ROLES.ADMIN), // no subscription required
  handler,
);

router.post(
  '/assessments/:id/start', // guest general communication
  authenticate,
  authorize(ROLES.GUEST, ROLES.USER),
  // no requirePlan for free / guest assessment
  handler,
);
```

## Adding a future plan (e.g. `ENTERPRISE`)

1. Insert `subscription_plans` row + `plan_features`.
2. Gate routes with `requirePlan('ENTERPRISE')` or `requireFeature('...')`.
3. **No** new RBAC role. **No** JWT role change.

## Anti-patterns (forbidden)

- `if (role === 'PREMIUM')` / `if (role === 'FREEMIUM')`
- Encoding plan tier as the JWT `role`
- Duplicating free vs premium capability only in `role_permissions`
