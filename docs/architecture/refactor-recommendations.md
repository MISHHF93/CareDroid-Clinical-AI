# Refactor Recommendations

Generated: 2026-06-12

Mode: recommendations plus low-risk cleanup. The duplicate legacy Android Retrofit interface was removed; remaining native API contract drift is still quarantined.

## Ranking Key

| Priority | Meaning |
| --- | --- |
| P0 | Blocks pilot customer |
| P1 | Blocks workflow |
| P2 | Technical debt |
| P3 | Future optimization |

## P0 - Blocks Pilot Customer

| Issue | Evidence | Recommendation |
| --- | --- | --- |
| Emergency OS backend source of truth is not canonical. | Active UI uses `store/emergencyStore.ts`; optional `/api/capacity`, `/api/ems`, `/api/reassessment`, `/api/copilot` are not consumed. | Decide one canonical backend path for Emergency OS pilot data. Either make Nest/TypeORM the canonical Emergency OS backend or promote the optional Mongoose runtime and wire it intentionally. |
| Pilot can confuse demo/local mode with production connectivity. | `ENABLE_MONGOOSE_EMERGENCY_OS` gates backend Emergency routes; many integrations return demo/readiness data; frontend still renders from local store. | Add a readiness/status surface for backend mode, Mongo availability, demo auth, FHIR/HL7 status, Firebase, AI provider, Stripe, and notification channel readiness before customer use. |
| First customer workflow is not verified end-to-end against backend. | New patient/reassessment/discharge flows are store-first; backend endpoints exist but are not consistently consumed. | Run and codify a customer walkthrough: login -> create patient -> triage -> whiteboard -> reassessment -> discharge. Treat failures as release blockers. |
| Live integration claims would be misleading. | FHIR/HL7/EHR/IoT/fleet endpoints are demo/readiness contracts, not live connectors. | Hide or label live integrations as demo/readiness-only for pilot materials. |
| Native Android API contract is stale. | The duplicate legacy Retrofit interface was removed, but the remaining Android Retrofit client still references routes that do not match current Nest APIs. | Quarantine native Android from pilot scope or update its API contract before demoing mobile. |

## P1 - Blocks Workflow

| Issue | Evidence | Recommendation |
| --- | --- | --- |
| Smart Intake backend flow is partial. | `SmartIntakeApi` has manual/document/OCR/match/verify methods, but visible UI primarily renders `SMART_INTAKE_DEMO`. | Wire backend session output into Smart Intake panels or explicitly keep Smart Intake as demo-only for pilot. |
| EMS backend events are emitted but not subscribed by frontend. | Optional EMS routes emit Socket.IO whiteboard events; frontend uses other realtime clients and no matching room subscription. | Implement one realtime contract or remove event-driven claims from workflow expectations. |
| Reassessment backend is disconnected from reassessment UI. | `/api/reassessment/*` exists, but route uses store flags and actions only navigate/select patient. | Add reassessment API client and action flow after backend source decision. |
| Referral persistence path is split. | Platform `/api/referrals` exists, while UI writes through disabled/gated `/api/emergency/referrals`. | Normalize referral create/history/status to one backend path. |
| Copilot has duplicate APIs. | Optional `/api/copilot/query` exists; visible Copilot uses `/api/chat/message`. | Select one pilot Copilot API and retire/redirect the other. |
| Feature flag/settings state is duplicated. | `featureStore.ts`, `EmergencySettings` local drafts, `FeatureManagement`, and backend feature APIs overlap. | Make `featureStore.ts` the single frontend writer and route all settings screens through it. |
| Disabled backend capabilities are visible in places. | `backendApiCapabilities.js` marks chat persistence, streams, bulk sync, reports/export, notification channels disabled. | Ensure UI labels disabled capabilities as unavailable or hides them from first-customer workflow. |

## P2 - Technical Debt

| Issue | Evidence | Recommendation |
| --- | --- | --- |
| Legacy workspace artifacts remain. | `WorkspaceHome.jsx`, `ShiftSummary.jsx`, and `/workspace/emergency/*` compatibility paths remain, but active routes redirect. | Move to future-module review after pilot route contract stabilizes. |
| Tool catalog/pages are mostly unmounted. | `/tools/*` routes redirect to `/emergency/copilot`; many tool pages are inventory/test artifacts. | Keep active embedded calculators/drug checker; archive or label other tool pages as future modules. |
| Multiple navigation projections exist. | `APP_SHELL_NAV_ITEMS` is active; broader nav arrays remain in `navigation.config.js`. | Collapse active pilot nav to one source and mark other projections future-only. |
| API inventories drift from runtime. | Some inventory entries list service-only or planned endpoints as if wired UI. | Split API inventory into `wired-ui`, `service-only`, `planned`, `disabled`, and `legacy`. |
| Large JS/JSX surface is not typechecked. | `tsconfig.frontend.json` covers TS/TSX; much active UI is JS/JSX. | Gradually migrate critical Emergency OS paths to TS/TSX or add stronger runtime tests. |
| Optional Express/Mongoose runtime duplicates Nest platform/demo routes. | Emergency patients/referrals/EMS/intake exist in both platform/Nest/demo and optional Mongoose layers. | Normalize after pilot scope decision; avoid supporting both as production sources. |
| Environment/config drift exists. | Mixed root/back-end env key groups, Node 18/20 split, Capacitor 5/8 version mismatch. | Clean configuration after runtime source-of-truth decision. |
| Docs/report sprawl is high. | `docs/architecture` contains many generated reports from multiple audit passes. | Keep current inventory/readiness docs; archive older generated reports later. |

## P3 - Future Optimization

| Issue | Evidence | Recommendation |
| --- | --- | --- |
| Bundle warnings remain. | Vite build reports large chunks and mixed static/dynamic `offlineService` import. | Code split after pilot workflow is stable. |
| Tailwind config is dormant. | Tailwind config exists without active dependency/usage. | Remove or activate intentionally during styling cleanup. |
| Platform marketplace/commercial modules are broad. | Product catalog, marketplace, governance, success, commercial pages exist beyond ED pilot scope. | Keep outside pilot; revisit after first customer workflow is reliable. |
| Integration readiness is mostly static/demo. | FHIR/HL7/EHR/provincial/IoT connectors are placeholders or demo contracts. | Convert to tenant connector records with explicit status, credentials, last test, last sync, and no-writeback policy. |
| Observability stack is rich but optional. | Sentry/Datadog/Prometheus configured, not guaranteed enabled locally. | Add pilot deployment checklist for telemetry activation. |
| Android native app may be valuable later. | Native codebase exists; duplicate API service was removed, but the remaining API contract is stale and local compile is blocked until `ANDROID_HOME`/`local.properties` is configured. | Rebuild native API layer after web pilot stabilizes. |

## Recommended Normalization Order

1. Freeze the active pilot route list and first-customer walkthrough.
2. Pick canonical Emergency OS backend source of truth.
3. Add backend readiness banner/status API.
4. Wire backend hydration for patients, rooms, staff, EMS, capacity, reassessment, referrals.
5. Verify first-customer workflow with automated browser test.
6. Archive or label legacy workspace/tool/platform artifacts.
7. Clean API inventories and feature flags.
8. Refactor and type-migrate critical JS/JSX paths only after workflow stability.

## Do Not Do Yet

- Do not delete uncertain legacy code before the canonical backend decision.
- Do not add new modules or pages.
- Do not refactor the full platform surface.
- Do not advertise live FHIR/HL7/EHR/IoT/fleet integrations until real credentials and acceptance tests exist.
- Do not demo Android as production-ready until API contracts are aligned.
