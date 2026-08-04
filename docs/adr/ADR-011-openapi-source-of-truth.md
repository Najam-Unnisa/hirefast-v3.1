# ADR-011: OpenAPI as Source of Truth

## Status

Accepted

## Decision

`docs/api/openapi.yaml` is the normative contract; Swagger UI loads this file (not JSDoc generation).

## Consequences

(+) FE/BE can develop independently  
(−) High drift risk until contract tests exist
