# ADR-013: Dual Portals

## Status

Accepted

## Decision

Separate Next.js apps: candidate-portal (3000) and admin-portal (3001).

Reusable UI and frontend infrastructure live in `@hirefast/shared-ui` (single source of truth).

## Consequences

(+) Independent deploy/UX per portal  
(+) Shared primitives/providers/theme avoid DRY violations  
(−) Feature modules must still resist copying UI into apps — extend shared-ui instead

See `docs/architecture/SHARED_UI.md`.
