# Engineering Quality & CI

HireFast strengthens code quality during the **Architecture / Foundation** phase via Continuous Integration.

This resolves Architecture Review **Blocker #6** for the CI quality gate only.

---

## CI pipeline (required order)

Defined in `.github/workflows/ci.yml`:

1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Build shared packages (`packages/*`)
3. Generate Prisma client
4. Run database migrations
5. **Prettier format check** (`pnpm format:check`) — fails the job on style drift
6. **ESLint** (`pnpm lint`) — fails the job on lint errors
7. TypeScript typecheck
8. Unit / integration tests (`pnpm test`)
9. Build applications (`apps/*`)

Local equivalents:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

---

## Completed (foundation)

| Capability               | Notes                                         |
| ------------------------ | --------------------------------------------- |
| Structured logging       | Backend logger (`console` JSON foundation)    |
| Health checks            | `/health` + DB/Redis probes                   |
| CI foundation            | GitHub Actions with Postgres + Redis services |
| Format + lint gates      | Prettier check + ESLint in CI                 |
| Unit / integration tests | Jest (backend), Vitest (portals / shared-ui)  |

---

## Deferred (intentionally later)

| Capability                                           | When                                                     |
| ---------------------------------------------------- | -------------------------------------------------------- |
| End-to-end testing (Playwright / Cypress / etc.)     | After core user workflows exist (Feature Implementation) |
| Monitoring / APM (Sentry, OpenTelemetry, Datadog, …) | Production readiness phase                               |
| Broader production observability                     | Production readiness phase                               |
| Backup & disaster recovery automation                | Production readiness phase — see `BACKUP_AND_DR.md`      |

Do **not** treat deferred ops items as incomplete foundation.

---

## Engineering policy notes

- Prefer failing CI over merging unformatted or lint-failing code.
- When Feature Implementation adds modules: no module merge without ownership / authorization tests (policy — enforced culturally until coverage lands with features).
- Do not introduce E2E frameworks or APM vendors during Architecture-First foundation work.

## Related

- `docs/engineering/BACKUP_AND_DR.md`
- `docs/engineering/OPERATIONS_ROADMAP.md`
- `docs/architecture/ENGINEERING_QUALITY_REVIEW.md`
