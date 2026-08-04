# HireFast Database Architecture

Version: 1.0  
Scope: Complete PostgreSQL / Prisma schema design (no business logic)

---

## Phase 1 — Entity Analysis

### Design goals

- Support every HireFast module (auth → assessments → evaluation → JRS → gamification → premium → admin) without feature-by-feature redesign.
- Stay in **3NF**: one fact per place; junction tables for M:N; lookup tables for controlled vocabularies.
- Keep **deterministic scoring (JRS / backend evaluation)** physically separate from **AI evaluation / reports**.
- Prefer **extensible lookups** (roles, permissions, plans, categories, skills) over hard-coded enums alone — enums constrain known states; tables allow growth.
- Soft-delete only where recovery or audit of “removed but historically referenced” entities matters.

### Core entities

| Entity                     | Why it exists                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **User**                   | Platform identity for Guest / Freemium / Premium / Admin. Google OAuth subject is attached; no passwords stored. |
| **Role**                   | Extensible RBAC identity (not hard-wired to four values only).                                                   |
| **Permission**             | Fine-grained authorization units; Admin portal + future APIs.                                                    |
| **RolePermission**         | M:N junction — roles compose permissions without duplication.                                                    |
| **UserProfile**            | 1:1 registration/profile data; Guest results stay locked until profile is complete.                              |
| **AuthIdentity**           | External IdP linkage (Google today; more providers later) without storing OAuth secrets.                         |
| **AssessmentCategory**     | Lookup for grouping assessments (e.g. Communication).                                                            |
| **Skill**                  | Canonical skill taxonomy used by assessments and JRS breakdown.                                                  |
| **Assessment**             | Assessment definition (config, access tier, category).                                                           |
| **AssessmentSkill**        | M:N — which skills an assessment measures.                                                                       |
| **Question**               | Assessment content unit.                                                                                         |
| **QuestionOption**         | Options for choice-based questions.                                                                              |
| **AssessmentAttempt**      | One candidate run of an assessment (transactional root for submit → evaluate → JRS → XP).                        |
| **AttemptResponse**        | Candidate answers per question.                                                                                  |
| **AttemptEvaluation**      | Deterministic backend scoring result for an attempt.                                                             |
| **EvaluationSkillScore**   | Deterministic per-skill scores (feeds JRS).                                                                      |
| **AiEvaluation**           | Qualitative AI analysis — never authoritative for numeric JRS.                                                   |
| **JobReadinessScore**      | Authoritative JRS snapshot (backend-controlled).                                                                 |
| **JrsSkillScore**          | JRS skill breakdown.                                                                                             |
| **AiReport**               | AI report container for an attempt / user.                                                                       |
| **AiReportSection**        | Structured report sections (summary, strengths, weaknesses, recommendations).                                    |
| **Level**                  | Gamification level ladder.                                                                                       |
| **Badge**                  | Badge definitions.                                                                                               |
| **XpRule**                 | Configurable XP awards by event type.                                                                            |
| **UserGamification**       | 1:1 aggregate XP / level / streak state (fast dashboard reads).                                                  |
| **XpTransaction**          | Append-only XP ledger (audit + recomputation).                                                                   |
| **UserBadge**              | Earned badges.                                                                                                   |
| **SubscriptionPlan**       | Freemium / Premium (+ future plans).                                                                             |
| **PlanFeature**            | Features enabled per plan.                                                                                       |
| **UserSubscription**       | Commercial subscription state (orthogonal to role; sync is app logic).                                           |
| **LearningRecommendation** | Personalized improvement suggestions.                                                                            |
| **Notification**           | In-app (and channel-ready) notifications.                                                                        |
| **NotificationPreference** | Per-user channel preferences.                                                                                    |
| **FileObject**             | Object-storage metadata only (R2/S3 keys — never blobs in Postgres).                                             |
| **HrReview**               | Admin/HR review workflow over attempts/reports.                                                                  |
| **AuditLog**               | Security / compliance trail (no secrets).                                                                        |
| **PlatformSetting**        | Key/value platform configuration.                                                                                |
| **AnalyticsEvent**         | Lightweight product analytics events for dashboards.                                                             |

### Supporting / junction / lookup

- **Lookups:** `roles`, `permissions`, `assessment_categories`, `skills`, `levels`, `badges`, `xp_rules`, `subscription_plans`, `plan_features`, `platform_settings`
- **Junctions:** `role_permissions`, `assessment_skills`, `user_badges`
- **Ledger / history:** `xp_transactions`, `analytics_events`, `audit_logs`

### Explicitly excluded from tables

| Not stored                  | Where it lives               |
| --------------------------- | ---------------------------- |
| Passwords                   | N/A (Google OAuth only)      |
| Raw JWT / refresh tokens    | Redis / memory; not Postgres |
| OpenAI / R2 / OAuth secrets | Environment / secret manager |
| Uploaded file bytes         | Cloudflare R2 / S3           |

### Future expansion points (no redesign required)

| Future capability                                | How schema accommodates it                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| New assessments / question types                 | `assessments`, `questions.questionType` enum + optional metadata                 |
| New skills                                       | `skills` table                                                                   |
| Multiple AI providers                            | `ai_evaluations.provider` / `ai_reports.provider` strings; secrets stay in env   |
| Extra premium plans                              | `subscription_plans` + `plan_features`                                           |
| Organizations / recruiters                       | Add `organizations`, `organization_members` later; `users` remains identity root |
| Job applications / interviews / learning modules | New modules FK to `users` / `skills` / `assessments`                             |
| Interview modules                                | New tables referencing `users` and optionally `job_readiness_scores`             |

---

## Phase 2 — Entity Relationship Model

### Cardinality summary

```
Role 1───* User
Role *───* Permission          (via RolePermission)
User 1───1 UserProfile
User 1───* AuthIdentity
User 1───1 UserGamification
User 1───* UserSubscription
User 1───* Notification
User 1───1 NotificationPreference
User 1───* FileObject
User 1───* AssessmentAttempt
User 1───* JobReadinessScore
User 1───* XpTransaction
User 1───* UserBadge
User 1───* LearningRecommendation
User 1───* AuditLog (actor)
User 1───* HrReview (reviewer, nullable)

AssessmentCategory 1───* Assessment
Assessment *───* Skill          (via AssessmentSkill)
Assessment 1───* Question
Question 1───* QuestionOption
Assessment 1───* AssessmentAttempt

AssessmentAttempt 1───* AttemptResponse
AttemptResponse *───1 Question
AssessmentAttempt 1───0..1 AttemptEvaluation
AttemptEvaluation 1───* EvaluationSkillScore
AssessmentAttempt 1───0..1 AiEvaluation
AssessmentAttempt 1───0..1 JobReadinessScore
JobReadinessScore 1───* JrsSkillScore
AssessmentAttempt 1───* AiReport
AiReport 1───* AiReportSection
AssessmentAttempt 1───* HrReview

SubscriptionPlan 1───* PlanFeature
SubscriptionPlan 1───* UserSubscription
Level 1───* UserGamification
Badge 1───* UserBadge
XpRule (config; referenced logically by code via eventKey)
```

### Text ERD

```
[roles] 1──* [users] 1──1 [user_profiles]
   │            │
   │            ├──1──* [auth_identities]
   │            ├──1──1 [user_gamification] *──1 [levels]
   │            ├──1──* [user_subscriptions] *──1 [subscription_plans] 1──* [plan_features]
   │            ├──1──* [notifications]
   │            ├──1──1 [notification_preferences]
   │            ├──1──* [files]
   │            ├──1──* [xp_transactions]
   │            ├──1──* [user_badges] *──1 [badges]
   │            ├──1──* [learning_recommendations]
   │            ├──1──* [assessment_attempts]
   │            └──1──* [audit_logs]
   │
   └──*──* [permissions]  (role_permissions)

[assessment_categories] 1──* [assessments] *──* [skills]  (assessment_skills)
                              │
                              ├──1──* [questions] 1──* [question_options]
                              └──1──* [assessment_attempts]
                                         │
                                         ├──1──* [attempt_responses]
                                         ├──1──0..1 [attempt_evaluations] 1──* [evaluation_skill_scores]
                                         ├──1──0..1 [ai_evaluations]
                                         ├──1──0..1 [job_readiness_scores] 1──* [jrs_skill_scores]
                                         ├──1──* [ai_reports] 1──* [ai_report_sections]
                                         └──1──* [hr_reviews]

[xp_rules] [platform_settings] [analytics_events] [badges] [levels]
```

### Per-entity keys (abbreviated)

| Entity            | PK  | Major FKs                          |
| ----------------- | --- | ---------------------------------- |
| User              | id  | roleId                             |
| UserProfile       | id  | userId (unique)                    |
| AuthIdentity      | id  | userId                             |
| Assessment        | id  | categoryId                         |
| Question          | id  | assessmentId                       |
| QuestionOption    | id  | questionId                         |
| AssessmentAttempt | id  | userId, assessmentId               |
| AttemptResponse   | id  | attemptId, questionId; optionId?   |
| AttemptEvaluation | id  | attemptId (unique)                 |
| AiEvaluation      | id  | attemptId (unique)                 |
| JobReadinessScore | id  | userId, attemptId (unique attempt) |
| AiReport          | id  | userId, attemptId?                 |
| UserGamification  | id  | userId (unique), levelId           |
| UserSubscription  | id  | userId, planId                     |
| HrReview          | id  | attemptId, reviewerId?             |
| FileObject        | id  | uploadedById?                      |
| AuditLog          | id  | actorId?                           |

---

## Phase 3 — Relational Schema Highlights

### Conventions

| Concern        | Decision                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| PKs            | UUID (`gen_random_uuid()` / Prisma `@default(uuid())`)                                    |
| Timestamps     | `createdAt`, `updatedAt` on every table                                                   |
| Soft delete    | `deletedAt` on: users, assessments, questions, files, learning_recommendations            |
| Table names    | plural snake_case via `@@map`                                                             |
| Column names   | Prisma camelCase; DB snake_case via `@map` (SQL-friendly, matches foundation)             |
| Money / scores | `Decimal` for scores; integers for XP                                                     |
| JSON           | Only for sparse extensibility (`metadata`, settings value payload) — not primary modeling |

### Important design decisions

1. **Role + Subscription coexistence** — RBAC uses `roles`; commercial state uses `user_subscriptions`. Prevents billing fields from polluting identity and allows multiple future plans.
2. **Deterministic vs AI split** — `attempt_evaluations` / `job_readiness_scores` are authoritative numerics; `ai_evaluations` / `ai_reports` are qualitative and independently fail/retry.
3. **Attempt as transactional root** — Submit, evaluate, JRS, report, XP, badge unlocks all hang off `assessment_attempts`, enabling single-attempt consistency.
4. **Gamification aggregate + ledger** — `user_gamification` for O(1) dashboard; `xp_transactions` for audit/recompute.
5. **Guest lock modeling** — `user_profiles.isComplete` + role `GUEST`; reports/JRS rows can exist but app gates visibility (no duplicate “locked copy” tables).
6. **Files** — metadata only (`bucket`, `objectKey`, `mimeType`, `sizeBytes`); bytes in R2.
7. **Audit logs** — append-oriented; no `updatedAt` mutation semantics beyond Prisma default; no secret payloads.
8. **Cascade policy** — Restrict on identity-critical FKs; Cascade only for owned children (options → question, sections → report). Soft-deleted parents keep history.

### Index strategy (why)

| Index                                                                  | Purpose                 |
| ---------------------------------------------------------------------- | ----------------------- |
| `users.email` unique                                                   | Auth lookup / login     |
| `users.google` via `auth_identities(provider, providerSubject)` unique | Google sign-in          |
| `users.roleId`                                                         | RBAC joins              |
| `assessments(categoryId, status, accessTier)`                          | Catalog / search        |
| `assessments.slug` unique                                              | Stable URLs             |
| `questions(assessmentId, sortOrder)`                                   | Ordered retrieval       |
| `assessment_attempts(userId, createdAt)`                               | History / dashboard     |
| `assessment_attempts(assessmentId, status)`                            | Admin analytics         |
| `assessment_attempts(userId, assessmentId)`                            | Latest attempt queries  |
| `job_readiness_scores(userId, calculatedAt)`                           | Dashboard JRS           |
| `ai_reports(userId, status)`                                           | Report list             |
| `notifications(userId, isRead, createdAt)`                             | Inbox                   |
| `audit_logs(actorId, createdAt)` / `(resourceType, resourceId)`        | Security investigations |
| `analytics_events(eventName, createdAt)` / `(userId, createdAt)`       | Analytics               |
| `hr_reviews(status, createdAt)`                                        | HR queue                |
| `files(objectKey)` unique                                              | Storage idempotency     |

### Constraint strategy

- **FK** everywhere relationships exist.
- **UNIQUE** on natural keys: email, role.name, permission.code, assessment.slug, skill.code, badge.code, plan.code, setting.key, auth identity (provider+subject), attemptId on 1:1 evaluation/JRS/AI eval.
- **CHECK** (via Prisma comments + DB checks in migration where critical): non-negative XP, score ranges 0–100 where applicable, streak ≥ 0.
- **ON DELETE**
  - Cascade: question_options → question; report_sections → report; role_permissions children; assessment_skills; evaluation/jrs child scores
  - Restrict: user ← attempts (preserve history); assessment ← attempts
  - SetNull: optional reviewer, optional file uploader on user delete after soft-delete purge

### Transactional workflows supported

| Workflow              | Tables touched together                                          |
| --------------------- | ---------------------------------------------------------------- |
| Assessment submission | `assessment_attempts`, `attempt_responses`                       |
| Backend evaluation    | `attempt_evaluations`, `evaluation_skill_scores`, attempt status |
| JRS generation        | `job_readiness_scores`, `jrs_skill_scores`                       |
| AI report generation  | `ai_evaluations`, `ai_reports`, `ai_report_sections`             |
| XP awarding           | `xp_transactions`, `user_gamification` (± level)                 |
| Badge unlocking       | `user_badges`                                                    |
| Premium upgrade       | `user_subscriptions` (+ role update in app transaction)          |

---

## Phase 4 — Review & Refactor Notes

### Removed / avoided duplicates

- No separate `candidates` table — candidates are `users` + `user_profiles`.
- No `passwords` / `tokens` tables — OAuth + Redis sessions.
- No dual “score” tables mixing AI + deterministic — explicitly split.
- `SchemaMeta` replaced by `platform_settings` (seed migrates conceptually).

### Performance notes

- Dashboard hot path: `user_gamification` + latest `job_readiness_scores` by `(userId, calculatedAt desc)` — avoid aggregating XP ledger on read.
- Assessment player: questions + options by `assessmentId` with `sortOrder`.
- Admin candidate search: index `users.email`, `user_profiles` name fields.

### Known future limitations (accepted)

- Multi-tenant organizations not modeled yet — add later without changing `users` PK.
- Recruiter job applications not modeled — new module.
- No partitioned analytics yet — `analytics_events` can be partitioned by time later.

### Validation checklist

- [x] No duplicate entities for same concept
- [x] No circular FK dependencies (directed acyclic ownership)
- [x] Soft deletes limited and intentional
- [x] Secrets out of schema
- [x] JRS deterministic path isolated from AI
- [x] Extensible roles/plans/skills/categories

---

## Phase 5–7

Implemented in:

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `apps/backend/prisma/seed.ts` (+ seed modules)

See also: `docs/database/erd.txt` for a compact ERD.
