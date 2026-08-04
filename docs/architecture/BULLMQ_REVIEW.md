# Architecture Review — BullMQ Foundation vs Workers (Blocker #5)

**Status:** Resolved (clarified)  
**Scope:** Architectural refinement only — no business job processors

## Verdict

Queue infrastructure and worker implementations are cleanly separated.

| Concern                | Ownership           | Status                |
| ---------------------- | ------------------- | --------------------- |
| Redis + BullMQ queues  | Platform foundation | ✅                    |
| Worker factory helpers | Platform foundation | ✅                    |
| Business processors    | Feature modules     | ⏳ Deferred by design |

The previous `registerJobs()` no-op implied foundation should register jobs. It has been **removed**. Startup initializes queues only.

## Checklist

- [x] Queue manager / factory / Redis connection preserved
- [x] Platform queues still initialized at boot (`initializePlatformQueues`)
- [x] Misleading `registerJobs()` placeholder removed
- [x] Worker factory retained for future feature-owned registration
- [x] Startup flow documents infrastructure-only boot
- [x] Documentation distinguishes foundation vs feature workers
- [x] Future modules can call `createWorker` without changing queue infrastructure

## Out of scope (correct)

No AI evaluation, report, email, or notification processors.

## Docs

- `docs/architecture/BULLMQ_FOUNDATION.md`
- ADR-007 (revised)
