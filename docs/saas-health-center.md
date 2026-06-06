# SaaS Health Center

## Purpose

The SaaS Health Center gives CareDroid operators one tenant-aware operational view for the major runtime surfaces that keep the platform usable: frontend, backend, API, integrations, tenant controls, AI, and simulations.

## Routes and API

- Frontend route: `/saas-health`
- Backend API: `GET /api/saas-health`
- Permissions: `VIEW_OPERATIONS` and `VIEW_OBSERVABILITY`
- Navigation: Advanced sidebar, next to System Health and Self Diagnostics

## Monitored Domains

| Domain | What It Represents | Current Evidence |
| --- | --- | --- |
| Frontend Health | Client release/build metadata and deployed environment | frontend version and Vercel/runtime environment |
| Backend Health | Backend service readiness | backend version, deployment status, API health signal |
| API Health | Authenticated API contract availability | `/api/saas-health` and `/api/system-health` health signals |
| Integrations | External connector layer | platform governance connector status |
| Tenant Health | Tenant context, organization, and workspace isolation controls | tenant guards and strict entitlement mode flag |
| AI Health | AI gateway readiness and guardrail posture | platform governance AI gateway status |
| Simulation Health | Simulation suite readiness | simulation health status and scenario route coverage |

## Status Model

Each domain resolves to one of three display states:

- `Healthy`: the surface is reachable or explicitly active.
- `Warning`: the surface is available in guarded, synthetic, demo, or partially configured mode.
- `Critical`: the surface is offline, failing, disabled, or explicitly unsafe.

The overall SaaS status uses worst-state rollup:

- Any `Critical` check makes the page `Critical`.
- Otherwise, any `Warning` check makes the page `Warning`.
- If every check is `Healthy`, the page is `Healthy`.

## Implementation Notes

The backend extends the existing observability module rather than introducing a parallel health subsystem. The SaaS health endpoint reuses platform governance observability for connector and AI status, backend system health for deployment metadata, and explicit environment flags for tenant and simulation status.

The frontend keeps a local critical fallback. If `/api/saas-health` cannot be reached, the page still renders all seven monitored domains as `Critical` so operators can distinguish endpoint outage from an empty page.

## Operational Use

Use `/saas-health` for daily platform readiness checks and incident triage. Use `/system-health` when you need lower-level deployment metadata, commit comparison, and raw health endpoint payloads.
