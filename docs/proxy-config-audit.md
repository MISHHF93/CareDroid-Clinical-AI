# Frontend ↔ backend proxy and API configuration audit

Last updated: 2026-05-19

## Deployment modes

| Mode | `VITE_API_URL` | Browser calls | Nest receives |
|------|----------------|---------------|---------------|
| **Local dev** (`npm run dev`) | empty | `http://localhost:8000/api/...` | `http://localhost:3000/api/...` via Vite proxy |
| **Preview** (`npm run preview`) | empty | `http://localhost:4173/api/...` | proxied to `VITE_API_PROXY_TARGET` (default `:3000`) |
| **Split deploy** | API origin, e.g. `https://api.example.com` | `https://api.example.com/api/...` | direct (configure `FRONTEND_URL` CORS on Nest) |
| **Same-origin prod** | empty | `/api/...` on app host | reverse proxy must forward `/api` to Nest |

Do **not** hardcode production API hosts in source. Use `VITE_API_URL` at build time or same-origin `/api` behind your edge proxy.

## Vite proxy ([vite.config.js](../vite.config.js))

| Path | Target | Notes |
|------|--------|--------|
| `/api` | `VITE_API_PROXY_TARGET` or `http://localhost:3000` | Matches Nest global prefix `api` |
| `/socket.io` | same | WebSocket upgrade enabled |
| `/health` | same | Backend health at `/health` (excluded from global prefix) |

Frontend dev server: **port 8000**. Nest API: **port 3000** (`backend/.env` `PORT`).

## Centralized client config

| Module | Role |
|--------|------|
| [src/config/appConfig.js](../src/config/appConfig.js) | Reads `VITE_API_URL`, `VITE_WS_URL` |
| [src/config/apiEnv.js](../src/config/apiEnv.js) | `normalizeApiPath`, `resolveApiRoot`, `resolveWebSocketOrigin`, timeout default |
| [src/services/apiClient.js](../src/services/apiClient.js) | `buildApiUrl`, `apiFetch` (+ timeout), `apiFetchJson`, `parseApiResponse`, `apiAxios`, `getApiErrorMessage` |

All REST paths should start with `/api/...` (or rely on `normalizeApiPath` via `apiClient`).

## Config endpoints (system bootstrap)

| Frontend | Backend route |
|----------|----------------|
| `GET /api/config/system` | `AppController` |
| `GET /api/ai/remaining-queries` | `AIController` (JWT) |
| `GET /api/tools/available` | Tool orchestrator |
| `GET /api/subscriptions/current` | `SubscriptionsController` (JWT) |
| `GET /api/subscriptions/plans` | `SubscriptionsController` |

[configService.js](../src/services/configService.js) uses `apiFetchJson`. [SystemConfigContext](../src/contexts/SystemConfigContext.jsx) shows [ApiConfigDegradedBanner](../src/components/ApiConfigDegradedBanner.jsx) when defaults are used after API failure.

## Fixes applied in this audit

- **Audit API**: `@Controller('audit')` (was `api/audit`, doubling global prefix to `/api/api/audit`).
- **configService**: was calling non-existent `apiClient.get()` without `/api` prefix.
- **syncService**: profile path `/api/users/profile`.
- **offline sync**: uses `apiFetchJson('/api/sync')` instead of wrong `localhost:8000` base.
- **Export / notifications / LiveCost / WebSocket**: use `resolveApiRoot` / `resolveWebSocketOrigin` (no `localhost:3000` fallback in browser builds).
- **Auth token**: `getStoredAccessToken()` falls back to legacy `authToken` key.

## CORS

With empty `VITE_API_URL`, the browser only talks to the Vite origin; **no CORS** for `/api` in dev. Split deploy requires Nest `FRONTEND_URL` to include the SPA origin.

## Known gaps (not proxy-related)

Endpoints called by the UI but missing or mismatched on the backend are tracked in [backend-api-inventory.md](./backend-api-inventory.md) (e.g. `POST /api/tools/share-results`, `POST /api/sync`, team APIs).

## Environment variables

See [.env.example](../.env.example): `VITE_API_URL`, `VITE_WS_URL`, `VITE_API_PROXY_TARGET`, `VITE_API_TIMEOUT_MS`.

## Tests

- `src/services/apiClient.test.js` — URL building, path normalization, errors, timeout
- `src/services/configService.test.js` — degraded responses
- `src/config/apiEnv.test.js` — `resolveApiRoot` / `normalizeApiPath`
