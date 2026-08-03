# HireFast Architecture Overview

HireFast is a modular monolith monorepo.

## Apps

- `apps/candidate-portal` — Next.js 15 candidate experience
- `apps/admin-portal` — Next.js 15 admin console
- `apps/backend` — Express.js API (`/api/v1`)

## Packages

- `packages/shared-types` — shared TypeScript contracts
- `packages/shared-utils` — shared helpers (API envelope, pagination, dates)
- `packages/shared-config` — shared env helpers and design tokens

## Infrastructure

- PostgreSQL + Prisma ORM
- Redis + BullMQ
- Cloudflare R2 (S3-compatible) storage abstraction
- OpenAI via AI provider abstraction

## Notes

This repository currently contains the **engineering foundation only**.
Business features (auth flows, assessments, JRS, reports) are intentionally not implemented yet.
