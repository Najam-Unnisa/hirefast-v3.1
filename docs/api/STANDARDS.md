# HireFast API Cross-Cutting Standards

## Base URL & versioning

| Item                             | Value                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Current version                  | `v1`                                                                                                                           |
| Prefix                           | `/api/v1`                                                                                                                      |
| Health (unversioned convenience) | `GET /health` (also mirrored at `/api/v1/health`)                                                                              |
| Docs                             | Design-time: `docs/api/openapi.yaml`. Runtime: `/docs` + `/docs.json` (implemented routes only — see `CONTRACT_VS_RUNTIME.md`) |

### Versioning strategy

- Breaking changes → new major API version (`/api/v2`).
- Additive fields and new optional query params are non-breaking within `v1`.
- Deprecated endpoints: mark `deprecated: true` in OpenAPI; keep for **minimum 90 days**; respond with `Deprecation` and `Sunset` headers.
- Clients should send `Accept: application/json` and tolerate unknown fields.

---

## Request standards

### Headers

| Header              | Required                               | Notes                                       |
| ------------------- | -------------------------------------- | ------------------------------------------- |
| `Authorization`     | When authenticated                     | `Bearer <accessToken>`                      |
| `Content-Type`      | For bodies                             | `application/json` or `multipart/form-data` |
| `Accept`            | Recommended                            | `application/json`                          |
| `X-Request-Id`      | Optional                               | Echoed in logs; generated if absent         |
| `X-Idempotency-Key` | Recommended for POST submit / payments | UUID; 24h replay window                     |

### Content types

- JSON APIs: `application/json; charset=utf-8`
- Uploads: `multipart/form-data` (file + optional JSON fields)
- No XML

### Route params

- Resource IDs: UUID (`path` → `uuid`)
- Slugs: lowercase kebab/snake where documented (`assessmentSlug`)

### Query params (global conventions)

| Param         | Type              | Default                          | Max                           |
| ------------- | ----------------- | -------------------------------- | ----------------------------- |
| `page`        | int ≥ 1           | `1`                              | —                             |
| `limit`       | int ≥ 1           | `20`                             | `100`                         |
| `sortBy`      | string            | resource-specific                | allow-list only               |
| `sortOrder`   | `asc` \| `desc`   | `desc` for dates, `asc` for name | —                             |
| `q`           | string            | —                                | max 200 chars; keyword search |
| `status`      | enum              | —                                | resource allow-list           |
| `from` / `to` | ISO-8601 datetime | —                                | inclusive range filters       |

---

## Response envelope (mandatory)

### Success

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

### Paginated success

`data` MUST be:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [{ "field": "email", "message": "Invalid email", "code": "invalid_string" }]
}
```

Server errors MAY omit `errors` or use a single generic entry. **Never** expose stack traces.

---

## HTTP status codes

| Code  | When                                                                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200` | Successful GET/PUT/PATCH/POST that returns a body                                                                                                          |
| `201` | Resource created                                                                                                                                           |
| `204` | Success with no body (rare; prefer `200` + envelope — HireFast **prefers 200/201 with envelope**; `204` only for pure DELETE ack if explicitly documented) |
| `400` | Malformed request                                                                                                                                          |
| `401` | Missing/invalid/expired auth                                                                                                                               |
| `403` | Authenticated but not allowed (role, premium, locked results)                                                                                              |
| `404` | Resource not found (or hidden)                                                                                                                             |
| `409` | Conflict (duplicate attempt number, already submitted)                                                                                                     |
| `422` | Semantic validation failure (Zod)                                                                                                                          |
| `429` | Rate limited                                                                                                                                               |
| `500` | Unexpected server error                                                                                                                                    |
| `503` | Dependency unavailable (DB/Redis/AI provider down)                                                                                                         |

HireFast convention: prefer **`422`** for field validation; **`400`** for unparseable JSON / bad types at transport level.

---

## Pagination / filtering / sorting / search

### Pagination

Always use `page` + `limit` + `meta` as above. Cursor pagination is **out of scope for v1** but reserved for future high-volume feeds (`?cursor=`).

### Filtering

| Resource           | Common filters                                    |
| ------------------ | ------------------------------------------------- |
| Assessments        | `status`, `accessTier`, `categoryId`, `q`         |
| Candidates (admin) | `status`, `role`, `q`, `from`, `to`               |
| Attempts           | `status`, `assessmentId`, `from`, `to`            |
| Reports            | `status`, `from`, `to`                            |
| Questions (admin)  | `assessmentId`, `questionType`, `q`               |
| Notifications      | `isRead`, `type`                                  |
| Audit logs         | `action`, `actorId`, `resourceType`, `from`, `to` |
| HR reviews         | `status`, `reviewerId`                            |

Unknown filter keys → `422`.

### Sorting allow-lists

| Resource             | Allowed `sortBy`                  |
| -------------------- | --------------------------------- |
| Assessments          | `createdAt`, `updatedAt`, `title` |
| Users                | `createdAt`, `email`              |
| Attempts             | `createdAt`, `submittedAt`        |
| Reports              | `createdAt`, `generatedAt`        |
| Notifications        | `createdAt`                       |
| Audit logs           | `createdAt`                       |
| Leaderboard (future) | `totalXp`                         |

### Search

- `q` = case-insensitive keyword (ILIKE) on documented fields.
- Exact match via explicit filters (`email=`, `code=`).
- Full-text search (`tsvector`) is **future**; contract remains `q`.

---

## Validation standards

| Layer       | Rules                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Path        | UUID format; existence checked in service layer later                                                              |
| Query       | coerce numbers; enum membership; max lengths                                                                       |
| Body        | Zod schemas per DTO; strip unknown keys                                                                            |
| Files       | MIME allow-list, max size 10MB default (resume/PDF may be higher — see Files), extension check, random storage key |
| Auth header | Bearer scheme; reject malformed                                                                                    |

---

## Rate limiting (recommendations)

| Scope                 | Window | Max       | Notes               |
| --------------------- | ------ | --------- | ------------------- |
| Global (IP)           | 15 min | 300       | Baseline behind CDN |
| Auth login/callback   | 15 min | 30        | Brute-force / abuse |
| Token refresh         | 15 min | 60        |                     |
| Assessment submit     | 15 min | 20 / user |                     |
| Autosave              | 1 min  | 60 / user |                     |
| AI evaluation trigger | 15 min | 10 / user | Expensive           |
| Report regenerate     | 15 min | 5 / user  |                     |
| Notifications list    | 1 min  | 60 / user |                     |
| Admin analytics       | 1 min  | 30        |                     |
| Uploads               | 15 min | 20 / user |                     |

Respond `429` with envelope + `Retry-After`.

---

## Security standards (contract-level)

| Control       | Standard                                                                          |
| ------------- | --------------------------------------------------------------------------------- |
| Transport     | HTTPS only in non-local envs                                                      |
| Access token  | JWT, short-lived (`15m` default)                                                  |
| Refresh token | Opaque/JWT refresh, rotated; stored hashed in Redis; **not** in Postgres          |
| RBAC          | Enforced on every protected route; roles: `ADMIN`, `GUEST`, `FREEMIUM`, `PREMIUM` |
| CORS          | Allowlist candidate + admin origins                                               |
| Headers       | Helmet defaults; no sensitive data in URLs                                        |
| Input         | Validate + sanitize text fields for XSS in stored content                         |
| Output        | Never return secrets, raw provider keys, or internal stack traces                 |
| File upload   | Auth required; virus scan hook (future); purpose-scoped                           |
| IDOR          | All user-scoped resources filtered by `sub` unless Admin                          |

### Locked results (Guest)

When `user.role === GUEST` or `profile.isComplete === false` **and** attempt `resultsLocked === true`:

- Evaluation/JRS/report detail endpoints return **`403`** with code `RESULTS_LOCKED`  
  **or** a redacted payload with `resultsLocked: true` and no score/report body (prefer **403** for clarity).

---

## Error code catalog (stable `errors[].code`)

| Code                 | Meaning                       |
| -------------------- | ----------------------------- |
| `VALIDATION_ERROR`   | Field validation              |
| `UNAUTHORIZED`       | Auth required / invalid token |
| `FORBIDDEN`          | RBAC / premium / ownership    |
| `RESULTS_LOCKED`     | Guest profile incomplete      |
| `PREMIUM_REQUIRED`   | Premium feature               |
| `NOT_FOUND`          | Missing resource              |
| `CONFLICT`           | State conflict                |
| `RATE_LIMITED`       | Too many requests             |
| `EVALUATION_PENDING` | Result not ready              |
| `INTERNAL_ERROR`     | Unexpected                    |

---

## Idempotency

- `POST .../attempts/:attemptId/submit`
- `POST .../attempts/:attemptId/evaluation`
- Future billing webhooks

Same key + same user → replay original success response.
