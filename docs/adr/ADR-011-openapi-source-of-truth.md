# ADR-011: OpenAPI Contract vs Runtime Swagger

## Status

Accepted (revised)

## Context

HireFast maintains a complete OpenAPI specification for the target platform API. Serving that full file from `/docs` exposed unimplemented endpoints and created contract drift (architecture review blocker #1).

## Decision

1. **`docs/api/openapi.yaml`** remains the **authoritative design-time architecture contract** for roadmap and independent FE/BE planning.
2. **Runtime Swagger** (`GET /docs`, `GET /docs.json`) documents **only Express routes that are implemented**, generated via `swagger-jsdoc` from module route JSDoc.
3. The full YAML is **not** served by the API server until corresponding routes exist (incremental adoption).

## Consequences

(+) `/docs` matches production reality; no false discoverability  
(+) Full contract still available in-repo for architecture work  
(−) Maintainers must add `@openapi` JSDoc when shipping each module  
(−) Two OpenAPI artifacts must stay conceptually aligned (contract evolves; runtime lags by design)
