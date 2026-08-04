# ADR-007: BullMQ Background Jobs

## Status

Accepted

## Decision

Long-running work (AI evaluation, reports, email, notifications) runs on BullMQ + Redis — never in HTTP request handlers.

## Architecture-First split

| Layer                    | Status                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Queue Infrastructure** | Implemented — Redis, queue manager/factory, platform queue names, worker factory helpers |
| **Feature Workers**      | Deferred — processors registered by the feature modules that own the business logic      |

API bootstrap initializes **queues only**. There is no central business `registerJobs()` in the foundation.

See `docs/architecture/BULLMQ_FOUNDATION.md`.

## Consequences

(+) Scale workers independently per feature  
(+) Queue infrastructure usable before any processor exists  
(+) Feature modules own their processors without editing the queue manager  
(−) Feature Implementation must register workers before that workload is production-ready
