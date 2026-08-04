# HireFast API Architecture Review

## Completeness checklist

| Module                                | Catalog | OpenAPI | Auth defined |
| ------------------------------------- | ------- | ------- | ------------ |
| Auth                                  | ✅      | ✅      | ✅           |
| Users / Profiles / Files              | ✅      | ✅      | ✅           |
| Assessments / Attempts                | ✅      | ✅      | ✅           |
| Evaluation / JRS / Reports            | ✅      | ✅      | ✅           |
| Dashboard                             | ✅      | ✅      | ✅           |
| Gamification                          | ✅      | ✅      | ✅           |
| Notifications                         | ✅      | ✅      | ✅           |
| Premium / Subscriptions               | ✅      | ✅      | ✅           |
| Admin (users, assessments, questions) | ✅      | ✅      | ✅           |
| HR Review                             | ✅      | ✅      | ✅           |
| Analytics / Settings / Audit          | ✅      | ✅      | ✅           |
| Health                                | ✅      | ✅      | Public       |

## Refactors applied during design

1. **Single envelope everywhere** — no mixed response shapes; pagination always `{ items, meta }`.
2. **Attempt as transactional root** — submit/evaluate/JRS/report hang off `/attempts/:id/...` to avoid duplicate “assessment result” resources.
3. **Admin namespace** — all privileged management under `/admin/**` (clear authz boundary).
4. **Premium dual surface** — catalog filtering by `accessTier` plus explicit `/premium/**` for product clarity without duplicating core attempt APIs.
5. **Guest lock** — explicit `RESULTS_LOCKED` / `resultsLocked` rather than silent empty scores.
6. **Leaderboard future-ready** — path exists; returns empty + `featureEnabled: false` until enabled (no 501 break).
7. **No token tables in API** — refresh/logout contract assumes Redis-backed sessions per DB standards.

## Issues checked

| Risk                                | Resolution                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Duplicate `/users/me` vs `/auth/me` | Both kept: auth for session identity; users for resource modeling. Same DTO.                |
| Report create status code           | Allow `200` or `202`; prefer `200` envelope with `status: GENERATING` for client simplicity |
| File upload mode ambiguity          | Contract supports `presign` and `multipart`; implementers pick one primary                  |
| Billing checkout missing            | Intentionally deferred; validate-feature covers gating                                      |
| Device push tokens                  | Marked future; not in active v1 paths                                                       |
| Naming inconsistency                | Plural resources; nested actions as subpaths; admin prefix consistent                       |

## Security gaps (contract notes — not implementation)

- Ensure IDOR checks on every `:attemptId`, `:reportId`, `:fileId`.
- Never return `isCorrect` on player question endpoints.
- Rate limits must be enforced before expensive AI routes.
- Admin analytics ingest should not accept untrusted client spoofing of other users without admin role.

## Performance risks

- `GET /dashboard/me` is an aggregate — implement with parallel queries / limited joins; do not N+1 attempts.
- Notification and audit list endpoints must use composite indexes already defined in DB architecture.
- Autosave should be lightweight (upsert only); no evaluation side effects.

## Versioning / compatibility

- Additive fields OK in v1.
- Removing/renaming fields or changing auth → `/api/v2` or deprecation headers.
- Shared TypeScript DTOs live in `@hirefast/shared-types` for FE/BE alignment.

## Improvement recommendations

1. Generate server stubs / client SDKs from `docs/api/openapi.yaml` in a later tooling pass.
2. Add contract tests (Schemathesis / Dredd) once routes are implemented.
3. Publish `CHANGELOG-API.md` when v1 freezes.
4. Consider splitting OpenAPI into modular YAML (`paths/*.yaml`) if the file grows further.
5. Wire Swagger UI to serve this file as the source of truth (replace ad-hoc JSDoc-only docs).

## Normative artifacts

| Artifact         | Path                                                         |
| ---------------- | ------------------------------------------------------------ |
| Architecture     | `docs/api/ARCHITECTURE.md`                                   |
| Endpoint catalog | `docs/api/ENDPOINT_CATALOG.md`                               |
| Standards        | `docs/api/STANDARDS.md`                                      |
| Auth matrix      | `docs/api/AUTH_MATRIX.md`                                    |
| OpenAPI          | `docs/api/openapi.yaml` (design-time)                        |
| Runtime Swagger  | `/docs` — implemented routes only (`CONTRACT_VS_RUNTIME.md`) |
| TS contracts     | `packages/shared-types/src/api/`                             |
