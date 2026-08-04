# ADR-005: Google OAuth Only

## Status

Accepted

## Decision

No password authentication. Identity via Google OAuth; JWT access + refresh (refresh in Redis, not Postgres).

## Consequences

(+) Aligns with Guest frictionless entry  
(−) Auth vertical slice must be completed before domain features (P0)
