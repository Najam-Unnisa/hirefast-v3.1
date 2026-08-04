# HireFast REST API Architecture

Version: **1.0.0**  
Base URL: **`/api/v1`**  
Style: REST · Stateless · JWT + RBAC  
Status: **Contract only** (no controllers / services / business logic)

Related:

- Master Context & Engineering Standards
- Database Architecture (`docs/database/`)
- OpenAPI: `docs/api/openapi.yaml`
- Endpoint Catalog: `docs/api/ENDPOINT_CATALOG.md`
- Auth Matrix: `docs/api/AUTH_MATRIX.md`
- Cross-cutting Standards: `docs/api/STANDARDS.md`
- Review: `docs/api/REVIEW.md`

---

## Phase 1 — API Module Analysis

### Why modules exist

| Module                | Purpose                                                                      | Primary DB resources                                                                                      |
| --------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Auth**              | Google OAuth entry, token lifecycle, session probe, current user             | `users`, `auth_identities` (tokens in Redis, not Postgres)                                                |
| **Users / Profiles**  | Registration completion, profile CRUD, preferences, avatar/resume metadata   | `users`, `user_profiles`, `files`, `notification_preferences`                                             |
| **Assessments**       | Catalog, start/resume, questions, autosave, submit, history                  | `assessments`, `questions`, `question_options`, `assessment_attempts`, `attempt_responses`                |
| **Evaluation**        | Status of backend eval, JRS, AI reports, skill scores, recommendations       | `attempt_evaluations`, `job_readiness_scores`, `ai_evaluations`, `ai_reports`, `learning_recommendations` |
| **Dashboard**         | Aggregated candidate home (summary only — no business calc here in contract) | reads across attempts, JRS, gamification, profile                                                         |
| **Gamification**      | XP, levels, badges, streak, future leaderboard                               | `user_gamification`, `xp_transactions`, `user_badges`, `levels`, `badges`                                 |
| **Premium / Billing** | Plan status, feature gates, premium catalog                                  | `subscription_plans`, `user_subscriptions`, `plan_features`                                               |
| **Notifications**     | Inbox, read state, preferences                                               | `notifications`, `notification_preferences`                                                               |
| **Files**             | Presigned/metadata upload contracts for avatar, resume, attachments          | `files` (+ R2)                                                                                            |
| **Admin**             | Candidates, question bank, assessments, settings, analytics, audit, HR       | admin-scoped views of most tables                                                                         |
| **HR Review**         | Review queue & decisions on attempts/reports                                 | `hr_reviews`                                                                                              |
| **Analytics**         | Admin metrics & event ingestion (lightweight)                                | `analytics_events`                                                                                        |
| **Platform Settings** | Public + admin configuration                                                 | `platform_settings`                                                                                       |
| **Health**            | Liveness / dependency status (already founded)                               | N/A                                                                                                       |

### Resource relationships (API view)

```
Auth ──► User (me) ──► Profile / Preferences / Files
                 │
                 ├──► AssessmentAttempts ──► Responses
                 │              │
                 │              ├──► Evaluation / JRS / AI Reports
                 │              └──► HR Reviews (admin)
                 │
                 ├──► Dashboard (aggregate read)
                 ├──► Gamification
                 ├──► Subscriptions / Premium
                 └──► Notifications

Admin ──► Users, Assessments, Questions, Reports, Settings, Audit, Analytics, HR
```

### Authentication requirements (module level)

| Module                                              | Default posture                                        |
| --------------------------------------------------- | ------------------------------------------------------ |
| Auth (login/callback)                               | Public                                                 |
| Auth (refresh/logout/me)                            | Authenticated                                          |
| Profiles / Dashboard / Gamification / Notifications | Authenticated (role-gated)                             |
| Assessments (catalog free)                          | Authenticated Guest+                                   |
| Assessments (premium)                               | Authenticated `USER` + active `PREMIUM` subscription   |
| Evaluation results                                  | Authenticated; **locked** for incomplete Guest profile |
| Admin / Audit / Settings write / HR                 | Admin                                                  |
| Health / public settings subset                     | Public                                                 |

---

## Phase 2 — Resource Map

```
                    ┌─────────────┐
                    │    Auth     │
                    └──────┬──────┘
                           │ issues access + refresh
                           ▼
                    ┌─────────────┐
                    │    Users    │◄──── Admin user mgmt
                    │  /me /:id   │
                    └──────┬──────┘
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
      ┌─────────┐   ┌────────────┐   ┌─────────────┐
      │ Profile │   │Subscriptio │   │Gamification │
      └────┬────┘   │    ns      │   └──────┬──────┘
           │        └─────┬──────┘          │
           │              │                 │
           ▼              ▼                 ▼
      ┌─────────┐   ┌────────────┐   ┌─────────────┐
      │  Files  │   │  Premium   │   │  Dashboard  │
      └─────────┘   │  Features  │   └──────┬──────┘
                    └────────────┘          │
                                            │ aggregates
           ┌────────────────────────────────┘
           ▼
    ┌──────────────┐     start/submit      ┌──────────────┐
    │ Assessments  │──────────────────────►│   Attempts   │
    │  Categories  │                        └──────┬───────┘
    │  Questions   │◄── admin CRUD                 │
    └──────────────┘                               │
                           ┌───────────────────────┼────────────────┐
                           ▼                       ▼                ▼
                    ┌─────────────┐         ┌────────────┐   ┌────────────┐
                    │ Evaluation  │         │ AI Reports │   │ HR Reviews │
                    │ + JRS       │         └────────────┘   └────────────┘
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │Learning Recs│
                    └─────────────┘

    Notifications ◄── system events
    Analytics     ◄── client + server events (admin read)
    Settings      ◄── public read / admin write
    Audit Logs    ◄── admin read
```

### Interaction rules

1. **Attempt** is the transactional API root for submit → evaluate → JRS → report → XP.
2. **Guest** may start the General Communication assessment; result payloads return `resultsLocked: true` until profile completion.
3. **Premium** gates are enforced via **subscription middleware** (`requirePlan` / `requireFeature`) on resources tagged `accessTier: PREMIUM` and premium report endpoints — never via RBAC role.
4. **Admin** never relies on frontend checks; every admin route requires `ADMIN`.
5. AI endpoints expose **status + results**, never couple clients to provider internals.

---

## Contract stability goals

Frontend and backend may implement against:

1. This document set
2. `docs/api/openapi.yaml` (design-time architecture contract)
3. Shared TypeScript contracts in `@hirefast/shared-types` (`api/*`)

Runtime Swagger at `/docs` reflects **implemented** routes only — see `CONTRACT_VS_RUNTIME.md`.

Changes to paths, envelopes, or auth requirements require a version bump or explicit deprecation (see `STANDARDS.md`).
