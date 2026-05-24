# Live Tracking Maps Implementation Report

## 1. What Existed Before

The codebase already contained partial frontend-only map and tracking work:

- `src/pages/HospitalMapDashboard.jsx` implemented a visible `/hospital-map` route with an SVG indoor floor plan, room/device markers, filters, a device detail drawer, telemetry timestamps, stale/offline states, and demo data labels.
- `src/pages/MedicalIotDashboard.jsx` implemented a visible `/medical-iot` route with Medical IoT device cards, vitals streams, telemetry charts, alerts, loading/error/empty states, and demo telemetry labels.
- `src/services/hospitalMapService.js`, `src/data/demoHospitalMapData.js`, and `src/services/medicalIotService.js` supplied frontend-only demo snapshots.
- Fleet pages existed for `/fleet/command`, `/fleet/route-optimizer`, and `/fleet/predictive-maintenance`, backed by `src/services/fleetTelemetryService.js` mock telemetry.

No map library was present in `package.json`. The frontend already used custom SVG/chart panels, so the first production-safe implementation uses lightweight SVG/coordinate map panels instead of adding Leaflet or another dependency.

## 2. What Was Hidden or Unwired

- Hospital Map and Medical IoT were already routed and registry-backed, but Medical IoT did not include a map/location marker panel or device location drawer.
- Fleet had mock vehicle telemetry but no visible fleet live map route.
- There was no canonical `/live-map` main operations map.
- There were no registry entries for `live-tracking-map` or `fleet-live-map`.
- Some map-shaped URLs would fall through to generic fallbacks instead of canonical map routes.

## 3. What Was Implemented

- Added `src/pages/LiveTrackingMap.jsx` and `src/pages/LiveTrackingMap.css` for the main operational live tracking map.
- Added `src/pages/fleet/FleetLiveMap.jsx` and `src/pages/fleet/FleetLiveMap.css` for fleet vehicle tracking.
- Extended `src/services/fleetTelemetryService.js` with `fetchFleetLiveTrackingSnapshot()`, demo GPS coordinates, route overlays, alerts, freshness states, and planned backend endpoint metadata.
- Extended `src/services/medicalIotService.js` with backend contract metadata, API-first snapshot loading, and demo device location fields.
- Added `backend/src/modules/live-tracking/` with authenticated, read-only demo contract endpoints for fleet, hospital maps, Medical IoT telemetry, and device alerts.
- Added `src/services/liveTrackingApi.js` so frontend map services can prefer backend contracts and fall back to clearly labeled local demo data when unavailable.
- Updated `src/pages/MedicalIotDashboard.jsx` and CSS to add a device location map, status/search filters, marker buttons, and a device detail drawer.
- Preserved `src/pages/HospitalMapDashboard.jsx` as the canonical indoor map implementation.
- Added polling refresh on `/live-map`, `/fleet/map`, `/hospital-map`, and `/medical-iot` using authenticated API clients where a backend is present.

## 4. Routes Added

- `/live-map`: main operational live tracking map.
- `/fleet/map`: fleet vehicle live tracking map.
- Existing `/hospital-map`: indoor hospital/floor/device map.
- Existing `/medical-iot`: Medical IoT dashboard with device location/status.

Aliases now redirect to canonical routes:

- `/maps`, `/tracking`, `/live-tracking` redirect to `/live-map`.
- `/fleet/live-map`, `/fleet/tracking` redirect to `/fleet/map`.

## 5. Inventory Entries Added

New entries:

- `live-tracking-map`
- `fleet-live-map`

Confirmed existing entries:

- `hospital-map`
- `medical-iot-dashboard`
- `device-fleet-management`

Wiring updated across:

- `src/data/toolRegistry.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/toolInventory.js`
- `src/data/commandDashboardModel.js`
- `src/data/sidebarToolPresentation.js`
- `src/navigation/iconRegistry.js`
- `src/routes/clinicalToolRoutes.js`
- `src/navigation/primaryNavigation.js`

## 6. Data Source Strategy

Current data strategy is API-first with demo-safe fallback:

- Fleet map first calls `/api/fleet/vehicles/live` and `/api/fleet/routes/active`; if unavailable, it uses demo GPS coordinates, route paths, freshness states, and alerts from `fetchFleetLiveTrackingSnapshot()`.
- Hospital map first calls `/api/hospital-map/floors` and `/api/hospital-map/devices`; if unavailable, it uses demo floor-plan coordinates from `buildDemoHospitalMapSnapshot()`.
- Medical IoT first calls `/api/devices/live`, `/api/telemetry/live`, and `/api/alerts/devices`; if unavailable, it uses demo telemetry and location fields from `buildDemoMedicalIotSnapshot()`.

The UI does not claim real operational data is live. Each map displays source labels, last updated timestamps, stale/offline states, and safety notes.

## 7. Backend Readiness

Read-only backend contracts now exist for the planned live tracking surface, but they intentionally return demo data until real telemetry integrations are available.

Implemented authenticated endpoints:

- `GET /fleet/vehicles/live`
- `GET /fleet/routes/active`
- `GET /hospital-map/floors`
- `GET /hospital-map/devices`
- `GET /devices/live`
- `GET /telemetry/live`
- `GET /alerts/devices`

Frontend callers use `/api/...` paths through the existing API client. Backend responses include explicit `demo: true` and source labels; real GPS, RTLS, device registry, telemetry, and alert services should replace these demo contracts without changing the frontend-facing response shapes.

Access and audit controls:

- Backend endpoints require JWT authentication and `READ_PHI`, `VIEW_ANALYTICS`, or `CONFIGURE_SYSTEM` access.
- Frontend routes use matching permission gates for `/live-map`, `/fleet/map`, `/hospital-map`, and `/medical-iot`.
- Each backend read records an audit entry with `CLINICAL_DATA_ACCESS`, `phiAccessed: true`, the viewed resource, count metadata, and a demo/tracking-support flag.
- Current refresh strategy is authenticated polling every 60 seconds. Websocket/SSE subscriptions remain a later upgrade once real event streams exist.

## 8. Safety Notes

Implemented safety constraints:

- Demo/mock data is labeled on every map surface.
- Backend demo contract responses carry `demo: true` and source labels.
- Last updated timestamps are visible.
- Stale/offline states are visually distinct.
- Sensitive tracking routes are permission-gated in the frontend and backend.
- Backend access to map/device/telemetry contracts is audit logged.
- Fleet map states that it does not dispatch units or control telematics.
- Medical IoT states that telemetry is monitoring support only and not live patient data.
- Hospital map states it is not a replacement for bedside alarms.
- The main live map states it is not a replacement for clinical alarms, dispatch systems of record, or clinician/dispatcher decisions.

## 9. Tests Added or Updated

- `src/pages/LiveTrackingMaps.test.jsx`
  - `/live-map` renders.
  - `/fleet/map` renders.
  - markers render from demo data.
  - filters work.
  - detail drawer opens.
  - stale/offline state renders.
  - backend failure state renders.
  - compact/mobile map layout markers exist.
- `src/pages/MedicalIotDashboard.test.jsx`
  - Medical IoT location map renders.
  - markers render from demo data.
  - filters work.
  - detail drawer opens.
  - compact/mobile layout markers exist.
- `src/pages/tools/ToolsOverview.inventory.test.jsx`
  - map tools exist in `/tools`.
  - search exposes map and Medical IoT tools.
- `src/test/routePagesSmoke.test.jsx` and `src/test/responsiveRegression.routes.js`
  - route smoke coverage for `/live-map` and `/fleet/map`.
- `src/data/commandDashboardModel.test.js`
  - command dashboard includes `live-tracking-map`, `fleet-live-map`, `fleet-command`, `device-fleet-management`, and `medical-iot-dashboard`.

## 10. Remaining Future Work

- Replace backend demo contracts with real GPS, RTLS, device registry, telemetry, and alert service integrations.
- Add websocket or SSE subscriptions for true event-driven updates once real streams exist.
- Add real geospatial projection or Leaflet/OpenStreetMap for outdoor fleet once dependency and privacy posture are approved.
- Add hospital floor asset import support for actual floor plans.
- Add stricter organization/site/unit scoping if operational maps require tenant-level or facility-level access boundaries.
- Add audit reporting dashboards for sensitive live location or telemetry views.
