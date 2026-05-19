# Deployment checklist — production readiness

## Pre-deploy

- [ ] PR merged to release branch; tag version if applicable
- [ ] CI green: `lint`, `test:run`, `build` (frontend)
- [ ] CI green: `backend` `build`
- [ ] Contract docs regenerated in CI or verified committed: `contract:write-docs`, `tool-matrix:write-docs`
- [ ] No secrets in `dist/` or build logs

## Build artifacts

### Frontend

```bash
npm ci
npm run build
# Artifact: dist/
```

- [ ] `VITE_API_URL` set for target environment:
  - **Same-origin:** empty → app served with `/api` reverse proxy to Nest
  - **Split API:** `https://api.<domain>` full origin (no trailing slash)
- [ ] `VITE_WS_URL` set if WebSockets on different host (optional)
- [ ] Source maps policy decided (upload or omit)

### Backend

```bash
cd backend && npm ci && npm run build
# Artifact: backend/dist/
```

- [ ] `NODE_ENV=production`
- [ ] `PORT` / `FRONTEND_URL` / `DATABASE_*` / `JWT_SECRET` from secret store
- [ ] SQLite **not** used in production unless intentional

## Infrastructure

- [ ] Reverse proxy routes `/api` → Nest upstream
- [ ] `/health` reachable for load balancer
- [ ] `/socket.io` proxied if using realtime features
- [ ] CORS `FRONTEND_URL` matches SPA origin (split deploy)
- [ ] TLS certificates valid

## Deploy sequence

1. [ ] Deploy backend; verify `GET /health` and `GET /api/config/system`
2. [ ] Run DB migrations if any (none expected from this PR)
3. [ ] Deploy frontend static assets to CDN / app host
4. [ ] Smoke: login, catalog, one Tier A calc, drug-checker execute, one chat message

## Post-deploy monitoring (24h)

- [ ] Error rate on `POST /api/tools/*/execute`
- [ ] Error rate on `POST /api/chat/message`
- [ ] 4xx spike on `/api/api/*` (should be zero after audit path fix)
- [ ] Frontend Sentry (if `VITE_SENTRY_DSN` set)

## Rollback trigger

- [ ] Criteria defined: e.g. >5% executor failures, config banner on >50% sessions
- [ ] Previous `dist/` + `backend/dist/` artifacts retained for one-click rollback
