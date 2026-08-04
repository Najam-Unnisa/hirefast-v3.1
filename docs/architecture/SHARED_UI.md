# Shared UI Architecture

HireFast portals share one UI package: `@hirefast/shared-ui`.

This resolves Architecture Review **Blocker #4** (portal UI fork / DRY violation).

---

## Package layout

```text
packages/shared-ui/
├── src/
│   ├── components/     # UI primitives + AppShell
│   ├── providers/      # Query, Auth context, Toast, AppProviders
│   ├── hooks/          # useAuth re-export
│   ├── stores/         # toast store
│   ├── utils/          # cn()
│   ├── lib/            # createApiClient
│   ├── theme/          # styles.css (Tailwind + tokens)
│   └── index.ts
└── package.json
```

## What belongs here

| Shared             | Examples                                                         |
| ------------------ | ---------------------------------------------------------------- |
| UI primitives      | Button, Input, Card, Dialog, Table, Toast, …                     |
| Providers          | `AppProviders`, `QueryProvider`, `AuthProvider`, `ToastNotifier` |
| Stores             | `useToastStore`                                                  |
| Utils              | `cn()`                                                           |
| API infrastructure | `createApiClient`                                                |
| Theme stylesheet   | `@hirefast/shared-ui/styles.css`                                 |
| Layout chrome      | `AppShell` (parameterized `appName` / `portalLabel`)             |

## What stays in apps

| Portal-local     | Examples                                     |
| ---------------- | -------------------------------------------- |
| Routes / pages   | `app/page.tsx`, feature pages                |
| Portal constants | `APP_DESCRIPTION`, `API_BASE_URL` env        |
| Feature modules  | assessments, admin consoles, reports         |
| Thin API wiring  | `createApiClient({ baseUrl: API_BASE_URL })` |

## Consumption

```tsx
import { AppProviders, AppShell, Button, Badge } from '@hirefast/shared-ui';
import '@hirefast/shared-ui/styles.css'; // via app/globals.css
```

Next.js apps must list `@hirefast/shared-ui` in `transpilePackages`.

shadcn aliases in each portal `components.json` point at `@hirefast/shared-ui/*`.

## Design tokens

Visual tokens remain in `@hirefast/shared-config/tailwind`.  
`shared-ui` theme CSS imports those tokens — do not duplicate token definitions.

## Rules

1. Do not copy UI primitives into portal `src/`.
2. Add new shared primitives to `packages/shared-ui` only.
3. Portal-specific composition belongs in `apps/*/src/features`.
4. Auth **context** is shared; auth **feature flows** are Feature Implementation.

## Related

- `docs/architecture/SHARED_UI_REVIEW.md`
- ADR-013 (dual portals)
