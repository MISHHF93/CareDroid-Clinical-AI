# Troubleshooting & FAQ

## Local development

**"I started the app but patient/EMS endpoints return empty or 404."**
Check `ENABLE_MONGOOSE_EMERGENCY_OS`. It's `false` by default in `docker-compose.app.yml` and in a bare `npm start` unless you've set it — the canonical `UnifiedPatient` Mongo model, the reassessment scheduler, and several legacy Express routes only activate when it's `true` and a Mongo URI is configured. See [Platform Architecture Overview §Data layer](architecture/platform-architecture-overview.md#6-data-layer).

**"AI features aren't responding / Copilot says AI is disabled."**
Confirm `AI_ENABLED=true` and `ANTHROPIC_API_KEY` is set in `backend/.env`, plus the specific per-feature flag for what you're testing (`ED_COPILOT_AI_ENABLED`, `SMART_INTAKE_AI_ENABLED`, etc. — see [Configuration Reference §AI/LLM](configuration-reference.md#ai--llm)). Local defaults intentionally disable optional ML/RAG services so the app boots without external credentials.

**"`npm install` didn't install backend or MCP dependencies."**
Root, `backend/`, and `mcp/` each have their own `package.json`/lockfile. Run `npm install`, `npm --prefix backend install`, and (if you need the MCP server) `npm --prefix mcp install` separately.

**"Which `lib/` am I supposed to edit?"**
There are two: `src/lib/` and a separate top-level `lib/` — see [Developer Guide §Repo layout gotchas](developer-guide.md#repo-layout-gotchas). `@lib` in imports always means the top-level `lib/`, not `src/lib/`. (The equivalent top-level `store/` and `engine/` compatibility shims were removed in the 2026-08-05 repo-consolidation cleanup — `src/store/` and `src/engine/` are now each the single canonical location, no duplicate to worry about for those two.)

**"`docs:check` is failing in CI."**
You likely changed a registry file that feeds `docs/generated/*` (e.g. `src/config/routes.config.ts`, `src/lib/users/permissions.ts`) without regenerating. Run `npm run docs:generate` and commit the result.

**"The route-tree/redirect test hangs or OOMs."**
Run it via its dedicated isolated config: `vitest.route-tree.config.ts` forces `pool: 'forks'` and `maxWorkers: 1` specifically because this test is heavy under the default threaded pool.

## Deployment

**"Which docker-compose file should I use?"**
`docker-compose.app.yml` for a lightweight app-only run (SQLite, AI/RAG off by default); layer `docker-compose.ml.yml` on top with `--profile ml` if you need in-process NLU explicitly enabled; use the root `docker-compose.yml` for the full stack including Postgres, Redis, and the observability tooling (Elasticsearch/Logstash/Kibana/Prometheus/Alertmanager/Grafana/Sentry). See [Deployment Guide](deployment-guide.md).

**"Where does the backend actually get deployed if I use Vercel?"**
`vercel.json` deploys the frontend only. The NestJS backend must be deployed and reachable separately — Vercel is not hosting the API.

**"Do I need to rotate secrets before a real deployment?"**
Yes — `JWT_SECRET` and `ENCRYPTION_KEY` both have insecure defaults meant only for local dev. See [Deployment Guide §Production readiness checklist](deployment-guide.md#production-readiness-checklist).

## Platform-shape questions

**"Is this platform HIPAA/PHIPA certified?"**
No. CareDroid is built with audit-minded SaaS patterns (tenant isolation, RBAC, hash-chained audit logs, AI governance) but does not itself claim regulatory certification — that depends on how a specific deployment is configured, hosted, and independently validated. See [README §Security & governance](../README.md#security--governance).

**"Can the AI autonomously diagnose, prescribe, or write to the EHR?"**
No. Every AI output requires human clinician review; mutating Copilot tool calls (`flag_patient`, `dispatch_alert`, etc.) are proposed as a `PendingToolAction` and require explicit confirmation before executing. See [Glossary §AI governance terms](glossary.md#ai-governance-terms).

**"Why do I see both `docs/manuals/roles/charge-nurse.md` and `docs/users/charge-nurse-guide.md`?"**
Known duplication, not yet reconciled — see [Known Documentation Debt](DOCUMENTATION_CENTER.md#known-documentation-debt).

**"What's the difference between the frontend's 23 hospital roles and the backend's 4 `UserRole` values?"**
The frontend role taxonomy drives UX (nav visibility, dashboard defaults, AI scope); the backend's coarser `PHYSICIAN | NURSE | STUDENT | ADMIN` plus its own `Permission` enum is what's actually enforced on API calls. They are two independent systems, not a shared source of truth. See [Platform Architecture Overview §Authorization](architecture/platform-architecture-overview.md#4-authorization--rbac).

**"Is `agent-tools/` at the repo root a tool registry I should register new AI tools in?"**
No — it's session-transcript scratch output (gitignored, mostly `.txt` logs). Real tool registries: `lib/ai/toolRegistry.ts` (frontend Copilot tools) and `backend/src/modules/medical-control-plane/tool-orchestrator/` (backend-executed clinical tools).

Didn't find your question here? Check the [Documentation Center](DOCUMENTATION_CENTER.md) index, or the [Glossary](glossary.md) for terminology.
