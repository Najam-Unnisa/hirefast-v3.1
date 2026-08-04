# Architecture Review — Shared UI Extraction (Blocker #4)

**Status:** Resolved  
**Scope:** Architectural refactor only — no business features  
**Package:** `@hirefast/shared-ui`

## Verdict

Candidate and Admin portals no longer maintain duplicate UI infrastructure. Reusable frontend building blocks have a **single source of truth**.

## Checklist

- [x] `packages/shared-ui` created with components / providers / hooks / stores / utils / theme
- [x] UI primitives moved (Button, Card, Dialog, Table, Toast, …)
- [x] Providers moved (Query, Auth context, Toast, AppProviders)
- [x] `cn()` and toast store moved
- [x] Shared `createApiClient` with portal-specific base URL wiring
- [x] Portal imports updated to `@hirefast/shared-ui`
- [x] Duplicate `components/ui`, providers, layout, toast store, `cn` removed from both apps
- [x] `AppShell` parameterized (`portalLabel`) instead of forked copies
- [x] Workspace + Next `transpilePackages` configured
- [x] Documentation added (`SHARED_UI.md`)

## Out of scope (correctly left portal-local)

- Home/marketing page copy
- Portal constants / env base URLs
- Feature modules and business pages

## Follow-ups (non-blocking)

- Future portal-only components stay under `apps/*/src/features`
- shadcn CLI: generate into `packages/shared-ui` (aliases already updated)
