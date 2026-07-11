# CareDroid Sentinel Architecture

**Status:** Implemented (flag-gated)  
**Version:** 2026.07.11  
**Default:** `SENTINEL_ENABLED=false` — EDOS unchanged until explicitly activated.

## Purpose

Sentinel is the **integration spine** for EMS command, live AVL, pre-arrival intelligence, durable clinical/operational alarms, grounded AI recommendations (human review only), command-center overlays, and EMS analytics. It extends Emergency OS, fleet/live-tracking, interoperability, and AI Chief — it does not replace them.

## Module map

| Layer | Path |
|-------|------|
| Pure engines (shared) | `lib/sentinel/*` |
| Nest spine | `backend/src/modules/sentinel/*` |
| FE clients / view-models | `src/services/sentinel/*` |
| FE types | `src/types/sentinel.ts` |
| Command center integration | `src/pages/emergency/HospitalCommandCenter.tsx` |
| KPI overlay | `src/services/emergencyKpiLayerService.ts` |
| AVL WebSocket | `backend/src/api/ems.socket.ts` → `/ws/sentinel/avl` |
| Board SSE fan-out | Outbox → `EmergencyRealtimeService` topics `sentinel_*` |

## Runtime flags

| Env | Default | Meaning |
|-----|---------|---------|
| `SENTINEL_ENABLED` | `false` | Activate ingest, cron poll, escalation |
| `SENTINEL_MOCK_ADAPTER` | `true` | Deterministic CAD positions |
| `SENTINEL_FLEET_BRIDGE` | `false` | Map logistics fleet demo vehicles into AVL |
| `SENTINEL_POSTGIS` | `false` | Reserved; v1 uses JSON rings + ray casting |
| `SENTINEL_HOSPITAL_LAT` / `LNG` | NYC demo coords | ETA destination |
| `SENTINEL_ESCALATION_MS` | `180000` | Critical unacked → escalate |

## API surface (`/api/sentinel`)

- `GET /health` — adapters, outbox lag, alarm/analytics summary  
- `GET /command-snapshot` — units + ETA + inbound + alarms + AI pending  
- `GET /units`, `GET /units/:id/positions`, `GET /geofences`  
- `POST /ingest/cad` — vendor-agnostic webhook  
- `POST /poll` — force adapter poll  
- `GET|POST /inbound`, `POST /inbound/:id/prep-recommendation`  
- `GET|POST /alarms`, `POST /alarms/:id/:action`, `GET /alarms/:id/events`  
- `GET /ai/recommendations`, `POST /ai/recommendations/:id/review`  
- `GET /analytics` — dispatch-to-arrival, ETA MAE, alarm ack, AI acceptance, data quality  

## Safety rules

1. AI recommendations always `requiresHumanReview: true`.  
2. Deterministic clinical activation rules (e.g. trauma/stroke/STEMI) stay outside AI.  
3. Operational alarms never use fullscreen overlays (existing surface policy).  
4. Legacy `/api/ems/*` remains the EDOS compatibility path.

## Data durability

TypeORM entities under `sentinel_*` tables (SQLite-safe columns). Transactional **outbox** publishes domain events at-least-once with exponential backoff.

## Related report

See `docs/SENTINEL_ENGINEERING_REPORT.md` for full inventory, validation, risks, and recommendations.
