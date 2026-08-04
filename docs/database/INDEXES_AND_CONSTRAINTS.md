# Index & Constraint Strategy

## Indexes (by workload)

### Authentication

| Index                                                | Why                             |
| ---------------------------------------------------- | ------------------------------- |
| `users.email` UNIQUE                                 | Login / account lookup          |
| `auth_identities(provider, provider_subject)` UNIQUE | Google OAuth subject resolution |
| `users.role_id`                                      | Authorization joins             |
| `users.status`                                       | Admin filters                   |

### Candidate / admin search

| Index                                  | Why              |
| -------------------------------------- | ---------------- |
| `user_profiles(last_name, first_name)` | Candidate search |
| `users.created_at`                     | Admin listing    |

### Assessments & attempts

| Index                                                                | Why                         |
| -------------------------------------------------------------------- | --------------------------- |
| `assessments(category_id, status, access_tier)`                      | Catalog filters             |
| `assessments.slug` UNIQUE                                            | Public URLs                 |
| `questions(assessment_id, sort_order)`                               | Player load                 |
| `assessment_attempts(user_id, created_at)`                           | History / dashboard         |
| `assessment_attempts(assessment_id, status)`                         | Admin analytics             |
| `assessment_attempts(user_id, assessment_id, attempt_number)` UNIQUE | Attempt numbering integrity |

### Reports / JRS / dashboard

| Index                                          | Why                  |
| ---------------------------------------------- | -------------------- |
| `job_readiness_scores(user_id, calculated_at)` | Latest JRS           |
| `ai_reports(user_id, status)`                  | Report inbox         |
| `user_gamification.user_id` UNIQUE             | O(1) XP/level/streak |
| `notifications(user_id, is_read, created_at)`  | Notification feed    |

### HR / audit / analytics

| Index                                      | Why                    |
| ------------------------------------------ | ---------------------- |
| `hr_reviews(status, created_at)`           | Review queue           |
| `audit_logs(actor_id, created_at)`         | Actor timeline         |
| `audit_logs(resource_type, resource_id)`   | Resource investigation |
| `analytics_events(event_name, created_at)` | Funnel queries         |

## CHECK constraints

Applied in migration `20260804075500_hirefast_check_constraints`:

- JRS / evaluation percentages in `[0, 100]`
- Non-negative XP, streaks, badge rewards, plan prices, file sizes
- Level `max_xp >= min_xp` when present
- `attempt_number >= 1`

## Unique constraints (selected)

- Role name, permission code, assessment code/slug, skill code, badge code, plan code, setting key
- One evaluation / AI evaluation / JRS row per attempt
- One response per (attempt, question)
- One badge award per (user, badge)
