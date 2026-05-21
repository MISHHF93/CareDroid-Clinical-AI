# Environment checklist — production readiness

## Root `.env` (frontend / Vite)

Copy from [.env.example](../../.env.example).

| Variable | Local dev | Staging / prod (same-origin) | Split API |
|----------|-----------|------------------------------|-----------|
| `VITE_API_URL` | empty | empty only with a verified same-origin `/api` proxy | `https://api.example.com` |
| `VITE_ALLOW_SAME_ORIGIN_API` | `false` | `true` only when `/api` is edge-proxied to Nest | `false` |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | N/A (build-time) | N/A |
| `VITE_WS_URL` | empty (same host) | optional override | `wss://api.example.com` |
| `VITE_API_TIMEOUT_MS` | `30000` | `30000` | tune if needed |
| `VITE_APP_ENVIRONMENT` | `development` | `staging` / `production` | |
| `VITE_DEV_BEARER_TOKEN` | dev only | **unset** | **unset** |
| `VITE_SENTRY_DSN` | optional | set for prod | |

- [ ] Never commit real `.env` with secrets
- [ ] `PORT=8000` in root example is documentation symmetry; Vite uses `npm run dev` port 8000

## `backend/.env`

Copy from [backend/.env.example](../../backend/.env.example).

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | yes | Default `3000` |
| `FRONTEND_URL` | yes | `http://localhost:8000` dev; SPA origin in prod |
| `JWT_SECRET` | yes | Strong secret in prod |
| `DATABASE_*` or `SQLITE_PATH` | yes | Postgres prod; SQLite dev only |
| `REDIS_*` | if used | Sessions / cache |
| OAuth keys | if enabled | Google/LinkedIn |

- [ ] `FRONTEND_URL` matches actual SPA URL (CORS + OAuth redirects)

## Proxy alignment verification

| Check | Command / action |
|-------|------------------|
| Dev proxy | `npm run dev` → browser `http://localhost:8000/api/config/system` |
| Nest direct | `curl http://localhost:3000/api/config/system` |
| Audit path | `curl http://localhost:3000/api/audit/...` (not `/api/api/audit`) |

## Build-time vs runtime

| Config | When applied |
|--------|----------------|
| `VITE_*` | **Build time** — rebuild SPA to change |
| `backend/.env` | **Runtime** — restart Nest |

## Optional: NLU sidecar

- [ ] [backend/ml-services/nlu/.env.example](../../backend/ml-services/nlu/.env.example) if ML service deployed separately

## Checklist sign-off

- [ ] Staging env vars documented in team vault
- [ ] Production env vars documented in team vault
- [ ] No `localhost` in production `VITE_API_URL`
- [ ] Vercel frontend deploys set `VITE_API_URL` unless an edge proxy has been verified.
- [ ] Production deploys do not set `VITE_HIDE_DIVISION_MODE=false`.
