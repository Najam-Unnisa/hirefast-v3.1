# HireFast Architecture Review & Validation Report

**Version:** 1.0  
**Date:** 2026-08-04  
**Reviewer role:** Chief Software Architect (multi-perspective design review)  
**Scope:** Master Context · Engineering Standards · Project Init · Database · API Contract · Actual codebase  
**Mode:** Critical — assume nothing is correct until proven

---

## 1. Executive Summary

HireFast today is a **well-documented architectural foundation with a mature data model and API contract**, sitting on top of a **thin runtime shell**. The strategic decisions that matter most — modular monolith, JRS/AI separation, REST `/api/v1` envelope, PostgreSQL+Prisma, Redis+BullMQ for async work, provider abstractions for AI/storage — are directionally sound and aligned with the Engineering Standards.

However, this review **does not grant unconditional approval** for unconstrained feature development.

Critical gaps remain:

1. **Contract–implementation drift** — OpenAPI documents ~81 paths; backend mounts **only** `/health` (design-time contract vs runtime — expected under Architecture-First until Feature Implementation).
2. **~~RBAC model is incoherent at the identity boundary~~** — **Resolved** (roles `ADMIN`/`USER`/`GUEST`; commercial via `FREE`/`PREMIUM` plans). See `docs/architecture/RBAC_SUBSCRIPTION_SEPARATION.md`.
3. **~~Auth is incomplete~~** — **Clarified:** Authentication **Foundation** is implemented (JWT, middleware, Google OAuth config/provider, Redis, refresh-token store). Auth **HTTP APIs** (login/refresh/logout/session) are intentionally deferred to **Feature Implementation** — not an architectural defect. See `docs/architecture/AUTHENTICATION_FOUNDATION.md`.
4. **~~Frontend is duplicated scaffolding~~** — **Resolved** via `@hirefast/shared-ui` (see `docs/architecture/SHARED_UI.md`). Portal pages/constants remain app-local by design.
5. **Operational readiness is shallow** — no monitoring/APM, no backup/DR runbooks, no e2e, CI omits lint/format, workers are empty shells.
6. **Security posture is “scaffolded, not enforced”** — Helmet/CORS/rate-limit exist globally; IDOR, idempotency, request IDs, permission checks, and scoped rate limits do not (enforcement lands with feature routes).

**Verdict:** Architecture is a **strong blueprint**. Authentication Foundation is in place. Domain Feature Implementation (including auth APIs) remains ahead. Approve **conditionally** for remaining Phase 0 architecture items (Section 19–20) — do **not** treat deferred auth APIs as a foundation failure.

---

## 2–10. Scores (out of 10)

| #   | Area                     |   Score | Rationale (compressed)                                                                                                                           |
| --- | ------------------------ | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2   | **Overall Architecture** | **6.5** | Sound modular-monolith intent; empty module folders; coupling via role/subscription conflation; portals duplicated                               |
| 3   | **Database**             | **7.5** | Solid 3NF, FKs, indexes, JRS≠AI; weak points: dual commercial identity, missing active-subscription uniqueness, soft-delete index hole           |
| 4   | **API**                  | **7.5** | Comprehensive, consistent envelope; minor duplication (`/auth/me` vs `/users/me`); billing deferred; excellent as a contract                     |
| 5   | **Security**             | **6.0** | Auth foundation (JWT/middleware/OAuth provider/Redis refresh store) ready; enforcement awaits feature routes; example secrets still placeholders |
| 6   | **Performance**          | **5.5** | No caching strategy, no CDN plan, empty queues, dashboard aggregate risk only documented                                                         |
| 7   | **Scalability**          | **6.5** | Schema/API can grow; no org multi-tenancy; worker horizontal scale undesigned; analytics not partition-ready                                     |
| 8   | **Maintainability**      | **5.5** | Docs excellent; UI duplication and contract/code drift will create immediate debt once features start                                            |
| 9   | **Developer Experience** | **6.5** | Monorepo, seeds, Docker, Swagger YAML — good; CI thin; no shared UI; no ADR set until this report                                                |
| 10  | **Product Experience**   | **6.0** | Product principles clear; guest lock designed; actual UX flows not built; disabled CTAs only                                                     |

**Weighted readiness (approx.): 6.2 / 10** — **not** “ship features freely.”

---

## 11. Strengths

1. **Clear product + engineering doctrine** — Master Context and Standards constrain stack and philosophy (determinism for JRS; AI for feedback).
2. **Database design quality** — Attempt-centric transactional root; deterministic evaluation vs AI reports; soft deletes used sparingly; useful indexes for dashboard/auth/search.
3. **API contract discipline** — Single envelope, pagination meta, auth matrix, OpenAPI as Swagger source of truth (`docs/api/openapi.yaml` → `/docs`).
4. **Infrastructure scaffolding** — Express security baseline (Helmet, CORS, compression, rate limit), Prisma migrations + seeds, Redis client, BullMQ queue registration, AI/R2 provider interfaces.
5. **Monorepo boundaries** — `apps/*` + `packages/shared-{types,utils,config}` match standards; health module demonstrates intended controller/service shape.
6. **Explicit non-goals honored so far** — Foundation prompts correctly avoided fake feature implementations.

---

## 12. Weaknesses

### Architecture & structure

- **Module folders without modules** — `repositories/`, `services/`, `shared/` are placeholders; only `modules/health` exists. Risk: teams invent inconsistent patterns under delivery pressure.
- **~~No shared UI package~~** — **Resolved** (`@hirefast/shared-ui`).
- **Over-declared frontend deps** — `framer-motion`, React Hook Form, Zod listed but unused in portal source.
- **Role vs subscription conflation** — Product wants both RBAC and billing; schema/docs claim separation, then seed `FREEMIUM`/`PREMIUM` as roles with **identical permissions**. Authorization will become “if role === PREMIUM || subscription.active” forever.

### Database

- No **partial unique** constraint ensuring one active subscription per user.
- `learning_recommendations.deleted_at` lacks an index while other soft-delete columns are indexed.
- `attempt_responses.raw_payload` JSON is an escape hatch that can become a dumping ground.
- Permission model is rich in DB but **unused** by JWT claims (role string only).

### API

- `/auth/me` and `/users/me` duplicate the same DTO (acknowledged, still cognitive load).
- `/premium/*` partially overlaps filtered `/assessments?accessTier=PREMIUM`.
- Report create allows 200 **or** 202 — pick one before clients ship.
- Billing/webhooks absent — premium cannot be fulfilled end-to-end from the contract alone.

### Security

- Auth **foundation** middleware exists; it is not mounted on business routes because those modules are deferred (Architecture-First).
- `optionalAuthenticate` swallows verification errors — can mask token bugs when feature routes mount it.
- Refresh-token **store** exists (`RefreshTokenStore`); refresh/logout **HTTP APIs** are Feature Implementation.
- Global rate limit default (100/15m) ≠ documented recommendation (300 + per-route).
- Error code `RATE_LIMIT` vs catalog `RATE_LIMITED`.
- No `X-Request-Id` generation despite CORS allow-list.
- No idempotency store for submit/evaluation.
- Example JWT secrets are commit-adjacent placeholders (operational risk if copied to prod).

### Frontend

- Auth context is local state only — FE session UX is Feature Implementation (not a backend foundation gap).
- No authenticated layouts, no loading/error route patterns beyond UI primitives.
- Accessibility: primitives mostly OK; no product flows to validate.

### Backend / AI / jobs

- BullMQ queues registered; **zero workers**.
- `AIService.complete` exists; no prompt registry, retries, cost controls, or job integration.
- R2: put/delete/url only — no presign, no virus-scan hook, no upload routes.
- Logger is custom `console` JSON — fine for early stage; weak for prod correlation/sampling.

### DevOps / testing

- CI: typecheck + test + build; **no lint/format**, no e2e, no image build, no migrate-on-deploy docs for prod.
- Tests: 2 health API cases + 2 Button unit tests. Effectively **zero** coverage of authz/DB invariants.
- No monitoring, tracing, alerting, backup, or incident runbooks.

---

## 13. Risks

| Risk                           | Severity | Why it hurts                                                                             |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| **Contract drift**             | Critical | FE builds against OpenAPI while BE lacks routes → blocked sprints or ad-hoc APIs         |
| **~~Premium = role~~**         | —        | **Resolved** — commercial access via subscription only                                   |
| **Auth Feature APIs deferred** | Info     | Expected under Architecture-First; foundation ready — see `AUTHENTICATION_FOUNDATION.md` |
| **Empty workers**              | High     | AI/report/email will land in HTTP handlers “just this once”                              |
| **~~UI fork~~**                | —        | **Resolved** — `@hirefast/shared-ui`                                                     |
| **No observability**           | High     | Cannot operate AI cost, queue lag, or auth failures in prod                              |
| **IDOR if rushed**             | Critical | Attempt/report/file IDs are guessable UUIDs still need ownership checks — easy to forget |
| **Permission table theater**   | Medium   | Maintained seed data that auth never reads → false sense of RBAC                         |
| **Analytics growth**           | Medium   | Unpartitioned `analytics_events` / `audit_logs` will hurt                                |

---

## 14. Missing Components

| Area              | Missing                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Auth foundation   | ✅ JWT, middleware, Google provider, Redis refresh store — `docs/architecture/AUTHENTICATION_FOUNDATION.md`         |
| Auth feature APIs | ⏳ Deferred — login/refresh/logout/session HTTP (Feature Implementation phase)                                      |
| Domain modules    | users, assessments, attempts, evaluation, reports, dashboard, gamification, notifications, subscriptions, admin, HR |
| Frontend          | Auth session UX, protected routes, real pages, form patterns, a11y flows (UI kit shared)                            |
| AI                | Prompt templates versioning, job processors, retry/DLQ policy, token/cost accounting, provider failover             |
| Storage           | Presigned upload API, MIME/size enforcement middleware, malware scan hook                                           |
| Platform          | Idempotency middleware, request ID middleware, structured logger (pino), feature flags                              |
| Ops               | APM/metrics, log aggregation, DB backups, migrate runbook, staging env, secrets manager                             |
| Quality           | Contract tests, authz tests, e2e smoke, load test plan for submit/evaluate                                          |
| Product           | Billing provider integration contract, org/recruiter ADR (even if deferred)                                         |

---

## 15. Recommended Refactoring (before feature flood)

### P0 — Blocking (architecture remediation)

1. **~~Resolve RBAC vs billing~~** — **Done** (ADR-010 Accepted).
2. **Authentication Foundation** — **Done** (JWT, middleware, Google provider, Redis refresh store). Auth **Feature Implementation** (HTTP APIs) is intentionally deferred — not a P0 architecture defect. See `AUTHENTICATION_FOUNDATION.md`.
3. **~~Extract `packages/shared-ui`~~** — **Done** (see `docs/architecture/SHARED_UI.md`).
4. **Standardize cross-cutting middleware**  
   Request ID, consistent 429 code (`RATE_LIMITED`), align rate-limit defaults with STANDARDS, idempotency for future submit.
5. **Worker bootstrap**  
   At least one no-op or heartbeat worker + DLQ convention so AI jobs never default to request-thread.
6. **Freeze API ambiguities**  
   Single status for report create (`200` + `GENERATING`); document billing as out-of-band until `/billing` exists.

### Feature Implementation (first auth-dependent modules)

- Auth vertical slice using foundation: Google start/callback → issue tokens → `RefreshTokenStore` → `authenticate`/`authorize` on `/auth/me` → logout.
- Mount auth middleware on each protected feature route as that module ships.

### P1 — Strongly recommended in first month of features

7. Add `attempt_response_options` when multi-select ships (don’t overload JSON).
8. Index `learning_recommendations(deleted_at)` or drop soft delete if unused.
9. Replace console logger with pino + request correlation.
10. CI: lint + format check + OpenAPI lint (Spectral).
11. Contract test harness against OpenAPI for each module as it lands.
12. Entitlement helper: `assertFeature(user, 'assessments.premium')` — never scatter role checks.

### P2 — Before production traffic

13. Observability (metrics, traces, error tracking).
14. Backup/PITR for Postgres; Redis persistence policy.
15. Staging environment + migration runbook.
16. Load test: assessment submit + evaluation enqueue.

---

## 16. Future Recommendations

- **Organizations / recruiters / interviews / learning LMS** — keep as additive modules FK’d to `users`/`skills`; write ADRs before schema expansion.
- **Multi-provider AI** — keep `IAIProvider`; add prompt registry package; meter usage per attempt.
- **Event bus** — if admin analytics and notifications proliferate, consider outbox pattern from attempt state transitions.
- **Read models** — if dashboard latency becomes an issue, materialize summary table rather than denormalizing core 3NF tables.
- **API modular OpenAPI** — split `openapi.yaml` when it exceeds maintainability.

---

## 17. Final Architecture Diagram (text)

```
                         ┌──────────────────────────────────────┐
                         │         Clients (Next.js)            │
                         │  candidate-portal │ admin-portal     │
                         │  both consume @hirefast/shared-ui    │
                         └───────────────┬──────────────────────┘
                                         │ HTTPS / JSON
                                         │ Bearer JWT
                         ┌───────────────▼──────────────────────┐
                         │         API Gateway surface          │
                         │   Express /api/v1  (+ /health,/docs) │
                         │   Helmet · CORS · RateLimit · Zod    │
                         └───────────────┬──────────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
     ┌────────────────┐       ┌──────────────────┐       ┌─────────────────┐
     │ Auth / RBAC    │       │ Domain Modules   │       │ Admin / HR      │
     │ (helpers only  │       │ (NOT BUILT YET)  │       │ (NOT BUILT YET) │
     │  today)        │       │ assessments,     │       │                 │
     └───────┬────────┘       │ attempts, eval,  │       └────────┬────────┘
             │                │ reports, dash…   │                │
             │                └────────┬─────────┘                │
             │                         │                          │
             │         ┌───────────────┼──────────────┐           │
             │         ▼               ▼              ▼           │
             │   ┌──────────┐   ┌──────────┐   ┌────────────┐     │
             │   │ Prisma   │   │ Redis    │   │ BullMQ     │     │
             │   │ Postgres │   │ sessions │   │ queues     │     │
             │   │ (38 tbl) │   │ cache*   │   │ (no workers│     │
             │   └──────────┘   └──────────┘   │  yet)      │     │
             │                                 └─────┬──────┘     │
             │                                       │            │
             │                          ┌────────────┼────────┐   │
             │                          ▼            ▼        ▼   │
             │                     OpenAI*        R2/S3*   Email* │
             │                     (provider)     (provider)      │
             └────────────────────────────────────────────────────┘

* Wired as libraries/config; not product-integrated.
```

**Data plane truth:** Attempt is the hub — responses → deterministic evaluation / JRS; AI evaluation / reports are side paths; XP/badges/notifications fan out asynchronously (intended).

---

## 18. Architecture Decision Records (ADR summary)

| ADR     | Decision                                               | Status       | Challenge                                                           |
| ------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------- |
| ADR-001 | Modular monolith (Express) over microservices          | **Accepted** | Correct for current team/stage                                      |
| ADR-002 | pnpm monorepo: 2 Next apps + backend + shared packages | **Accepted** | Includes `@hirefast/shared-ui`                                      |
| ADR-003 | PostgreSQL + Prisma; UUID PKs; snake_case DB maps      | **Accepted** | —                                                                   |
| ADR-004 | REST `/api/v1` + standard envelope                     | **Accepted** | —                                                                   |
| ADR-005 | Google OAuth only (no password table)                  | **Accepted** | Foundation ready; Feature APIs deferred (Architecture-First)        |
| ADR-006 | JRS/backend eval ≠ AI reports                          | **Accepted** | Non-negotiable product rule — keep                                  |
| ADR-007 | BullMQ for AI/report/email/notifications               | **Accepted** | Workers must exist before those features                            |
| ADR-008 | AI via provider interface (OpenAI first)               | **Accepted** | Needs prompt/job layer                                              |
| ADR-009 | Files metadata in Postgres; bytes in R2                | **Accepted** | Presign flow TBD                                                    |
| ADR-010 | Roles = ADMIN/USER/GUEST; plans = commercial           | **Accepted** | Separated — see `docs/architecture/RBAC_SUBSCRIPTION_SEPARATION.md` |
| ADR-011 | OpenAPI YAML is Swagger source of truth                | **Accepted** | Must not diverge from code                                          |
| ADR-012 | Soft deletes selective                                 | **Accepted** | Index all soft-delete columns used in queries                       |
| ADR-013 | Dual portals (candidate/admin)                         | **Accepted** | Shared UI extracted — `SHARED_UI.md`                                |

---

## 19. Production Readiness Checklist

| Item                                                     | Ready?                                           |
| -------------------------------------------------------- | ------------------------------------------------ |
| Stack frozen & documented                                | ✅                                               |
| Monorepo builds                                          | ✅                                               |
| DB schema migrated + seeded                              | ✅                                               |
| API contract published                                   | ✅                                               |
| Health checks (API/DB/Redis)                             | ✅                                               |
| Auth foundation (JWT / middleware / OAuth / Redis store) | ✅                                               |
| Auth feature APIs (login / refresh / logout / session)   | ⏳ Feature Implementation                        |
| RBAC entitlements coherent                               | ✅ (identity roles; commercial via subscription) |
| Domain modules implemented                               | ❌                                               |
| Workers processing jobs                                  | ❌                                               |
| Observability                                            | ❌                                               |
| Backups / DR                                             | ❌                                               |
| Secrets management (non-local)                           | ❌                                               |
| e2e / contract tests                                     | ❌                                               |
| CI lint + security gates                                 | ❌                                               |
| Shared UI / DX for two portals                           | ✅ (`@hirefast/shared-ui`)                       |
| Rate-limit & idempotency per STANDARDS                   | ❌                                               |
| Staging environment                                      | ❌                                               |

**Production traffic:** **NO**  
**Feature development:** **ONLY after P0**

---

## 20. Final Approval Recommendation

### Decision: **CONDITIONAL APPROVAL** (architecture)

The HireFast architecture is **approved as a foundation blueprint**. Authentication **Foundation** is complete. Authentication **Feature Implementation** (HTTP APIs) is intentionally deferred under Architecture-First methodology and is **not** a foundation defect.

### Remaining Phase 0 architecture gate (non-auth):

1. ~~Fix **role vs subscription / entitlement** model~~ — **Done** (ADR-010).
2. ~~Authentication Foundation~~ — **Done** (see `AUTHENTICATION_FOUNDATION.md`). Auth HTTP APIs → Feature Implementation.
3. ~~Extract **shared UI** and stop duplicating portals~~ — **Done** (`@hirefast/shared-ui`).
4. Establish **worker/process conventions** for BullMQ (even with a noop consumer).
5. Add **request ID + consistent error/rate-limit codes**; freeze OpenAPI ambiguities (report status codes).
6. Add **CI lint** and a written rule: _no module merges without tests for authz ownership_.

### Do **not** approve if the team intends to:

- Implement assessments/AI/reports **without** using the auth foundation (JWT middleware + subscription gates) when those routes ship.
- Invent parallel session/OAuth helpers instead of `providers/auth` + `RefreshTokenStore`.
- Reintroduce portal UI forks instead of extending `@hirefast/shared-ui`.
- Run evaluation/AI **inside HTTP handlers** because workers “aren’t ready.”
- Treat OpenAPI as aspirational while shipping incompatible routes.

### Architect’s closing challenge

Documentation quality is currently **ahead of** feature substance — **by design** under Architecture-First. The expensive failures for HireFast will not be missing auth foundation; they will be **entitlement bugs, IDOR on attempts/reports, AI cost blowups on synchronous paths, and twin frontend drift** if Feature Implementation ignores the foundation.

Consume the foundation when features begin; do not rebuild it.

---

## Appendix A — Evidence base (sampled)

| Evidence                                                      | Path                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Only health module routed                                     | `apps/backend/src/routes/index.ts`                                               |
| Auth middleware (foundation; mount at Feature Implementation) | `apps/backend/src/middlewares/auth.middleware.ts`                                |
| Auth provider + refresh store (foundation)                    | `apps/backend/src/providers/auth/`, `infrastructure/auth/refresh-token.store.ts` |
| Empty workers                                                 | `apps/backend/src/jobs/worker.ts`                                                |
| 38 Prisma models                                              | `prisma/schema.prisma`                                                           |
| OpenAPI ~81 paths                                             | `docs/api/openapi.yaml`                                                          |
| Shared UI package                                             | `packages/shared-ui`                                                             |
| FE auth stub (feature phase)                                  | `apps/*/src/components/providers/auth-provider.tsx`                              |
| CI scope                                                      | `.github/workflows/ci.yml`                                                       |
| Identity roles ADMIN/USER/GUEST                               | `apps/backend/prisma/seeds/roles-permissions.ts`                                 |
| Subscription plans FREE/PREMIUM                               | `apps/backend/prisma/seeds/subscription-plans.ts`                                |
| Subscription middleware                                       | `apps/backend/src/middlewares/subscription.middleware.ts`                        |

---

## Appendix B — Scorecard snapshot

```
Architecture ........ 6.5
Database ............ 7.5
API ................. 7.5
Security ............ 5.0
Performance ......... 5.5
Scalability ......... 6.5
Maintainability ..... 5.5
Developer Experience  6.5
Product Experience .. 6.0
────────────────────────
Overall ............. 6.2  → Conditional Approval
```
