# ADR-009: Object Storage (R2/S3)

## Status

Accepted

## Decision

Store only file metadata in Postgres (`files`); bytes in Cloudflare R2 (S3-compatible).

## Consequences

(+) No blob bloat in DB  
(−) Presigned upload API and validation middleware still required
