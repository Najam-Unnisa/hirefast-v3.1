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

1. **Contract–implementation drift** — OpenAPI documents ~81 paths; backend mounts **only** `/health`.
2. **RBAC model is incoherent at the identity boundary** — `FREEMIUM` / `PREMIUM` are both **roles** and **commercial products**, with identical seeded permissions.
3. **Auth is incomplete relative to its own contract** — JWT helpers exist; Redis-backed refresh/logout, Google callback, and wired middleware do not.
4. **Frontend is duplicated scaffolding** — candidate and admin portals share ~17 identical UI files with no `shared-ui` package; auth provider is a stub.
5. **Operational readiness is shallow** — no monitoring/APM, no backup/DR runbooks, no e2e, CI omits lint/format, workers are empty shells.
6. **Security posture is “scaffolded, not enforced”** — Helmet/CORS/rate-limit exist globally; IDOR, idempotency, request IDs, permission checks, and scoped rate limits do not.

**Verdict:** Architecture is a **strong blueprint**. Runtime is **not yet production-ready**. Approve only **conditionally**, after a mandatory **Phase 0 remediation** (Section 19–20).

---

## 2–10. Scores (out of 10)

| #   | Area                     |   Score | Rationale (compressed)                                                                                                                 |
| --- | ------------------------ | ------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | **Overall Architecture** | **6.5** | Sound modular-monolith intent; empty module folders; coupling via role/subscription conflation; portals duplicated                     |
| 3   | **Database**             | **7.5** | Solid 3NF, FKs, indexes, JRS≠AI; weak points: dual commercial identity, missing active-subscription uniqueness, soft-delete index hole |
| 4   | **API**                  | **7.5** | Comprehensive, consistent envelope; minor duplication (`/auth/me` vs `/users/me`); billing deferred; excellent as a contract           |
| 5   | **Security**             | **5.0** | Middleware & headers present but unwired; refresh tokens not stored; permission tables unused; weak example secrets                    |
| 6   | **Performance**          | **5.5** | No caching strategy, no CDN plan, empty queues, dashboard aggregate risk only documented                                               |
| 7   | **Scalability**          | **6.5** | Schema/API can grow; no org multi-tenancy; worker horizontal scale undesigned; analytics not partition-ready                           |
| 8   | **Maintainability**      | **5.5** | Docs excellent; UI duplication and contract/code drift will create immediate debt once features start                                  |
| 9   | **Developer Experience** | **6.5** | Monorepo, seeds, Docker, Swagger YAML — good; CI thin; no shared UI; no ADR set until this report                                      |
| 10  | **Product Experience**   | **6.0** | Product principles clear; guest lock designed; actual UX flows not built; disabled CTAs only                                           |

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
- **No shared UI package** — candidate/admin duplicate the entire UI kit. Violates DRY and guarantees visual/behavior drift.
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

- Auth middleware **never mounted** on business routes (none exist).
- `optionalAuthenticate` swallows verification errors — can mask token bugs.
- Refresh/logout contract assumes Redis; **no session store implementation**.
- Global rate limit default (100/15m) ≠ documented recommendation (300 + per-route).
- Error code `RATE_LIMIT` vs catalog `RATE_LIMITED`.
- No `X-Request-Id` generation despite CORS allow-list.
- No idempotency store for submit/evaluation.
- Example JWT secrets are commit-adjacent placeholders (operational risk if copied to prod).

### Frontend

- Auth context is local state only — no token persistence, no refresh, no route guards.
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

| Risk                         | Severity | Why it hurts                                                                             |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| **Contract drift**           | Critical | FE builds against OpenAPI while BE lacks routes → blocked sprints or ad-hoc APIs         |
| **Premium = role**           | High     | Entitlement bugs, refund/cancel edge cases, audit confusion                              |
| **Auth half-built**          | Critical | First feature wave will invent session storage inconsistently                            |
| **Empty workers**            | High     | AI/report/email will land in HTTP handlers “just this once”                              |
| **UI fork**                  | High     | Design system divergence between portals                                                 |
| **No observability**         | High     | Cannot operate AI cost, queue lag, or auth failures in prod                              |
| **IDOR if rushed**           | Critical | Attempt/report/file IDs are guessable UUIDs still need ownership checks — easy to forget |
| **Permission table theater** | Medium   | Maintained seed data that auth never reads → false sense of RBAC                         |
| **Analytics growth**         | Medium   | Unpartitioned `analytics_events` / `audit_logs` will hurt                                |

---

## 14. Missing Components

| Area           | Missing                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Auth           | Google callback service, refresh store (Redis), logout revoke, route wiring, permission resolution endpoint backed by DB |
| Domain modules | users, assessments, attempts, evaluation, reports, dashboard, gamification, notifications, subscriptions, admin, HR      |
| Frontend       | Shared UI package, auth session store, protected routes, real pages, form patterns, a11y flows                           |
| AI             | Prompt templates versioning, job processors, retry/DLQ policy, token/cost accounting, provider failover                  |
| Storage        | Presigned upload API, MIME/size enforcement middleware, malware scan hook                                                |
| Platform       | Idempotency middleware, request ID middleware, structured logger (pino), feature flags                                   |
| Ops            | APM/metrics, log aggregation, DB backups, migrate runbook, staging env, secrets manager                                  |
| Quality        | Contract tests, authz tests, e2e smoke, load test plan for submit/evaluate                                               |
| Product        | Billing provider integration contract, org/recruiter ADR (even if deferred)                                              |

---

## 15. Recommended Refactoring (before feature flood)

### P0 — Blocking (must complete before domain features)

1. **Resolve RBAC vs billing**
   - Prefer: roles = `ADMIN | USER | GUEST` (or keep Guest); entitlements from `user_subscriptions` + `plan_features`.
   - Or: keep PREMIUM role but **remove identical permission sets** and document a single entitlement resolver used by every gate.
   - Add DB partial unique: one `ACTIVE`/`TRIALING` subscription per user.

2. **Implement Auth vertical slice (minimal but real)**  
   Google start/callback → issue tokens → Redis refresh → `authenticate`/`authorize` on `/auth/me` → logout. No assessments yet.

3. **Extract `packages/shared-ui`** (or `packages/ui`) and delete portal duplicates.

4. **Standardize cross-cutting middleware**  
   Request ID, consistent 429 code (`RATE_LIMITED`), align rate-limit defaults with STANDARDS, idempotency for future submit.

5. **Worker bootstrap**  
   At least one no-op or heartbeat worker + DLQ convention so AI jobs never default to request-thread.

6. **Freeze API ambiguities**  
   Single status for report create (`200` + `GENERATING`); document billing as out-of-band until `/billing` exists.

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
                         │  [duplicated UI today — fix P0]      │
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

| ADR     | Decision                                               | Status        | Challenge                                      |
| ------- | ------------------------------------------------------ | ------------- | ---------------------------------------------- |
| ADR-001 | Modular monolith (Express) over microservices          | **Accepted**  | Correct for current team/stage                 |
| ADR-002 | pnpm monorepo: 2 Next apps + backend + shared packages | **Accepted**  | Missing shared-ui package                      |
| ADR-003 | PostgreSQL + Prisma; UUID PKs; snake_case DB maps      | **Accepted**  | —                                              |
| ADR-004 | REST `/api/v1` + standard envelope                     | **Accepted**  | —                                              |
| ADR-005 | Google OAuth only (no password table)                  | **Accepted**  | Must finish Redis session story                |
| ADR-006 | JRS/backend eval ≠ AI reports                          | **Accepted**  | Non-negotiable product rule — keep             |
| ADR-007 | BullMQ for AI/report/email/notifications               | **Accepted**  | Workers must exist before those features       |
| ADR-008 | AI via provider interface (OpenAI first)               | **Accepted**  | Needs prompt/job layer                         |
| ADR-009 | Files metadata in Postgres; bytes in R2                | **Accepted**  | Presign flow TBD                               |
| ADR-010 | Roles include FREEMIUM/PREMIUM                         | **Contested** | **Revise** — conflicts with subscription model |
| ADR-011 | OpenAPI YAML is Swagger source of truth                | **Accepted**  | Must not diverge from code                     |
| ADR-012 | Soft deletes selective                                 | **Accepted**  | Index all soft-delete columns used in queries  |
| ADR-013 | Dual portals (candidate/admin)                         | **Accepted**  | Share UI package                               |

---

## 19. Production Readiness Checklist

| Item                                   | Ready? |
| -------------------------------------- | ------ |
| Stack frozen & documented              | ✅     |
| Monorepo builds                        | ✅     |
| DB schema migrated + seeded            | ✅     |
| API contract published                 | ✅     |
| Health checks (API/DB/Redis)           | ✅     |
| Auth end-to-end                        | ❌     |
| RBAC entitlements coherent             | ❌     |
| Domain modules implemented             | ❌     |
| Workers processing jobs                | ❌     |
| Observability                          | ❌     |
| Backups / DR                           | ❌     |
| Secrets management (non-local)         | ❌     |
| e2e / contract tests                   | ❌     |
| CI lint + security gates               | ❌     |
| Shared UI / DX for two portals         | ❌     |
| Rate-limit & idempotency per STANDARDS | ❌     |
| Staging environment                    | ❌     |

**Production traffic:** **NO**  
**Feature development:** **ONLY after P0**

---

## 20. Final Approval Recommendation

### Decision: **CONDITIONAL APPROVAL**

The HireFast architecture is **approved as a blueprint** and **not approved as a finished platform foundation for unconstrained feature delivery**.

### You may proceed to feature development **only if** the following P0 gate is completed first:

1. Fix **role vs subscription / entitlement** model (ADR-010 revision).
2. Deliver a **real Auth vertical slice** (Google + JWT + Redis refresh + wired middleware).
3. Extract **shared UI** and stop duplicating portals.
4. Establish **worker/process conventions** for BullMQ (even with a noop consumer).
5. Add **request ID + consistent error/rate-limit codes**; freeze OpenAPI ambiguities (report status codes).
6. Add **CI lint** and a written rule: _no module merges without tests for authz ownership_.

### Do **not** approve if the team intends to:

- Implement assessments/AI/reports **before** auth sessions and entitlement resolution exist.
- Copy portal UI per feature instead of extracting shared-ui.
- Run evaluation/AI **inside HTTP handlers** because workers “aren’t ready.”
- Treat OpenAPI as aspirational while shipping incompatible routes.

### Architect’s closing challenge

Documentation quality is currently **ahead of** engineering substance. That is preferable to the reverse — but it creates a false sense of readiness. The expensive failures for HireFast will not be missing tables; they will be **entitlement bugs, IDOR on attempts/reports, AI cost blowups on synchronous paths, and twin frontend drift**.

Address those before celebrating the schema.

---

## Appendix A — Evidence base (sampled)

| Evidence                     | Path                                                |
| ---------------------------- | --------------------------------------------------- |
| Only health module routed    | `apps/backend/src/routes/index.ts`                  |
| Auth middleware unwired      | `apps/backend/src/middlewares/auth.middleware.ts`   |
| Empty workers                | `apps/backend/src/jobs/worker.ts`                   |
| 38 Prisma models             | `prisma/schema.prisma`                              |
| OpenAPI ~81 paths            | `docs/api/openapi.yaml`                             |
| Identical portal UI          | `apps/*/src/components/ui/*`                        |
| Auth stub                    | `apps/*/src/components/providers/auth-provider.tsx` |
| CI scope                     | `.github/workflows/ci.yml`                          |
| FREEMIUM≈PREMIUM permissions | `apps/backend/prisma/seeds/roles-permissions.ts`    |

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
