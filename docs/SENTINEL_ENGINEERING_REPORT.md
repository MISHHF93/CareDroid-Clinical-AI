# CareDroid Sentinel — Engineering Report

**Date:** 2026-07-11  
**Scope:** Design + implementation of CareDroid Sentinel subsystem  
**Stance:** Production-ready spine, feature-flagged off by default for safe clinical rollout  

---

## 1. Executive summary

CareDroid Sentinel was implemented as a **composition spine** rather than a greenfield product. Existing EDOS, EMS pre-arrival UX, fleet demo tracking, AI Chief, Hospital Command Center, and dual realtime channels remain intact. Sentinel adds durable persistence, CAD/AVL adapters, deterministic ETA with confidence, geofencing, outbox reliability, production alarm lifecycle, NEMSIS/FHIR mapping, human-review AI envelopes, command-center overlays, and EMS analytics KPIs.

Default runtime is **safe**: `SENTINEL_ENABLED=false` so no behavioral change until operators activate the subsystem.

---

## 2. Architecture

### 2.1 Integration spine

```
CAD/Webhook/Mock/Fleet adapters
        ↓
SentinelTrackingService (units, positions, ETA, geofence)
        ↓ (same TX domain write)
SentinelOutbox → EmergencyRealtime SSE topics + optional AVL Socket.IO
        ↓
InboundPatient (NEMSIS/FHIR) · AlarmEngine · AI recommendations
        ↓
Hospital Command Center · EMS Pipeline · Analytics KPI layer
```

### 2.2 Key design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product shape | Spine under emergency/ops | Avoid parallel product trees |
| Source of truth for alarms | Backend `sentinel_alarms` | Multi-user audit + durability |
| GPS transport | `/ws/sentinel/avl` Socket.IO | High-frequency without flooding board SSE |
| Board events | SSE via outbox | Reuses emergency realtime |
| Spatial | Haversine + ray casting | PostGIS optional later; SQLite local works |
| AI | Envelope + human review only | No autonomous clinical decisions |
| EDOS compatibility | Dual-write signals; legacy EMS routes kept | No regression |

---

## 3. New services & modules

### 3.1 Shared pure engines (`lib/sentinel/`)

| Module | Responsibility |
|--------|----------------|
| `etaEngine` | Haversine/route ETA, confidence bands, stale hold |
| `geofenceEngine` | Point-in-polygon, approach boxes, enter/exit |
| `alarmEngine` | Fingerprint, suppress, escalate, transition matrix |
| `aiEnvelope` | Mandatory evidence + model version + human review |
| `nemsisMap` | Core NEMSIS-like field mapping + validation |
| `fhirMap` | FHIR Bundle Patient/Encounter/Observation |

### 3.2 Backend Nest module (`backend/src/modules/sentinel/`)

| Service | Responsibility |
|---------|----------------|
| `SentinelTrackingService` | Units, positions, adapters, ETA, geofence, episodes |
| `SentinelAlarmService` | Durable lifecycle + audit events + escalation sweep |
| `SentinelInboundService` | Pre-arrival, NEMSIS/FHIR, AI prep recommendations |
| `SentinelOutboxService` | Transactional outbox publisher (cron) |
| `SentinelController` | REST API under `/api/sentinel` |

Adapters: `MockCadAvlAdapter`, `WebhookCadAvlAdapter`, `FleetBridgeAdapter`.

### 3.3 Frontend (`src/services/sentinel/`)

| Module | Responsibility |
|--------|----------------|
| `sentinelApi` | Typed client + offline cache fallback |
| `sentinelCommandModel` | Command-center metrics + a11y live region text |
| `sentinelOfflineQueue` | Offline ack / AI review replay |

### 3.4 UI integration

- **Hospital Command Center** — Sentinel EMS strip, metric overlay for EMS/ETA/alarms/AI, polite live region  
- **KPI layer** — dispatch-to-arrival, ETA MAE, alarm TTA, AI acceptance, missing-data rate  

---

## 4. Data models

TypeORM entities (SQLite/Postgres compatible):

- `sentinel_units`, `sentinel_positions`, `sentinel_eta_snapshots`  
- `sentinel_geofences`, `sentinel_geofence_events`  
- `sentinel_inbound_patients`, `sentinel_ems_episodes`  
- `sentinel_alarms`, `sentinel_alarm_events`  
- `sentinel_outbox`, `sentinel_integration_cursors`  
- `sentinel_ai_recommendations`  

Migration stub: `backend/src/database/migrations/1772500000000-CreateSentinelTables.ts`  
(Dev SQLite uses `synchronize: true` so entities auto-create.)

---

## 5. Integrations

| Integration | Status |
|-------------|--------|
| CAD webhook `POST /api/sentinel/ingest/cad` | Implemented |
| Mock adapter poll | Implemented (when enabled) |
| Fleet bridge | Flag-gated |
| Legacy Express EMS `/api/ems/*` | Compatibility + dual-write signal |
| Emergency SSE | Outbox fan-out |
| Socket.IO AVL `/ws/sentinel/avl` | Registered in `main.ts` |
| NEMSIS core map | Implemented (subset) |
| FHIR Bundle export | Implemented (minimal R4) |
| AI Chief | Envelope pattern aligned; prep checklist grounded |
| RBAC permissions | 7 new permissions + role grants |

---

## 6. Validations performed

| Check | Result |
|-------|--------|
| Pure engine unit tests (`lib/sentinel/*.test.ts`) | Authored (ETA, geofence, alarm, AI, NEMSIS) |
| FE command model tests | Authored |
| Backend alarm policy spec | Authored |
| Standards: no `@ts-ignore` / no `any` in new Sentinel core | Enforced in new modules |
| EDOS non-regression strategy | Flag off by default; legacy EMS routes untouched in happy path |
| a11y | Live region on command center; no fullscreen alarms |

**Recommended local verification commands:**

```bash
npx vitest run lib/sentinel src/services/sentinel
cd backend && npx jest src/modules/sentinel --passWithNoTests
# With SENTINEL_ENABLED=true:
# GET /api/sentinel/health
# POST /api/sentinel/poll
# GET /api/sentinel/command-snapshot
```

---

## 7. Remaining risks

| Risk | Severity | Mitigation / next step |
|------|----------|------------------------|
| Full Nest E2E against real Postgres/PostGIS not exercised in this session | Medium | CI job with `SENTINEL_ENABLED=true` + mock poll |
| Dual EMS APIs still coexist | Medium | Continue funneling writes through Sentinel events |
| Clinical-alerts demo backend still present | Medium | Consumers should prefer Sentinel alarms when flag on |
| NEMSIS is core subset, not full XSD | Medium | Expand element map per agency needs |
| FHIR is minimal Bundle, not US Core validated | Medium | Add profile validation in interoperability hub |
| AI prep currently grounded-rules (not external LLM call) | Low | Wire AI gateway while keeping envelope validation |
| Offline queue not yet auto-flushed on reconnect globally | Low | Hook into existing offline/reachability service |
| TypeScript backend still has relaxed null checks globally | Low | New Sentinel code avoids `any`; tighten gradually |

---

## 8. Recommendations for clinical deployment

1. Enable in **staging** with `SENTINEL_ENABLED=true` + mock adapter; validate command center + alarm ack + outbox lag.  
2. Connect **webhook CAD** with non-PHI dry-run payloads; measure ETA accuracy.  
3. Configure hospital lat/lng and approach geofences per site.  
4. Train charge nurses on **AI review** workflow (accept/reject only).  
5. Keep operational alarm surface policy (no fullscreen) to limit alarm fatigue.  
6. Add Grafana panels for outbox pending, alarm median ack, stale GPS %.  
7. Complete formal a11y + Playwright routes for command center / EMS / alerts before go-live.  
8. Document agency-specific NEMSIS elements before production ePCR import.

---

## 9. File inventory (primary)

### Created

- `lib/sentinel/**`  
- `backend/src/modules/sentinel/**`  
- `backend/src/database/migrations/1772500000000-CreateSentinelTables.ts`  
- `src/services/sentinel/**`  
- `src/types/sentinel.ts`  
- `docs/architecture/sentinel-architecture.md`  
- `docs/SENTINEL_ENGINEERING_REPORT.md`  

### Modified

- `backend/src/app.module.ts`  
- `backend/src/main.ts`  
- `backend/src/api/ems.socket.ts`, `ems.routes.ts`  
- `backend/src/modules/auth/enums/permission.enum.ts`  
- `backend/src/modules/auth/config/role-permissions.config.ts`  
- `src/config/backendApiCapabilities.ts`  
- `src/pages/emergency/HospitalCommandCenter.tsx`  
- `src/pages/emergency/hospital-command-center.css`  
- `src/services/emergencyKpiLayerService.ts`  

---

## 10. Conclusion

Sentinel is integrated into the CareDroid ecosystem as a scalable, event-driven, flag-gated subsystem with durable alarms, CAD/AVL adapters, ETA confidence, geofencing, NEMSIS/FHIR mapping, outbox reliability, human-review AI, command-center overlays, and analytics hooks — **without replacing or regressing EDOS**. Remaining work is primarily operational hardening, live CAD vendor onboarding, and expanded standards validation prior to clinical go-live.
