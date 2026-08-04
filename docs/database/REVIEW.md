# Database Architecture Review

## Completeness

| Module                               | Covered by                                                                |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Authentication                       | `users`, `auth_identities`                                                |
| Roles / Permissions                  | `roles`, `permissions`, `role_permissions`                                |
| Profiles                             | `user_profiles`                                                           |
| Assessments / categories / questions | assessment domain tables                                                  |
| Attempts / responses                 | `assessment_attempts`, `attempt_responses`                                |
| Backend evaluation                   | `attempt_evaluations`, `evaluation_skill_scores`                          |
| AI evaluation                        | `ai_evaluations`                                                          |
| JRS                                  | `job_readiness_scores`, `jrs_skill_scores`                                |
| AI reports                           | `ai_reports`, `ai_report_sections`                                        |
| Gamification                         | levels, badges, xp_rules, user_gamification, xp_transactions, user_badges |
| Premium                              | subscription_plans, plan_features, user_subscriptions                     |
| Learning recommendations             | `learning_recommendations`                                                |
| Notifications                        | `notifications`, `notification_preferences`                               |
| File storage metadata                | `files`                                                                   |
| HR review                            | `hr_reviews`                                                              |
| Audit logs                           | `audit_logs`                                                              |
| Platform settings                    | `platform_settings`                                                       |
| Analytics                            | `analytics_events`                                                        |

## Refactoring decisions applied

1. Dropped foundation-only `schema_meta` in favor of `platform_settings`.
2. Kept role (RBAC) and subscription (billing) separate to avoid conflating authz with commerce.
3. Split deterministic scoring from AI outputs to protect JRS integrity.
4. Used aggregate gamification row + ledger for dashboard performance.
5. Soft deletes limited to recoverable catalog/identity assets.

## Remaining recommendations (future features, not blockers)

1. When organizations land, add `organizations` / `memberships` without changing `users.id`.
2. Consider time-based partitioning for `analytics_events` and `audit_logs` at high volume.
3. If multi-select answers need first-class modeling, introduce `attempt_response_options` rather than overloading JSON.
4. Store refresh-token revocation lists in Redis (already in stack), not Postgres.
5. Add DB-level partial unique index for “one active subscription per user” when billing rules are finalized.

## Migration status

- `20260803151752_init_foundation` — bootstrap marker (superseded)
- `20260804075449_hirefast_core_schema` — full platform schema
- `20260804075500_hirefast_check_constraints` — CHECK constraints

## Seed status

Foundational only: roles, permissions, admin user, settings, categories, skills, badges, XP rules, levels, subscription plans.
