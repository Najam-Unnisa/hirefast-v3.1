# ADR-002: pnpm Monorepo

## Status

Accepted

## Decision

Use pnpm workspaces: `apps/candidate-portal`, `apps/admin-portal`, `apps/backend`, `packages/shared-*`.

## Consequences

(+) Shared types/config; single CI  
(−) Need shared-ui package to avoid portal duplication (see review P0)
