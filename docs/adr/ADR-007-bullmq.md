# ADR-007: BullMQ Background Jobs

## Status

Accepted (implementation incomplete)

## Decision

Long-running work (AI evaluation, reports, email, notifications) runs on BullMQ + Redis — never in HTTP request handlers.

## Consequences

(+) Scale workers independently  
(−) Queues registered today without consumers — must fix before AI features
