# Configuration Reference

> Full environment-variable reference. See `.env.example` (root, frontend/general) and `backend/.env.example` (backend-authoritative — this is where AI/DB/JWT keys are actually consumed via `ConfigService`) for the literal, always-current templates. This document groups and explains them; copy the `.env.example` files, don't hand-type variables from here.

## Setup

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp backend/.env.rag.example backend/.env.rag   # only if enabling Pinecone RAG
```

## General / runtime

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` \| `production` \| `test` |
| `PORT` / `BACKEND_PORT` | Backend listen port (default 3350 per `.env.example`) |
| `FRONTEND_URL`, `CORS_ORIGIN` | Frontend origin the backend trusts |
| `ENABLE_DEV_AUTH_BYPASS`, `ALLOW_DEMO_AUTH_IN_PRODUCTION`, `DEV_LOGIN_EMAIL` | Dev-only auth shortcuts — never enable in a real deployment |
| `CAREDROID_STRICT_SAAS_ENTITLEMENTS` | Enforce SaaS feature-gating strictly |
| `CAREDROID_TENANT_ISOLATION_DISABLED` | **Must be unset/false in production** — disables the global `TenantIsolationGuard` |
| `DEPLOYMENT_ID`, `DEPLOYMENT_REGION`, `GIT_COMMIT`, `GIT_BRANCH`, `BUILD_TIME` | Deployment metadata surfaced in `BuildInfoBadge` / `/version` |

## Database

| Variable | Purpose |
|---|---|
| `DATABASE_CLIENT` | `sqlite` (dev) or `postgres` (production) |
| `DATABASE_URL` | Alternative to individual Postgres vars |
| `DATABASE_HOST/PORT/USER/PASSWORD/NAME/SSL/LOGGING/POOL_SIZE` | Postgres connection detail |
| `SQLITE_PATH` | Path to the dev SQLite file (`caredroid.dev.sqlite`) |
| `MONGODB_URI` / `DATABASE_MONGO_URI`, `DB_NAME` | Mongo connection for the clinical patient domain |
| `ENABLE_MONGOOSE_EMERGENCY_OS` | Gates whether the `UnifiedPatient` Mongoose runtime, reassessment scheduler, and related legacy routes are live — see [Data Model Reference](data-model/data-model-reference.md) |
| `REDIS_HOST/PORT/PASSWORD/DB`, `REDIS_URL` | Cache (not used as a job queue) |

## Auth

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | **Rotate before production** — enforced non-default in `NODE_ENV=production` |
| `JWT_EXPIRY` / `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | Token lifetimes |
| `SESSION_IDLE_TIMEOUT`, `SESSION_ABSOLUTE_TIMEOUT` | Session expiry policy |
| `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` | Google OAuth2 (conditionally registered only if set) |
| `LINKEDIN_CLIENT_ID/SECRET/CALLBACK_URL` | LinkedIn OAuth2 (conditionally registered) |

## Encryption

| Variable | Purpose |
|---|---|
| `ENCRYPTION_KEY` | AES-256, 32-char — **rotate before production** |
| `ENCRYPTION_MASTER_KEY` | Hex, 64-char |
| `ENCRYPTION_ALGORITHM`, `ENCRYPTION_KEY_VERSION` | Column-level PHI encryption config (see `EncryptPhiColumns` migration) |

## AI / LLM

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `anthropic` (default) \| `openai` \| `azure-openai` \| `gemini` \| `local` |
| `ANTHROPIC_API_KEY` | Primary LLM key (raw REST, no SDK) |
| `OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT` | Alternate providers — configured but no dedicated call site found beyond `AIProvider` type; treat as not fully wired |
| `AI_MODEL` | Default `claude-sonnet-4-6` |
| `AI_TEMPERATURE`, `AI_MAX_TOKENS`, `AI_STREAMING_ENABLED`, `AI_ENABLED` | Generation controls |
| `ED_COPILOT_AI_ENABLED`, `SMART_INTAKE_AI_ENABLED`, `REFERRAL_AI_ENABLED`, `ANALYTICS_AI_ENABLED`, `CLINICAL_WORKFLOW_AI_ENABLED` | Per-feature AI toggles |
| `AI_AUDIT_LOGGING_ENABLED`, `AI_PATIENT_CONTEXT_ENABLED` | Governance/audit toggles |
| `AI_RATE_LIMIT_FREE/PRO/INSTITUTIONAL` | Per-tier rate limits |
| Per-service model overrides | `AI_COPILOT_MODEL`, `AI_SMART_INTAKE_MODEL`, `AI_REFERRAL_MODEL`, `AI_ANALYTICS_MODEL`, `AI_WORKFLOW_MODEL`, `AI_CALCULATOR_MODEL`, `AI_HANDOVER_MODEL`, `AI_TRIAGE_MODEL`, `AI_AMBIENT_DOCUMENTATION_MODEL`/`_PROVIDER`, `AI_DETERIORATION_MODEL`, `AI_DISCHARGE_MODEL`, `AI_ADMISSION_MODEL`, `AI_PATIENT_MATCHING_MODEL`, `AI_FEDERATED_EMS_MODEL`, `AI_EDGE_AMBULANCE_MODEL` — see [`docs/AI_FEATURES.md`](AI_FEATURES.md) §17 for the full per-service table |

## RAG (Pinecone)

| Variable | Purpose |
|---|---|
| `RAG_ENABLED` | Toggle RAG retrieval |
| `PINECONE_API_KEY/ENVIRONMENT/INDEX_NAME/NAMESPACE/DIMENSION` | Vector store connection |
| `RAG_MODEL` / `EMBEDDING_MODEL` | `Xenova/all-mpnet-base-v2` for the NLU/artifact-router path; RAG itself defaults to `local-deterministic-embedding` for `AI_EMBEDDING_MODEL` — **these are two separate embedding paths**, don't assume they're the same setting |
| `RAG_AUTO_BOOTSTRAP_CORPUS`, `RERANK_ENABLED` | Corpus bootstrap and reranking behavior |

## NLU / ML services

| Variable | Purpose |
|---|---|
| `NLU_SERVICE_MODE` | `in-process` (default — runs inside NestJS) \| `http` (external deployment) |
| `NLU_SERVICE_URL/ENABLED/TIMEOUT/RETRIES` | Only relevant in `http` mode |
| `NLU_CONFIDENCE_THRESHOLD` | Confidence floor before falling back to keyword matching |
| `ANOMALY_DETECTION_URL/ENABLED/TIMEOUT/RETRIES` | Deprecated Python anomaly-detection service — see `docs/BACKEND_MIGRATION_REPORT.md` |

## Billing (Stripe)

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY/PUBLISHABLE_KEY/WEBHOOK_SECRET` | Stripe API + webhook verification |
| `STRIPE_PRICE_FREE/PRO/INSTITUTIONAL` | Price IDs per tier |
| `STRIPE_SUCCESS_URL/CANCEL_URL` | Checkout redirect URLs |

## Email

| Variable | Purpose |
|---|---|
| `SMTP_HOST/PORT/SECURE/USER/PASSWORD/FROM_EMAIL` | Transactional email (SendGrid by default) |
| `EMAIL_VERIFICATION_EXPIRY`, `PASSWORD_RESET_EXPIRY` | Token TTLs |

## Push notifications (Firebase)

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_APPLICATION_CREDENTIALS` | Service account credentials |
| `FIREBASE_PROJECT_ID/STORAGE_BUCKET/MESSAGING_SENDER_ID` | Project config |
| `FIREBASE_PUSH_ENABLED`, `FIREBASE_NOTIFICATION_TTL/PRIORITY/COLLAPSE_KEY` | Push behavior |

## Monitoring & observability

| Variable | Purpose |
|---|---|
| `SENTRY_DSN` | Error tracking |
| `DATADOG_API_KEY/APP_KEY/SITE`, `DATADOG_APM_ENABLED`, `DATADOG_PROFILING_ENABLED` | APM/tracing |
| `LOG_LEVEL` | Logging verbosity |
| `ELASTICSEARCH_HOST/PORT`, `LOGSTASH_HOST/PORT` | Log aggregation (full-stack compose profile only) |
| `GRAFANA_*`, `PROMETHEUS_PORT`, `KIBANA_PORT`, `ALERTMANAGER_*` | Monitoring stack ports/credentials (full-stack compose profile only) |

## External domain integrations

| Variable | Purpose |
|---|---|
| `MOH_FHIR_BASE_URL`, `MOH_CLIENT_ID/SECRET` | Ministry of Health FHIR (currently a placeholder route — see [API Reference](api/api-reference.md)) |
| `WEARABLE_API_KEY`, `HEALTHKIT_TEAM_ID` | Wearable integration (placeholder route) |
| `MQTT_BROKER_URL/USERNAME/PASSWORD` | IoT/medical-device telemetry |
| `VIDEO_PROVIDER` (mock\|zoom\|twilio\|daily), `ZOOM_API_KEY` | Telehealth video |
| `SURGE_SMS_GATEWAY_URL` | Surge SMS notifications |
| `INCIDENT_ESCALATION_EMAILS` | Incident escalation routing |

## Frontend (`VITE_*`)

The root `.env.example` also has a large `VITE_*` block covering feature flags, Firebase client config, demo mode (`VITE_DEMO_MODE`), deployment metadata, entitlements, and real-time transport config. Key ones referenced elsewhere in this Documentation Center:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Leave empty in local dev — same-origin `/api` via the Vite dev-server proxy |
| `VITE_ED_SINGLE_APPLICATION` | `true` by default — activates Emergency OS as the single app |
| `VITE_STRICT_SAAS_ENTITLEMENTS` | Frontend-side entitlement enforcement, mirrors the backend flag |
| `VITE_ALLOW_SAME_ORIGIN_API`, `VITE_DEMO_MODE`, `VITE_ENABLE_DEV_AUTH_BYPASS` | Set by the Vercel `buildCommand` in `vercel.json` — not meant to be hand-set for a normal local dev flow |

For the complete, current list of all ~135 frontend variables, read `.env.example` directly — it is annotated and regenerating this table by hand would drift immediately.

See also: [Deployment Guide](deployment-guide.md), [Data Model Reference](data-model/data-model-reference.md), [`docs/generated/configuration.md`](generated/configuration.md) (82 generated configuration-source records, complementary to this hand-written grouping).
