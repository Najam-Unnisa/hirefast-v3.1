# ADR-006: Deterministic JRS vs AI Evaluation

## Status

Accepted — non-negotiable

## Context

HireFast Master Context requires Job Readiness Score to be backend-controlled and deterministic. AI should provide qualitative feedback only.

## Decision

Separate persistence and APIs:

- Deterministic: `attempt_evaluations`, `job_readiness_scores`
- Qualitative: `ai_evaluations`, `ai_reports`

AI must never write authoritative JRS numerics.

## Consequences

(+) Trustworthy scoring; independent AI retry/failure  
(−) More tables and endpoints; clients must understand two result channels
