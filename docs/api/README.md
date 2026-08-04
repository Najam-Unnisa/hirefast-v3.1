# HireFast API Documentation Index

HireFast keeps **design-time** and **runtime** API docs separate.  
See **[CONTRACT_VS_RUNTIME.md](./CONTRACT_VS_RUNTIME.md)**.

## Design-time (target architecture contract)

| Document                                     | Description                                                 |
| -------------------------------------------- | ----------------------------------------------------------- |
| [openapi.yaml](./openapi.yaml)               | **Authoritative** complete OpenAPI 3.0.3 contract (roadmap) |
| [ARCHITECTURE.md](./ARCHITECTURE.md)         | Modules & resource map                                      |
| [ENDPOINT_CATALOG.md](./ENDPOINT_CATALOG.md) | Full endpoint catalog                                       |
| [STANDARDS.md](./STANDARDS.md)               | Envelopes, pagination, security, versioning                 |
| [AUTH_MATRIX.md](./AUTH_MATRIX.md)           | Authentication & authorization matrices                     |
| [REVIEW.md](./REVIEW.md)                     | API architecture review                                     |

These describe the **target** API. Many endpoints are not implemented yet.

## Runtime (implemented Express routes only)

| Endpoint         | Description                                         |
| ---------------- | --------------------------------------------------- |
| `GET /docs`      | Swagger UI — **implemented routes only**            |
| `GET /docs.json` | OpenAPI JSON generated from implemented route JSDoc |

Runtime Swagger does **not** serve `openapi.yaml`.

**Base URL:** `/api/v1` (plus root `GET /health`)
