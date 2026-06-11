# F2T Mobile App

The Farm-to-Table mobile client for consumers, farm owners, and admins.

**Stack:** React Native 0.79 · Expo SDK 53 · Expo Router (file-based) · TypeScript ·
NativeWind (Tailwind) · Zustand · TanStack Query (via `react-query-kit`) · MMKV · i18next.

> Scaffolded from the [Obytes starter](https://starter.obytes.com); customized for F2T.

---

## Requirements

- React Native dev environment ([setup guide](https://reactnative.dev/docs/environment-setup))
- Node.js LTS, **pnpm** (enforced via `only-allow`), Git, Watchman (macOS/Linux)
- iOS Simulator (Xcode) and/or Android Emulator
- VS Code / Cursor with the recommended extensions in `.vscode/extensions.json`

> Install native packages with `npx expo install <pkg>` (not `pnpm add`) to get
> Expo-compatible versions.

---

## Quick start

```bash
pnpm install
# edit .env.development → set API_URL to your machine's LAN IP, e.g.
#   API_URL=http://192.168.1.10:3000/api
pnpm start            # Expo dev server; press i / a, or scan QR in Expo Go
```

The backend (`f2t-backend`) must be reachable at `API_URL`. Use the LAN IP, not
`localhost`, so a physical device can connect.

| Command | Purpose |
|---|---|
| `pnpm start` | Expo dev server |
| `pnpm ios` / `pnpm android` | Build & run on simulator/emulator |
| `pnpm web` | Run in the browser |
| `pnpm test` / `pnpm test:watch` | Jest |
| `pnpm lint` | ESLint |
| `pnpm type-check` | `tsc --noemit` |
| `pnpm lint:translations` | Validate translation JSON |
| `pnpm check-all` | lint + type-check + translations + test |
| `pnpm doctor` | `expo-doctor` |

Build profiles use `APP_ENV` (`development` \| `staging` \| `production`) and EAS, e.g.
`pnpm build:production:ios`. Bundle id / package derive from `APP_ENV` (`com.f2t`,
`com.f2t.staging`, …).

---

## Project structure (`src/`)

| Path | Contents |
|---|---|
| `app/` | Routes (Expo Router, file-based) |
| `api/` | Data layer — one folder per domain: `types.tsx` + `use-*.tsx` hooks (`react-query-kit`) |
| `components/` | UI — use `components/ui/` primitives; styles via NativeWind |
| `lib/` | Cross-cutting stores & utils (`lib/auth/`, `lib/cart/` — Zustand; tokens in MMKV) |
| `translations/` | i18next resource JSON |
| `types/` | Shared TypeScript types |

### Routing groups under `app/`

- `(app)/` — authenticated consumer routes (home, cart, orders, payment, profile)
- `(app)/farm/`, `(app)/inventory/` — authenticated farm-owner routes
- `admin/` — admin screens (users, products, farms, orders, posts, reviews)
- `checkout/`, `products/`, `farms/`, `feed/`, `notifications/`, `settings/` — public/shared
- `login.tsx`, `register*.tsx`, `onboarding.tsx`, `forgot-password.tsx`, … — auth flow

### API layer

The Axios client in `src/api/common/client.tsx` injects `Authorization: Bearer <token>`
and handles `401 → token refresh`. Tokens are stored in **MMKV** (never cookies).
The response envelope from the backend is `{ success, data, message? }`; list endpoints
return `{ items, total, page, limit, hasMore }`.

---

## Environment

Variables live in `.env.${APP_ENV}` and are loaded/validated by `env.js` (zod). The app
reads them via `@env`. Key var:

| Variable | Notes |
|---|---|
| `API_URL` | Backend base URL incl. `/api` (use LAN IP) |
| `APP_ENV` | `development` \| `staging` \| `production` |
| `BYPASS_LOGIN` | Dev convenience |

> Email/phone verification is **disabled** in the app — `needsVerification()` in
> `src/api/auth/auth-actions.tsx` always returns `false`.

---

## Conventions

- File/directory names: **kebab-case**. Imports use the `@/` alias (→ `src/`).
- Prefer `type` over `interface`; avoid `enum` — use `const` objects with `as const`.
- Components: functional only, named exports, ~80 lines max.
- Use only colors/fonts defined in `tailwind.config.js`.
- Commit prefixes: `feat:` `fix:` `perf:` `docs:` `style:` `refactor:` `test:` `chore:`.
