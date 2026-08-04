# HireFast Table Catalog

Complete relational inventory for the production Prisma schema.

## Naming

| Layer         | Convention                                         |
| ------------- | -------------------------------------------------- |
| Tables        | plural snake_case (`users`, `assessment_attempts`) |
| Prisma fields | camelCase                                          |
| DB columns    | snake_case via `@map`                              |
| PKs           | `id` UUID                                          |
| FKs           | `<entity>Id` (e.g. `userId`)                       |

## Tables

### Auth & access

| Table              | Purpose                          | Soft delete |
| ------------------ | -------------------------------- | ----------- |
| `roles`            | Extensible RBAC roles            | No          |
| `permissions`      | Permission catalog               | No          |
| `role_permissions` | Role ↔ permission                | No          |
| `users`            | Identity (email, role, status)   | Yes         |
| `user_profiles`    | Registration / profile (1:1)     | No          |
| `auth_identities`  | Google (and future IdP) subjects | No          |

### Assessments

| Table                   | Purpose                    | Soft delete |
| ----------------------- | -------------------------- | ----------- |
| `assessment_categories` | Category lookup            | No          |
| `skills`                | Skill taxonomy             | No          |
| `assessments`           | Assessment definitions     | Yes         |
| `assessment_skills`     | Assessment ↔ skill weights | No          |
| `questions`             | Questions                  | Yes         |
| `question_options`      | Choice options             | No          |
| `assessment_attempts`   | Candidate runs             | No          |
| `attempt_responses`     | Answers                    | No          |

### Evaluation / JRS / AI

| Table                     | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `attempt_evaluations`     | Deterministic backend evaluation (1:1 attempt) |
| `evaluation_skill_scores` | Deterministic skill scores                     |
| `ai_evaluations`          | Qualitative AI analysis (1:1 attempt)          |
| `job_readiness_scores`    | Authoritative JRS                              |
| `jrs_skill_scores`        | JRS skill breakdown                            |
| `ai_reports`              | AI report containers                           |
| `ai_report_sections`      | Report sections                                |

### Gamification & premium

| Table                | Purpose                              |
| -------------------- | ------------------------------------ |
| `levels`             | Level ladder                         |
| `badges`             | Badge definitions                    |
| `xp_rules`           | XP event configuration               |
| `user_gamification`  | Aggregate XP/level/streak (1:1 user) |
| `xp_transactions`    | XP ledger                            |
| `user_badges`        | Earned badges                        |
| `subscription_plans` | Plans                                |
| `plan_features`      | Plan feature flags                   |
| `user_subscriptions` | Subscription periods                 |

### Platform services

| Table                      | Purpose                      | Soft delete |
| -------------------------- | ---------------------------- | ----------- |
| `learning_recommendations` | Personalized recommendations | Yes         |
| `notifications`            | User notifications           | No          |
| `notification_preferences` | Channel prefs (1:1)          | No          |
| `files`                    | R2/S3 object metadata        | Yes         |
| `hr_reviews`               | HR review workflow           | No          |
| `audit_logs`               | Security/audit trail         | No          |
| `platform_settings`        | Key/value settings           | No          |
| `analytics_events`         | Product analytics            | No          |

## Cascade policy (summary)

| Parent → child                                    | On delete                   |
| ------------------------------------------------- | --------------------------- |
| Role → users                                      | Restrict                    |
| User → profile / identities / gamification        | Cascade                     |
| Assessment → questions                            | Restrict (preserve history) |
| Question → options                                | Cascade                     |
| Attempt → responses / evaluations / AI eval / JRS | Cascade                     |
| Report → sections                                 | Cascade                     |
| Plan → features                                   | Cascade                     |
| User → notifications / xp / badges                | Cascade                     |

## Security exclusions

Never stored in these tables: passwords, raw JWTs, API keys, OAuth client secrets, file blobs.
