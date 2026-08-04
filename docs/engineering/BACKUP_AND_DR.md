# Backup & Disaster Recovery (Placeholder)

**Status:** Deferred — Production readiness phase  
**Implementation:** None required at Architecture-First foundation stage

This document outlines future production requirements only. No backup automation, cloud DR tooling, or secrets-manager wiring is implemented yet.

---

## Future requirements

### PostgreSQL

- Automated database backups (schedule + retention policy)
- Point-in-time recovery (PITR) where supported by the hosting provider
- Documented restore procedures (RTO / RPO targets)
- Migration rollback / forward-fix playbooks for failed deploys

### Redis

- Persistence strategy (RDB / AOF) appropriate for refresh-token and BullMQ durability needs
- Eviction / memory limits documented for production
- Recovery notes if Redis data is lost (re-login / re-enqueue expectations)

### Secrets management

- Move off local `.env` placeholders for production
- Secret rotation for JWT signing keys, OAuth client secrets, DB credentials
- No secrets in git or CI logs

### Disaster recovery planning

- Environment topology (staging vs production)
- Failover ownership and communication plan
- Periodic restore drills
- Dependency inventory (Postgres, Redis, R2, OpenAI, Google OAuth)

---

## Out of scope now

- Cron backup jobs
- Managed backup product integration
- Multi-region failover
- Incident response tooling beyond structured logs + health checks

See also: `docs/engineering/OPERATIONS_ROADMAP.md`
