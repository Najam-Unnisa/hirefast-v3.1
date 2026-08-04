# Authentication — Foundation vs Feature Implementation

HireFast follows an **Architecture-First** methodology.

The absence of login/session HTTP APIs is **expected and intentional**. It is **not** an architectural defect.

---

## Separation

| Layer                                     | Status         | What it includes                                                                                                                 |
| ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Foundation**             | ✅ Implemented | JWT utils, authz middleware, Google OAuth config + provider interface, Redis client, refresh-token store abstraction, env config |
| **Authentication Feature Implementation** | ⏳ Planned     | Google login/callback routes, token issuance orchestration, refresh/logout/session HTTP APIs, FE session UX                      |

Feature Implementation consumes the foundation. It must **not** re-invent JWT signing, Redis session keys, or OAuth HTTP details.

---

## Authentication Foundation (production-ready infrastructure)

| Capability                                              | Location                                          |
| ------------------------------------------------------- | ------------------------------------------------- |
| JWT sign / verify / Bearer extract                      | `apps/backend/src/utils/jwt.ts`                   |
| `authenticate` / `optionalAuthenticate` / `requireAuth` | `apps/backend/src/middlewares/auth.middleware.ts` |
| RBAC `authorize(...)`                                   | same + `constants/roles.ts`                       |
| Subscription gates                                      | `middlewares/subscription.middleware.ts`          |
| Google OAuth env + URL helpers                          | `config/google-oauth.ts`, `config/env.ts`         |
| OAuth provider interface + Google provider              | `providers/auth/`                                 |
| Redis client + health                                   | `config/redis.ts`, Docker Redis, `/health`        |
| Refresh-token store (hashed, TTL, rotate/revoke)        | `infrastructure/auth/refresh-token.store.ts`      |
| Shared JWT / role types                                 | `packages/shared-types`                           |

### JWT identity claims (foundation)

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER"
}
```

Commercial plan is **not** part of JWT `role`. See `AUTHORIZATION_FLOW.md`.

---

## Authentication Feature Implementation (deferred)

Planned during the **Feature Implementation** phase (not Architecture / Foundation):

- `POST /auth/google`, callback exchange, user provisioning
- Issue access + refresh tokens via JWT utils + `RefreshTokenStore`
- `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` / session
- Mount `authenticate` / `authorize` on protected feature routes
- Candidate/admin portal session persistence and route guards

Design-time API shapes remain in `docs/api/openapi.yaml` (contract only). Runtime routes ship with Feature Implementation.

---

## Methodology rule

| Do                                                    | Do not                                                   |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Treat missing auth **APIs** as deferred feature work  | Treat missing auth APIs as a foundation failure          |
| Wire foundation middleware when feature modules land  | Invent parallel JWT/Redis/OAuth helpers per module       |
| Keep OpenAPI as the auth contract until features ship | Implement auth business routes during architecture phase |

---

## Related

- ADR-005 — Google OAuth only
- `docs/architecture/AUTHORIZATION_FLOW.md`
- `docs/api/AUTH_MATRIX.md` (design-time matrix)
- `docs/api/CONTRACT_VS_RUNTIME.md`
