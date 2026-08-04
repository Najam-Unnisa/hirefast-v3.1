# API Contract vs Runtime Swagger

HireFast separates **design-time** API architecture from **runtime** API documentation.

## Design-time contract (authoritative target)

| Artifact                       | Role                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `docs/api/openapi.yaml`        | Complete OpenAPI 3.0.3 specification — **authoritative architecture contract** |
| `docs/api/ENDPOINT_CATALOG.md` | Human-readable endpoint catalog                                                |
| `docs/api/STANDARDS.md`        | Envelopes, auth, pagination, security                                          |
| `docs/api/AUTH_MATRIX.md`      | Role × endpoint matrix                                                         |

This contract describes the **target** HireFast API surface. Frontend and backend teams use it for planning. Endpoints listed there are **not** all implemented yet.

Implementation proceeds **incrementally** along the HireFast development roadmap. New Express modules should:

1. Implement routes matching the contract (or update the contract first if the design changes).
2. Add JSDoc `@openapi` blocks on the route files under `apps/backend/src/modules/**/*.routes.ts`.
3. Rely on runtime Swagger to pick them up automatically (see below).

## Runtime Swagger (implemented only)

| Endpoint         | Role                                               |
| ---------------- | -------------------------------------------------- |
| `GET /docs`      | Swagger UI for **implemented** Express routes only |
| `GET /docs.json` | OpenAPI JSON generated from those routes           |

Runtime Swagger is built with `swagger-jsdoc` from JSDoc on **existing** route modules (`apps/backend/src/config/swagger.ts`). It deliberately does **not** load `docs/api/openapi.yaml`.

### Why

Serving the full contract from `/docs` caused **contract drift**: clients could discover and attempt dozens of endpoints that Express does not mount (today only health is live). Runtime docs must reflect reality.

## Current implemented surface

- `GET /health`
- `GET /api/v1/health`

## Related ADRs

- `docs/adr/ADR-011-openapi-source-of-truth.md` — contract remains design-time SoT; runtime docs are implementation SoT for `/docs`
