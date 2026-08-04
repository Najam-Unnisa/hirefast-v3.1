# ADR-005: Google OAuth Only

## Status

Accepted

## Decision

No password authentication. Identity via Google OAuth; JWT access + refresh (refresh tokens persisted hashed in Redis, not Postgres).

## Architecture-First split

| Layer                                     | Status                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Authentication Foundation**             | Implemented — Google OAuth config + provider interface, JWT utilities, auth/RBAC middleware, Redis client, `RefreshTokenStore` |
| **Authentication Feature Implementation** | Deferred — login/callback routes, refresh/logout/session HTTP APIs, frontend session UX                                        |

Missing auth **APIs** are intentional under Architecture-First methodology. They are **not** a foundation defect.

See `docs/architecture/AUTHENTICATION_FOUNDATION.md`.

## Consequences

(+) Aligns with Guest frictionless entry  
(+) Feature modules reuse a single OAuth/JWT/Redis foundation  
(−) Auth HTTP APIs ship in Feature Implementation before protected domain routes go live
