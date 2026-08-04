# Authentication & Authorization Matrix

## Separation of concerns

| Concern               | Codes                        | Source of truth                                        |
| --------------------- | ---------------------------- | ------------------------------------------------------ |
| **Identity (RBAC)**   | `ADMIN`, `USER`, `GUEST`     | `roles` + JWT `role`                                   |
| **Commercial access** | `FREE`, `PREMIUM` (+ future) | `user_subscriptions` + `subscription_plans` + features |

Premium feature access is **never** determined by RBAC role.

## Identity roles

| Role  | Code    | Description                                                               |
| ----- | ------- | ------------------------------------------------------------------------- |
| Admin | `ADMIN` | Full platform management                                                  |
| User  | `USER`  | Registered candidate identity; plan comes from subscription               |
| Guest | `GUEST` | Google-authenticated; profile incomplete; results locked until completion |

## Subscription plans

| Plan    | Code      | Description                       |
| ------- | --------- | --------------------------------- |
| Free    | `FREE`    | Default commercial tier for users |
| Premium | `PREMIUM` | Paid commercial tier              |

Legend for matrices:

| Symbol | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| ✅     | Allowed                                                  |
| 🔒     | Allowed but results may be locked / redacted             |
| ❌     | Denied (`401` if anon, `403` if wrong role/subscription) |
| —      | N/A                                                      |

Columns below use **identity role**. Where Premium is required, the row also needs an active `PREMIUM` subscription (see notes).

---

## Authentication matrix (by endpoint group)

| Endpoint group                     | Public | Guest | User (FREE) | User (PREMIUM sub) | Admin |
| ---------------------------------- | ------ | ----- | ----------- | ------------------ | ----- |
| `POST /auth/google`                | ✅     | —     | —           | —                  | —     |
| `GET /auth/google/callback`        | ✅     | —     | —           | —                  | —     |
| `POST /auth/refresh`               | ✅*    | ✅*   | ✅*         | ✅*                | ✅*   |
| `POST /auth/logout`                | ❌     | ✅    | ✅          | ✅                 | ✅    |
| `GET /auth/me`                     | ❌     | ✅    | ✅          | ✅                 | ✅    |
| `GET /auth/session`                | ❌     | ✅    | ✅          | ✅                 | ✅    |
| `GET /health`                      | ✅     | ✅    | ✅          | ✅                 | ✅    |
| `GET /settings/public`             | ✅     | ✅    | ✅          | ✅                 | ✅    |
| Profile / me                       | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Assessment catalog (FREE)          | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Assessment catalog (PREMIUM items) | ❌     | ❌    | ❌          | ✅                 | ✅†   |
| Start guest assessment             | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Start premium assessment           | ❌     | ❌    | ❌          | ✅                 | ✅†   |
| Submit attempt                     | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Evaluation / JRS / reports (own)   | ❌     | 🔒    | ✅          | ✅                 | ✅    |
| Dashboard                          | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Gamification (own)                 | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Notifications (own)                | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Subscription status (own)          | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Premium recommendations            | ❌     | ❌    | ❌          | ✅                 | ✅†   |
| File upload (own)                  | ❌     | ✅    | ✅          | ✅                 | ✅    |
| Admin.*                            | ❌     | ❌    | ❌          | ❌                 | ✅    |
| HR review                          | ❌     | ❌    | ❌          | ❌                 | ✅    |
| Audit logs                         | ❌     | ❌    | ❌          | ❌                 | ✅    |

\* Refresh accepts refresh token in body/cookie — not access-token auth.  
† Admin uses `/admin/**` management APIs; candidate premium surfaces require subscription middleware (`requirePlan(PREMIUM)`), not an Admin role check for commercial entitlement.

---

## Authorization rules

1. Users may only read/write **their own** attempts, reports, notifications, files, gamification, subscriptions.
2. `ADMIN` may access any resource under `/admin/**` and privileged GET by id where documented. Admin routes do **not** require a subscription.
3. Premium feature checks use **active `user_subscriptions` + plan/features only** — never `role === PREMIUM`. Contract exposes `GET /subscriptions/me`; **server is source of truth**.
4. Guest profile completion upgrades identity role to `USER` and typically attaches a `FREE` subscription (business rule when Auth ships); until profile completion, evaluation APIs return `RESULTS_LOCKED`.

### Endpoint authorization pattern

```
Authentication required
  → Required Role (RBAC)
  → Required Subscription (if applicable)
```

Examples:

| Surface            | Role          | Subscription            |
| ------------------ | ------------- | ----------------------- |
| Admin APIs         | ADMIN         | None                    |
| Premium assessment | USER          | PREMIUM                 |
| Guest assessment   | GUEST         | None                    |
| Free catalog / me  | USER or GUEST | None (or FREE features) |

---

## Token contract

### Access token (JWT claims) — identity only

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER",
  "iat": 0,
  "exp": 0
}
```

Do not encode subscription tier as `role`.

### Refresh

- Request: `{ "refreshToken": "..." }`
- Response data: `{ "accessToken", "refreshToken", "expiresIn", "tokenType": "Bearer" }`
- Rotation: required on each refresh.

### Logout

- Invalidates refresh token server-side (Redis).
- Access token remains until expiry (stateless); optional denylist is future.

See also: `docs/architecture/AUTHORIZATION_FLOW.md`
