# Authentication & Authorization Matrix

## Roles

| Role     | Code       | Description                                              |
| -------- | ---------- | -------------------------------------------------------- |
| Admin    | `ADMIN`    | Full platform management                                 |
| Guest    | `GUEST`    | Google-authenticated; profile incomplete; results locked |
| Freemium | `FREEMIUM` | Registered free user                                     |
| Premium  | `PREMIUM`  | Registered paid user                                     |

Legend for matrices:

| Symbol | Meaning                                      |
| ------ | -------------------------------------------- |
| ✅     | Allowed                                      |
| 🔒     | Allowed but results may be locked / redacted |
| ❌     | Denied (`401` if anon, `403` if wrong role)  |
| —      | N/A                                          |

---

## Authentication matrix (by endpoint group)

| Endpoint group                     | Public | Guest | Freemium | Premium | Admin |
| ---------------------------------- | ------ | ----- | -------- | ------- | ----- |
| `POST /auth/google`                | ✅     | —     | —        | —       | —     |
| `GET /auth/google/callback`        | ✅     | —     | —        | —       | —     |
| `POST /auth/refresh`               | ✅*    | ✅*   | ✅*      | ✅*     | ✅*   |
| `POST /auth/logout`                | ❌     | ✅    | ✅       | ✅      | ✅    |
| `GET /auth/me`                     | ❌     | ✅    | ✅       | ✅      | ✅    |
| `GET /auth/session`                | ❌     | ✅    | ✅       | ✅      | ✅    |
| `GET /health`                      | ✅     | ✅    | ✅       | ✅      | ✅    |
| `GET /settings/public`             | ✅     | ✅    | ✅       | ✅      | ✅    |
| Profile / me                       | ❌     | ✅    | ✅       | ✅      | ✅    |
| Assessment catalog (FREE)          | ❌     | ✅    | ✅       | ✅      | ✅    |
| Assessment catalog (PREMIUM items) | ❌     | ❌    | ❌       | ✅      | ✅    |
| Start guest assessment             | ❌     | ✅    | ✅       | ✅      | ✅    |
| Start premium assessment           | ❌     | ❌    | ❌       | ✅      | ✅    |
| Submit attempt                     | ❌     | ✅    | ✅       | ✅      | ✅    |
| Evaluation / JRS / reports (own)   | ❌     | 🔒    | ✅       | ✅      | ✅    |
| Dashboard                          | ❌     | ✅    | ✅       | ✅      | ✅    |
| Gamification (own)                 | ❌     | ✅    | ✅       | ✅      | ✅    |
| Notifications (own)                | ❌     | ✅    | ✅       | ✅      | ✅    |
| Subscription status (own)          | ❌     | ✅    | ✅       | ✅      | ✅    |
| Premium recommendations            | ❌     | ❌    | ❌       | ✅      | ✅    |
| File upload (own)                  | ❌     | ✅    | ✅       | ✅      | ✅    |
| Admin.*                            | ❌     | ❌    | ❌       | ❌      | ✅    |
| HR review                          | ❌     | ❌    | ❌       | ❌      | ✅    |
| Audit logs                         | ❌     | ❌    | ❌       | ❌      | ✅    |

\* Refresh accepts refresh token in body/cookie — not access-token auth.

---

## Authorization rules (resource ownership)

1. Users may only read/write **their own** attempts, reports, notifications, files, gamification, subscriptions.
2. `ADMIN` may access any resource under `/admin/**` and privileged GET by id where documented.
3. Premium feature checks use **role `PREMIUM`** and/or active `user_subscriptions` — contract exposes `GET /subscriptions/me` for clients; **server is source of truth**.
4. Guest profile completion upgrades role to `FREEMIUM` (business rule later); until then evaluation APIs return `RESULTS_LOCKED`.

---

## Token contract

### Access token (JWT claims)

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "FREEMIUM",
  "iat": 0,
  "exp": 0
}
```

### Refresh

- Request: `{ "refreshToken": "..." }`
- Response data: `{ "accessToken", "refreshToken", "expiresIn", "tokenType": "Bearer" }`
- Rotation: required on each refresh.

### Logout

- Invalidates refresh token server-side (Redis).
- Access token remains until expiry (stateless); optional denylist is future.
