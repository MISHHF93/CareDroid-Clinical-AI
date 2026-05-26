# Hospital Map + Medical IoT + Device Fleet Implementation Report

Status: implemented frontend operations layer with demo/live contract fallback

## 1. Current Findings

- Complete: `/hospital-map`, `/medical-iot`, `/fleet/map`, and `/live-map` already existed as routed React pages with responsive layouts, demo labels, marker canvases, and stale/offline states.
- Partial: device fleet management existed inside the Hospital Map page and inventory, but did not have the canonical `/devices` route.
- Partial: Medical IoT telemetry showed major vitals and charts, but the demo parameter set did not expose all requested parameters or signal/assigned room-bed metadata.
- Partial: Hospital Map showed rooms and device markers, but bed markers were not visible on the floor-plan layer.
- Backend-only/demo-contract: Nest live-tracking controllers expose read-only demo contracts for fleet, hospital map, Medical IoT devices, telemetry, and alerts.
- Mock-only: device assignment, maintenance actions, calibration updates, firmware actions, and location assignment remain local/demo only.
- Missing: production write APIs and live vendor/RTLS/device feeds are not implemented.

## 2. What Existed Before

- `src/pages/HospitalMapDashboard.jsx` rendered the hospital floor map, devices, alerts, telemetry detail drawer, filters, and a device fleet table.
- `src/pages/MedicalIotDashboard.jsx` rendered connected-device cards, vitals, demo location markers, alert cards, and telemetry charts.
- `src/pages/fleet/FleetLiveMap.jsx` rendered fleet vehicle markers, route overlays, ETA, freshness, maintenance warnings, and demo GPS source labels.
- `src/pages/LiveTrackingMap.jsx` rendered a combined fleet/hospital/IoT tracking canvas.
- Inventory IDs already existed for `hospital-map`, `medical-iot-dashboard`, `device-fleet-management`, `telemetry-monitoring`, `fleet-live-map`, and `live-tracking-map`.

## 3. What Was Implemented

- Added `src/pages/DeviceFleetManagement.jsx` and `src/pages/DeviceFleetManagement.css` as a dedicated `/devices` route.
- Added device fleet filters for status, type, unit/location, maintenance state, and search by ID, room, bed, firmware, or serial.
- Added device inventory columns/cards for assignment, maintenance, calibration, firmware, battery, signal, connectivity, utilization, and demo action state.
- Added a device detail panel with service context and location history placeholder.
- Added local-only demo actions for "mark maintenance needed" and "assign location"; no backend write API is called.
- Added bed markers to the hospital SVG floor-plan layer.
- Expanded Medical IoT demo telemetry with respiratory rate, temperature, oxygen flow, infusion state, and ventilator mode.
- Added Medical IoT signal strength, assigned room/bed, and active-alert visibility.

## 4. Routes Added

- `/devices`: dedicated Device Fleet Management page.

Routes already present and retained:

- `/hospital-map`
- `/medical-iot`
- `/fleet/map`
- `/live-map`

## 5. Inventory Entries Added or Updated

- `device-fleet-management` now launches `/devices`.
- `device-maintenance` now launches `/devices`.
- `hospital-map`, `medical-iot-dashboard`, `telemetry-monitoring`, `fleet-live-map`, and `live-tracking-map` remain launchable from the unified inventory.
- `TOOL_LAUNCH_PATHS.deviceFleet` was added as `/devices`.
- `toolInventory.js` maps device fleet and maintenance surfaces to `src/pages/DeviceFleetManagement.jsx`.

## 6. Data Source Strategy

- Frontend services attempt existing backend demo read contracts when the capability flag is enabled.
- If backend requests are unavailable, the UI falls back to deterministic demo data with explicit labels.
- Demo labels are shown in route source strips, safety notes, map panels, and visual sections.
- Write-like actions are local-only and visibly marked as demo/local only.

## 7. Backend/API Status

Existing read-only demo contracts:

- `GET /api/hospital-map/floors`
- `GET /api/hospital-map/devices`
- `GET /api/devices/live`
- `GET /api/telemetry/live`
- `GET /api/alerts/devices`
- `GET /api/fleet/vehicles/live`
- `GET /api/fleet/routes/active`

Planned but not implemented as live/write support:

- `GET /api/devices`
- `GET /api/devices/:id`
- `GET /api/devices/:id/telemetry`
- `GET /api/devices/:id/location-history`
- `GET /api/devices/:id/maintenance`
- device assignment, maintenance, calibration, firmware, status mutation, and alert acknowledgement endpoints.

## 8. Demo/Live Distinction

- The current implementation is demo-backed unless a backend demo contract responds.
- Backend demo contracts are still labeled as demo contracts and are not represented as live hospital feeds.
- Stale/offline timestamps are visible in Hospital Map, Medical IoT, Device Fleet, Fleet Map, and Live Map.
- Safety copy states that these views are monitoring/planning support only and not replacements for bedside alarms or systems of record.

## 9. AI Assistant Integration

- Added NLU/catalog aliases for prompts such as "show hospital map", "open medical iot dashboard", "open device fleet", "show telemetry monitoring", "which devices have low battery", and "which rooms have active alerts".
- `resolveCatalogLaunch()` now resolves "open device fleet" to `/devices`.
- Backend intent patterns for `hospital-command-assistant` include the hospital map, Medical IoT, device fleet, telemetry, low battery, offline device, live fleet map, and active-alert prompt family.
- No backend executor is claimed for these map/fleet pages; Assistant behavior remains launch/read-only support.

## 10. Safety Notes

- Not a replacement for bedside alarms.
- Not a source of autonomous dispatch, clinical transport, bed assignment, maintenance scheduling, firmware updates, or medical device control.
- Patient labels remain placeholders in demo data.
- Any future write API must include RBAC, audit logging, validation, rollback/failure handling, and clear regulated workflow ownership.

## 11. Tests Added or Updated

- Added `src/pages/DeviceFleetManagement.test.jsx`.
- Updated route smoke coverage to include `/devices`.
- Updated Hospital Map tests for visible bed markers.
- Updated Medical IoT tests for expanded telemetry parameters, signal strength, room/bed metadata, and active alerts.
- Updated hospital operations wiring tests for `/devices`, launch paths, and aliases.
- Updated responsive QA route inventory to include `/devices`.

## 12. Remaining Work

- Implement real backend modules for device registry, telemetry, alerts, maintenance, calibration, and location history.
- Add audited write endpoints only after product and compliance review.
- Connect live RTLS/BLE/UWB/vendor telemetry feeds when available.
- Add real floor-plan assets and unit-specific layout configuration.
- Add backend tests for future DTOs, permissions, audit events, freshness calculation, and mutation failures.
- Add end-to-end browser validation across the full requested mobile viewport matrix before production release.
