# ADR-012: Selective Soft Deletes

## Status

Accepted

## Decision

`deletedAt` only on users, assessments, questions, files, learning_recommendations.

## Consequences

(+) History preserved where needed  
(−) Index all soft-delete columns used in filters (learning_recommendations gap noted in review)
