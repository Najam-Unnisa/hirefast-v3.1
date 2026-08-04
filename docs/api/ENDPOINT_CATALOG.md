# HireFast API Endpoint Catalog

Base: `/api/v1`  
All success/error bodies use the standard envelope (`docs/api/STANDARDS.md`).  
Auth column uses roles that may call the endpoint (in addition to authentication requirement).

Abbreviations: **Auth** = authentication required · **Roles** = allowed roles · **Page** = supports pagination

---

## Health

| Method | Path             | Purpose                 | Auth | Roles  |
| ------ | ---------------- | ----------------------- | ---- | ------ |
| GET    | `/health`        | API + DB + Redis status | No   | Public |
| GET    | `/api/v1/health` | Same (versioned)        | No   | Public |

**Response `data`:** `{ status, timestamp, environment, services, version }`

---

## Phase 4 — Authentication

| Method | Path                    | Purpose                                                      | Auth | Roles                |
| ------ | ----------------------- | ------------------------------------------------------------ | ---- | -------------------- |
| POST   | `/auth/google`          | Start Google login; returns `{ authorizationUrl, state }`    | No   | Public               |
| GET    | `/auth/google/callback` | OAuth callback; issues tokens (redirect or JSON by `Accept`) | No   | Public               |
| POST   | `/auth/refresh`         | Rotate tokens                                                | No*  | Refresh token holder |
| POST   | `/auth/logout`          | Invalidate refresh session                                   | Yes  | Any authenticated    |
| GET    | `/auth/me`              | Current user + role + profile completeness                   | Yes  | Any                  |
| GET    | `/auth/session`         | Validate access token; return `{ valid, expiresAt, role }`   | Yes  | Any                  |
| GET    | `/auth/rbac`            | Effective permissions for current user                       | Yes  | Any                  |

### Contracts

**POST `/auth/google`**

- Body: `{ "redirectUri"?: string }`
- `201/200` data: `{ authorizationUrl, state }`

**POST `/auth/refresh`**

- Body: `{ "refreshToken": string }`
- `200` data: `{ accessToken, refreshToken, expiresIn, tokenType }`
- Errors: `401` invalid/expired refresh

**GET `/auth/me`**

- `200` data: `{ id, email, role, status, emailVerified, profile: { isComplete, displayName, avatarUrl? }, subscription?: { planCode, status } }`

**Errors:** `401`, `422`, `429`

---

## Phase 5 — Users & Profiles

| Method | Path                         | Purpose                                       | Auth | Roles             | Notes                          |
| ------ | ---------------------------- | --------------------------------------------- | ---- | ----------------- | ------------------------------ |
| GET    | `/users/me`                  | Alias of auth me (user resource)              | Yes  | Any               |                                |
| GET    | `/users/me/profile`          | Full profile                                  | Yes  | Any               |                                |
| PUT    | `/users/me/profile`          | Replace profile fields                        | Yes  | Any               |                                |
| PATCH  | `/users/me/profile`          | Partial update                                | Yes  | Any               |                                |
| POST   | `/users/me/profile/complete` | Mark registration complete → USER + FREE plan | Yes  | GUEST (primarily) | Idempotent if already complete |
| GET    | `/users/me/preferences`      | Notification + locale prefs                   | Yes  | Any               |                                |
| PATCH  | `/users/me/preferences`      | Update prefs                                  | Yes  | Any               |                                |
| GET    | `/users/me/resume`           | Resume file metadata                          | Yes  | USER, ADMIN       |                                |
| PUT    | `/users/me/resume`           | Attach resume via `fileId`                    | Yes  | USER, ADMIN       |                                |
| GET    | `/users/me/avatar`           | Avatar metadata                               | Yes  | Any               |                                |
| PUT    | `/users/me/avatar`           | Attach avatar via `fileId`                    | Yes  | Any               |                                |

### Validation (profile)

- `firstName`, `lastName`: 1–100 chars when completing
- `phone`: E.164 optional
- `locale`: BCP-47 optional
- `countryCode`: ISO-3166-1 alpha-2 optional
- Completion requires required fields (documented in OpenAPI)

**Errors:** `401`, `403`, `422`, `409` (invalid file purpose)

---

## Files

| Method | Path             | Purpose                             | Auth | Roles          |
| ------ | ---------------- | ----------------------------------- | ---- | -------------- |
| POST   | `/files/uploads` | Request upload slot / direct upload | Yes  | Any            |
| GET    | `/files/:fileId` | Metadata for own file (or admin)    | Yes  | Owner or ADMIN |
| DELETE | `/files/:fileId` | Soft-delete metadata                | Yes  | Owner or ADMIN |

**POST `/files/uploads`**

- `Content-Type: multipart/form-data` **or** JSON initiate + client PUT to R2 (implementation choice; contract supports both modes via `mode: "multipart" | "presign"`)
- Body (JSON initiate): `{ purpose: "AVATAR"|"ASSESSMENT_MEDIA"|"RESPONSE_ATTACHMENT"|"REPORT_ASSET"|"OTHER", fileName, mimeType, sizeBytes }`
- `201` data: `{ fileId, upload: { url?, fields? }, objectKey }`
- Limits: see STANDARDS; images ≤ 5MB; PDF resume ≤ 10MB

---

## Phase 6 — Assessments

### Categories & catalog

| Method | Path                         | Purpose                      | Auth | Roles       | Page |
| ------ | ---------------------------- | ---------------------------- | ---- | ----------- | ---- |
| GET    | `/assessment-categories`     | List active categories       | Yes  | Any         | No   |
| GET    | `/assessments`               | Catalog (filtered by access) | Yes  | Any         | Yes  |
| GET    | `/assessments/:assessmentId` | Detail by UUID               | Yes  | Role + tier | No   |
| GET    | `/assessments/slug/:slug`    | Detail by slug               | Yes  | Role + tier | No   |

**Filters:** `status=PUBLISHED` (default for non-admin), `accessTier`, `categoryId`, `q`  
**Sort:** `createdAt`, `title`

Premium assessments: callers without an active `PREMIUM` subscription receive `403 SUBSCRIPTION_REQUIRED` on detail/start (RBAC role is not used for this gate).

### Attempts lifecycle

| Method | Path                                         | Purpose                                            | Auth | Roles         |
| ------ | -------------------------------------------- | -------------------------------------------------- | ---- | ------------- |
| POST   | `/assessments/:assessmentId/attempts`        | Start attempt                                      | Yes  | Tier-eligible |
| GET    | `/attempts/me`                               | Assessment history                                 | Yes  | Any           | Page |
| GET    | `/attempts/:attemptId`                       | Attempt status + summary                           | Yes  | Owner/ADMIN   |
| GET    | `/attempts/:attemptId/questions`             | Questions for player (options without `isCorrect`) | Yes  | Owner/ADMIN   |
| PATCH  | `/attempts/:attemptId/responses`             | Autosave one/many responses                        | Yes  | Owner         |
| PUT    | `/attempts/:attemptId/responses/:questionId` | Upsert single response                             | Yes  | Owner         |
| POST   | `/attempts/:attemptId/submit`                | Complete submission                                | Yes  | Owner         |
| GET    | `/attempts/:attemptId/status`                | Lightweight status poll                            | Yes  | Owner/ADMIN   |

**Start attempt**

- Body: optional `{ resumeIfInProgress?: boolean }` default true
- `201` data: `{ attemptId, assessmentId, attemptNumber, status, startedAt, resultsLocked }`
- Errors: `403` tier; `409` max attempts

**Autosave / responses**

- Body: `{ responses: [{ questionId, selectedOptionId?, textAnswer?, numericAnswer?, fileId?, rawPayload? }] }`
- Only while `IN_PROGRESS`
- `200` data: `{ savedCount, attemptId }`

**Submit**

- Idempotent with `X-Idempotency-Key`
- Transitions to `SUBMITTED` → async evaluation
- `200` data: `{ attemptId, status, submittedAt, resultsLocked }`
- Errors: `409` already submitted

**History filters:** `status`, `assessmentId`, `from`, `to` · **Sort:** `createdAt`, `submittedAt`

---

## Phase 7 — Evaluation / JRS / Reports / Recommendations

| Method | Path                                                  | Purpose                                | Auth | Roles              |
| ------ | ----------------------------------------------------- | -------------------------------------- | ---- | ------------------ |
| POST   | `/attempts/:attemptId/evaluation`                     | Trigger/re-queue backend evaluation    | Yes  | Owner/ADMIN        |
| GET    | `/attempts/:attemptId/evaluation`                     | Deterministic evaluation status/result | Yes  | Owner/ADMIN 🔒     |
| GET    | `/attempts/:attemptId/evaluation/skills`              | Skill scores                           | Yes  | Owner/ADMIN 🔒     |
| GET    | `/attempts/:attemptId/jrs`                            | Job Readiness Score                    | Yes  | Owner/ADMIN 🔒     |
| GET    | `/users/me/jrs/latest`                                | Latest JRS for dashboard               | Yes  | USER, ADMIN 🔒     |
| GET    | `/attempts/:attemptId/ai-evaluation`                  | AI qualitative evaluation              | Yes  | Owner/ADMIN 🔒     |
| GET    | `/attempts/:attemptId/reports`                        | List AI reports for attempt            | Yes  | Owner/ADMIN 🔒     |
| GET    | `/reports/:reportId`                                  | Report detail + sections               | Yes  | Owner/ADMIN 🔒     |
| POST   | `/attempts/:attemptId/reports`                        | Request report generation              | Yes  | Owner/ADMIN 🔒     |
| GET    | `/users/me/reports`                                   | Report history                         | Yes  | Any 🔒             | Page |
| GET    | `/users/me/recommendations`                           | Learning recommendations               | Yes  | USER + sub PREMIUM | Page |
| PATCH  | `/users/me/recommendations/:recommendationId/dismiss` | Dismiss recommendation                 | Yes  | USER + sub PREMIUM |

🔒 Guest / incomplete profile → `403 RESULTS_LOCKED` for score/report bodies.

**Evaluation status values:** `PENDING | PROCESSING | COMPLETED | FAILED`  
**While pending:** `200` with `{ status }` (not 404).

**JRS `data`:** `{ overallScore, band, version, calculatedAt, skillScores: [{ skillId, skillCode, skillName, score, weight }] }`

**Report `data`:** `{ id, title, status, summary, sections: [{ sectionKey, title, content, sortOrder }], generatedAt }`

---

## Phase 8 — Dashboard

| Method | Path                     | Purpose                          | Auth | Roles |
| ------ | ------------------------ | -------------------------------- | ---- | ----- |
| GET    | `/dashboard/me`          | Full dashboard summary aggregate | Yes  | Any   |
| GET    | `/dashboard/me/activity` | Recent activity feed             | Yes  | Any   | Page |
| GET    | `/dashboard/me/progress` | Assessment progress              | Yes  | Any   |
| GET    | `/dashboard/me/stats`    | Statistics counters              | Yes  | Any   |

**`GET /dashboard/me` data shape:**

```json
{
  "profile": { "isComplete": true, "displayName": "..." },
  "jrs": { "overallScore": 0, "band": "...", "calculatedAt": "..." },
  "assessments": { "completed": 0, "inProgress": 0, "available": 0 },
  "latestAttempt": { "attemptId": "...", "assessmentTitle": "...", "status": "..." },
  "gamification": {
    "totalXp": 0,
    "level": { "levelNumber": 1, "name": "Starter" },
    "currentStreak": 0,
    "badgesEarned": 0
  },
  "subscription": { "planCode": "FREE", "status": "ACTIVE" },
  "resultsLocked": false
}
```

Single round-trip for candidate home; clients may also call sub-resources.

---

## Phase 9 — Gamification

| Method | Path                        | Purpose                   | Auth | Roles | Page |
| ------ | --------------------------- | ------------------------- | ---- | ----- | ---- |
| GET    | `/gamification/me`          | XP, level, streak summary | Yes  | Any   | No   |
| GET    | `/gamification/me/xp`       | XP ledger                 | Yes  | Any   | Yes  |
| GET    | `/gamification/me/badges`   | Earned badges             | Yes  | Any   | Yes  |
| GET    | `/gamification/badges`      | Badge catalog             | Yes  | Any   | No   |
| GET    | `/gamification/levels`      | Level ladder              | Yes  | Any   | No   |
| GET    | `/gamification/me/streak`   | Streak detail             | Yes  | Any   | No   |
| GET    | `/gamification/leaderboard` | Future-ready leaderboard  | Yes  | Any   | Yes  |

**Leaderboard:** documented now; may return `501` or empty `items` until feature flag `gamification.leaderboard_enabled` is true — prefer **`200` empty + `meta.featureEnabled: false`** for contract stability.

---

## Phase 10 — Admin

All routes under `/admin/**` require **Auth + ADMIN**.

### Candidates / users

| Method | Path                            | Purpose            | Page |
| ------ | ------------------------------- | ------------------ | ---- |
| GET    | `/admin/users`                  | List users         | Yes  |
| GET    | `/admin/users/:userId`          | User detail        | No   |
| PATCH  | `/admin/users/:userId`          | Update status/role | No   |
| GET    | `/admin/users/:userId/attempts` | User attempts      | Yes  |
| GET    | `/admin/users/:userId/reports`  | User reports       | Yes  |

Filters: `q`, `status`, `role`, `from`, `to` · Sort: `createdAt`, `email`

### Assessments / questions / templates

| Method | Path                                         | Purpose              | Page |
| ------ | -------------------------------------------- | -------------------- | ---- |
| GET    | `/admin/assessments`                         | Manage assessments   | Yes  |
| POST   | `/admin/assessments`                         | Create               | No   |
| GET    | `/admin/assessments/:assessmentId`           | Detail               | No   |
| PUT    | `/admin/assessments/:assessmentId`           | Update               | No   |
| PATCH  | `/admin/assessments/:assessmentId/status`    | Publish/archive      | No   |
| GET    | `/admin/assessments/:assessmentId/questions` | Question bank        | Yes  |
| POST   | `/admin/assessments/:assessmentId/questions` | Add question         | No   |
| PUT    | `/admin/questions/:questionId`               | Update question      | No   |
| DELETE | `/admin/questions/:questionId`               | Soft-delete question | No   |
| POST   | `/admin/questions/:questionId/options`       | Add option           | No   |
| PUT    | `/admin/question-options/:optionId`          | Update option        | No   |
| DELETE | `/admin/question-options/:optionId`          | Delete option        | No   |

### Reports / analytics / settings / audit

| Method | Path                        | Purpose                             | Page |
| ------ | --------------------------- | ----------------------------------- | ---- |
| GET    | `/admin/reports`            | All AI reports                      | Yes  |
| GET    | `/admin/analytics/overview` | KPI overview                        | No   |
| GET    | `/admin/analytics/events`   | Event stream                        | Yes  |
| POST   | `/admin/analytics/events`   | Ingest server-side event (optional) | No   |
| GET    | `/admin/settings`           | All settings                        | No   |
| PUT    | `/admin/settings/:key`      | Upsert setting                      | No   |
| GET    | `/admin/audit-logs`         | Audit trail                         | Yes  |

### HR review

| Method | Path                          | Purpose                  | Page |
| ------ | ----------------------------- | ------------------------ | ---- |
| GET    | `/admin/hr-reviews`           | Review queue             | Yes  |
| GET    | `/admin/hr-reviews/:reviewId` | Detail                   | No   |
| POST   | `/admin/hr-reviews`           | Create review on attempt | No   |
| PATCH  | `/admin/hr-reviews/:reviewId` | Assign / decide          | No   |

Body decide: `{ status, notes? }` with `HrReviewStatus` enum.

---

## Phase 11 — Notifications

| Method | Path                                  | Purpose                     | Auth | Roles | Page |
| ------ | ------------------------------------- | --------------------------- | ---- | ----- | ---- |
| GET    | `/notifications`                      | Inbox                       | Yes  | Any   | Yes  |
| GET    | `/notifications/unread-count`         | Badge count                 | Yes  | Any   | No   |
| PATCH  | `/notifications/:notificationId/read` | Mark one read               | Yes  | Owner | No   |
| POST   | `/notifications/read-all`             | Mark all read               | Yes  | Any   | No   |
| GET    | `/notifications/preferences`          | Alias → user prefs channels | Yes  | Any   | No   |
| PATCH  | `/notifications/preferences`          | Update channels             | Yes  | Any   | No   |

**Future push:** `POST /notifications/device-tokens` reserved; not in v1 active catalog (documented as deferred in OpenAPI `x-hirefast-status: future`).

Filters: `isRead`, `type` · Sort: `createdAt`

---

## Phase 12 — Premium / Subscriptions

Authorization for premium surfaces: **Role `USER` + active `PREMIUM` subscription** (via subscription middleware). Admin manages content under `/admin/**` (role only).

| Method | Path                                 | Purpose                        | Auth | Role | Subscription |
| ------ | ------------------------------------ | ------------------------------ | ---- | ---- | ------------ |
| GET    | `/subscriptions/plans`               | Public plan catalog            | Yes  | Any  | —            |
| GET    | `/subscriptions/me`                  | Current subscription           | Yes  | Any  | —            |
| GET    | `/subscriptions/me/features`         | Effective feature flags        | Yes  | Any  | —            |
| POST   | `/subscriptions/me/validate-feature` | Check one feature key          | Yes  | Any  | —            |
| GET    | `/premium/assessments`               | Premium assessment catalog     | Yes  | USER | PREMIUM      |
| GET    | `/premium/reports`                   | Premium report list            | Yes  | USER | PREMIUM      | Page |
| GET    | `/premium/recommendations`           | Alias of premium learning recs | Yes  | USER | PREMIUM      | Page |

**POST `/subscriptions/me/validate-feature`**

- Body: `{ "featureKey": "assessments.premium" }`
- `200` data: `{ featureKey, allowed: boolean, reason?: "SUBSCRIPTION_REQUIRED" | "OK" }`

Checkout/billing webhooks are **out of scope** for this contract version (future `/billing/**`).

---

## Platform settings (non-admin)

| Method | Path               | Purpose             | Auth | Roles  |
| ------ | ------------------ | ------------------- | ---- | ------ |
| GET    | `/settings/public` | Public settings map | No   | Public |

---

## Common error responses (all modules)

| Status | When                                        |
| ------ | ------------------------------------------- |
| 401    | Missing/invalid access token                |
| 403    | Role / premium / ownership / RESULTS_LOCKED |
| 404    | Unknown id                                  |
| 409    | Illegal state transition                    |
| 422    | Validation                                  |
| 429    | Rate limit                                  |
| 500    | Unexpected                                  |

---

## Endpoint count (v1 active)

Approximately **90+** documented operations across modules (see OpenAPI paths for the normative list).
