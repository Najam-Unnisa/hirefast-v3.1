# ADR-003: PostgreSQL + Prisma

## Status

Accepted

## Decision

PostgreSQL as system of record; Prisma ORM; UUID PKs; migrations in `prisma/migrations`.

## Consequences

(+) Strong integrity, TypeScript client  
(−) Avoid business logic in DB; use CHECK sparingly as already started
