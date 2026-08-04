# Operations Roadmap (Deferred Work)

Architecture-First methodology keeps **foundation quality** separate from **production operations**.

---

## Now (Foundation) — done or in CI

| Item                                                        | Status                    |
| ----------------------------------------------------------- | ------------------------- |
| Structured logging                                          | ✅                        |
| Health checks (`/health`)                                   | ✅                        |
| CI install / build / migrate / typecheck / test / app build | ✅                        |
| CI Prettier + ESLint quality gates                          | ✅                        |
| Unit & integration tests                                    | ✅ (expand with features) |

---

## Feature Implementation phase

| Item                               | Notes                                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| End-to-end testing                 | Introduce Playwright (or equivalent) **after** core user workflows (auth, assessment, reports) exist. Do not add E2E frameworks during foundation. |
| Ownership / authz tests per module | Required as feature modules land                                                                                                                   |

---

## Production readiness phase

| Item                                  | Notes                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Monitoring / APM                      | Sentry, OpenTelemetry, Datadog, Grafana, Prometheus, New Relic — **not** integrated now |
| Production observability              | Metrics, traces, alerting, error budgets                                                |
| Backup & disaster recovery            | See `BACKUP_AND_DR.md` (placeholder only today)                                         |
| Secrets management                    | Managed secret store; rotate JWT / OAuth / DB credentials                               |
| Staging environment & deploy runbooks | Migrate-on-deploy, rollback drills                                                      |

---

## Explicit non-goals of Blocker #6

- No monitoring vendor SDKs
- No E2E browser automation frameworks
- No backup automation scripts
- No business feature modules

Canonical quality doc: `docs/engineering/QUALITY_AND_CI.md`
