# BullMQ — Foundation vs Feature Workers

HireFast follows an **Architecture-First** methodology for background jobs.

Absence of AI / report / email / notification **processors** is **expected**. It is not a foundation defect.

---

## Separation

| Layer                                 | Status         | Responsibility                                                                                       |
| ------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| **Queue Infrastructure (Foundation)** | ✅ Implemented | Redis connection, BullMQ config, queue manager/factory, platform queue names, worker factory helpers |
| **Feature Workers (Implementation)**  | ⏳ Deferred    | Processors owned by feature modules that own the business logic                                      |

```
API bootstrap
  → connect Redis
  → initializePlatformQueues()     // foundation only
  ✗ no central registerJobs()
  ✗ no business processors

Feature module (later)
  → getQueue(QUEUE_NAMES.*)        // enqueue
  → createWorker(name, processor)  // consume — module-owned
```

---

## Implemented foundation

| Piece                   | Location                                                                       |
| ----------------------- | ------------------------------------------------------------------------------ |
| Queue manager / factory | `apps/backend/src/jobs/queue-manager.ts`                                       |
| Platform queue names    | `QUEUE_NAMES` (`ai-evaluation`, `report-generation`, `email`, `notifications`) |
| Worker factory          | `apps/backend/src/jobs/worker-factory.ts` (`createWorker`, `closeAllWorkers`)  |
| Package barrel          | `apps/backend/src/jobs/index.ts`                                               |
| Startup                 | `server.ts` calls `initializePlatformQueues()` only                            |
| Redis                   | `config/redis.ts` + Docker                                                     |

---

## Deferred Feature Implementation

| Feature module           | Worker                      | Queue               |
| ------------------------ | --------------------------- | ------------------- |
| Assessments / Evaluation | AI evaluation processor     | `ai-evaluation`     |
| Reporting                | Report generation processor | `report-generation` |
| Notifications            | Notification processor      | `notifications`     |
| Email                    | Email delivery processor    | `email`             |

Each module registers its worker at **module initialization**, not in the platform bootstrap.

Example (future — do not implement now):

```typescript
// apps/backend/src/modules/assessments/jobs/ai-evaluation.worker.ts
import { createWorker, QUEUE_NAMES } from '../../../jobs';

export function registerAssessmentWorkers(): void {
  createWorker(QUEUE_NAMES.AI_EVALUATION, async (job) => {
    // feature-owned processor
  });
}
```

---

## Rules

1. Do not put business processors in `jobs/` foundation files.
2. Do not invent a central `registerJobs()` that pretends features exist.
3. HTTP handlers must enqueue work — never run long AI/report jobs inline.
4. Queue infrastructure must remain usable without any workers registered.

---

## Related

- ADR-007
- `docs/architecture/BULLMQ_REVIEW.md`
