# ADR-004: REST API v1 Envelope

## Status

Accepted

## Decision

All JSON APIs under `/api/v1` use `{ success, message, data }` / `{ success, message, errors }`. Pagination: `{ items, meta }`.

## Consequences

(+) Predictable clients  
(−) Breaking changes require `/api/v2` or deprecation policy in STANDARDS.md
