# Release notes — Clinical tools production hardening

**Release name:** CareDroid Clinical AI — A-to-Z wiring hardening  
**Version:** 1.0.0 (hardening patch)  
**Date:** 2026-05-19

## Overview

This release strengthens how the clinical web app talks to the Nest API: every shipped tool has a documented route and execution mode, only three tools use server-side POST executors, API misconfiguration is visible to users, and automated tests guard against blank pages and wiring drift.

## For clinicians and operators

- Clinical tools open from the catalog, sidebar, and deep links without empty screens.
- Drug interaction check, lab interpretation, and SOFA scoring call the backend when online; failures show clear messages instead of silent errors.
- Unknown or mistyped tool names route to guided chat help rather than broken pages.
- Mobile and tablet layouts improved for tools, fleet dashboards, and the clinical catalog (no page-level horizontal scrolling in regression tests).

## For administrators and DevOps

- Configure the SPA with same-origin `/api` proxy or set `VITE_API_URL` to your API host at build time.
- Ensure Nest `FRONTEND_URL` matches the SPA origin for CORS and OAuth.
- Audit logs use `/api/audit` (double-prefix issue corrected).
- See [ENVIRONMENT_CHECKLIST.md](./ENVIRONMENT_CHECKLIST.md) and [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md).

## For developers

### New documentation

- [Backend ↔ frontend tool contract](../backend-frontend-tool-contract.md) — full wiring matrix
- [Tool render / execute matrix](../tool-render-execute-matrix.md) — Tier A/B/C modes
- [Proxy configuration audit](../proxy-config-audit.md)
- [Unsupported orchestrator tools](../unsupported-orchestrator-tools.md)
- [Build validation report](../build-validation-report.md)

### New test commands

- `npm run test:contract-matrix`
- `npm run test:executor-mapping`
- `npm run test:tool-render-smoke`
- `npm run test:responsive-regression`

### Breaking changes

None for end users. Internal test expectations updated for:

- Calculator routes generated from `CALCULATOR_ROUTE_DEFS` (not literal strings in `App.jsx`)
- Unknown catalog ids resolving to dashboard + chat seed

## Known limitations

- Only **three** backend tool executors: SOFA, drug interactions, lab interpreter. Other calculators run in the browser or via chat.
- Backend unit tests: partial pass — track follow-up before relying on CI backend suite.
- Tool result sharing API documented as not implemented (`tools-share-results`).
- Playwright responsive suite may timeout on a few calculator pages; layout overflow checks pass.

## Upgrade steps

1. Pull latest `main` (or release branch).
2. `npm ci` (root) and `cd backend && npm ci`.
3. Update `.env` from `.env.example` files.
4. `npm run build` and deploy `dist/`; `cd backend && npm run build` and restart API.
5. Run smoke: `npm run smoke` and QA checklist in [QA_CHECKLIST.md](./QA_CHECKLIST.md).

## Support

Report wiring mismatches with registry tool id, URL, and screenshot. Reference the contract matrix row from `npm run contract:write-docs` output.
