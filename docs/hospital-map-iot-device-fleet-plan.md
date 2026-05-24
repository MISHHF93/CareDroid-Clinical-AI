# Hospital Map + Medical IoT Device Fleet Management Plan

Status: architecture and implementation plan
Scope: hospital interior mapping, Medical IoT telemetry, device fleet management, alerting, maintenance, AI assistant integration, NestJS backend contracts, responsive frontend implementation, safety, compliance, and tests
Non-goal: this plan does not implement frontend or backend code

## 1. Executive Summary

CareDroid should add a first-class hospital operations layer centered on a canonical `/hospital-map` route. The new system should connect hospital floors, units, rooms, beds, medical devices, IoT sensors, patient-monitoring devices, telemetry streams, alerts, maintenance state, and fleet utilization into one operational view.

The current codebase already has the right foundation: `src/App.jsx` owns protected routes, `src/layout/AppShell.jsx` provides the responsive authenticated shell, `src/data/toolInventory.js` and `src/data/clinicalToolIdContract.js` define canonical tool IDs, `src/data/commandDashboardModel.js` curates Command Dashboard panels, `/medical-iot` is already a first-class route, `/fleet/*` pages model operations concepts with honest mock/local labeling, and the frontend/backend contract matrix lives in `src/data/frontendApiCallsInventory.js`, `src/data/backendHttpRouteInventory.js`, `src/config/backendApiCapabilities.js`, and `docs/backend-frontend-tool-contract.md`.

The recommended architecture extends those foundations rather than creating a parallel subsystem:

- Add `/hospital-map` as a protected first-class route with Command Dashboard, Operations workspace, Tool Library, quick launcher, and Assistant entry points.
- Preserve `/medical-iot` as a first-class Medical IoT dashboard, not a hidden generic tool page.
- Add device fleet management as a dedicated capability that shares data contracts with Medical IoT and Hospital Map instead of duplicating device state.
- Start with clearly labeled demo telemetry and SVG/floor-plan coordinates for indoor maps.
- Promote to live backend APIs only after NestJS modules, DTOs, contract inventories, safety labeling, timestamps, stale-data handling, audit events, and tests exist.

## 2. Product Rationale

Hospital operations teams need a real-time mental model of where devices are, which beds and units are affected by alerts, and which devices are offline, stale, low-battery, overdue for calibration, or underused. Clinicians also need patient-monitoring context that is timestamped and visibly limited when stale or demo-backed.

This capability belongs in CareDroid because it connects three existing product directions:

- Clinical intelligence: telemetry and alerts can provide context to Assistant workflows, patient summaries, and operational questions.
- Operations: hospital map, device fleet, maintenance, utilization, and alert review fit naturally beside `/operations` and existing fleet surfaces.
- Tool inventory: every user-visible capability should be launchable, discoverable, contract-tested, and honest about backend readiness.

The system must remain monitoring support only. It should not replace bedside alarms, command medical devices, make autonomous clinical decisions, assign beds, or perform maintenance actions without human review.

## 3. Canonical Routes

Recommended frontend route ownership:

- `/hospital-map`: canonical Hospital Map Dashboard. Protected route rendered inside `AppShellPage`.
- `/medical-iot`: existing canonical Medical IoT Dashboard. Keep as a first-class route and expand it rather than burying it under `/tools`.
- `/operations`: existing Operations landing page. Add Hospital Map and Device Fleet Management cards here.
- `/tools`: Tool Library discovery. Include Hospital Map, Medical IoT, telemetry, fleet, and maintenance entries for search/filtering.
- `/assistant`: Assistant workspace for questions such as "Which devices are offline?" and "Show ICU devices with low battery."

Optional future subroutes after the first implementation:

- `/hospital-map/floors/:floorId`
- `/hospital-map/units/:unitId`
- `/hospital-map/rooms/:roomId`
- `/hospital-map/devices/:deviceId`
- `/hospital-map/alerts`
- `/hospital-map/fleet`
- `/hospital-map/maintenance`

Keep the first release simple: one route, querystring/deep-link state for selected floor/unit/device, and a responsive drawer for details.

## 4. Inventory IDs

Recommended canonical inventory IDs:

- `hospital-map`: Tier A first-class routed page for hospital floor/unit/room/bed/device visualization.
- `medical-iot-dashboard`: existing Tier A first-class routed page for connected devices, vitals streams, telemetry, and alert summary.
- `device-fleet-management`: Tier A or platform page for device inventory, assignment, utilization, maintenance, calibration, firmware, and location history.
- `telemetry-monitoring`: Tier B/Tier C capability for telemetry status, stale-data detection, and live stream monitoring. It may launch to `/hospital-map` or `/medical-iot` rather than owning a separate page in Phase 1.
- `device-maintenance`: Tier B/Tier C capability for maintenance queues, calibration due dates, and service records. It may launch to fleet management in Phase 1.
- `hospital-operations-command`: Tier A operations command concept that summarizes hospital map, device fleet, Medical IoT, alerts, and utilization. It should extend Command Dashboard and `/operations`, not bypass them.

Required inventory updates when implemented:

- Add IDs to `src/data/clinicalToolIdContract.js` under an operations/hospital-device group.
- Add launch paths to `TOOL_LAUNCH_PATHS`.
- Add component mappings and metadata to `src/data/toolInventory.js`.
- Add aliases such as "hospital map", "device fleet", "telemetry monitoring", "offline devices", "low battery devices", "maintenance overdue", and "beds with alerts".
- Update `src/data/commandDashboardModel.js` so Hospital Map and device fleet appear in dashboard panels.
- Update `src/pages/tools/ToolsOverview.jsx` filters if a separate `hospital-ops` filter is useful, or include these under existing Operations/Medical IoT filters.
- Update workspace defaults in `WorkspaceContext` so existing custom workspaces do not hide the new capabilities unintentionally.

## 5. Frontend Architecture

Planned module structure:

- `src/pages/HospitalMapDashboard.jsx`: route-level page for `/hospital-map`.
- `src/pages/HospitalMapDashboard.css`: page layout, responsive map/detail grid, mobile drawer behavior, status badges, and no-overflow rules.
- `src/components/hospital-map/FloorPlanViewer.jsx`: SVG/floor-plan viewer with pan/zoom, keyboard-accessible markers, and layer toggles.
- `src/components/hospital-map/HospitalLayerControls.jsx`: floor, unit, device type, status, alert, and maintenance filters.
- `src/components/hospital-map/DeviceMarker.jsx`: map marker rendering for device health, alerts, assignment, and telemetry freshness.
- `src/components/hospital-map/RoomBedLayer.jsx`: room/bed overlays and occupancy/assignment hints.
- `src/components/hospital-map/DeviceDetailDrawer.jsx`: desktop side panel and mobile bottom drawer for device, bed, telemetry, alert, maintenance, and location details.
- `src/components/hospital-map/TelemetryParametersPanel.jsx`: parameter cards for vitals and device state.
- `src/components/hospital-map/DeviceFleetTable.jsx`: sortable/filterable inventory and utilization table.
- `src/components/hospital-map/DeviceAlertsList.jsx`: alert queue with severity, source, timestamp, age, and state.
- `src/services/hospitalMapService.js`: guarded API client with demo fallback and clear source labels.
- `src/data/demoHospitalMapData.js`: deterministic mock floors, units, rooms, beds, devices, telemetry, alerts, and maintenance data.

The page should reuse existing design patterns:

- `AppShellPage` route wrapping from `src/App.jsx`.
- Command Dashboard launch behavior through `applyRegistryToolLaunch()`.
- Tool Library projections from `getUserFacingToolRegistryProjection()`.
- Dashboard visual cards where appropriate from `components/dashboard/DashboardVisualizations`.
- Fleet safety copy style from `src/pages/fleet/FleetPageChrome.jsx` and `src/pages/fleet/fleetUxShared.css`.
- Medical IoT demo-labeling patterns from `src/services/medicalIotService.js` and `src/pages/MedicalIotDashboard.jsx`.

## 6. Hospital Map UX

The Hospital Map Dashboard should be the primary operational experience.

Core layout:

- Header: title, "Demo telemetry" or "Live telemetry" source badge, last updated timestamp, backend state, and "Ask Assistant" action.
- Summary metrics: floors, rooms, beds, connected devices, offline devices, active alerts, stale telemetry, maintenance overdue, calibration overdue, and utilization.
- Map panel: SVG/floor-plan viewer with floor selector, unit/room/bed layer, device markers, alert markers, and visible stale/offline styling.
- Filter/search rail: floor, unit, room, bed, device type, device status, alert severity, maintenance state, calibration state, and search by room/device/patient ID placeholder.
- Detail drawer: opens when selecting a marker, room, bed, device, or alert.
- Alert list: severity-sorted list with timestamp, source device, assigned bed/unit, alert age, and status.
- Fleet table: inventory and maintenance queue for devices on the selected floor/unit or across the hospital.

Map interaction rules:

- Device markers should communicate type, status, and alert state without relying only on color.
- Marker click/tap opens the same detail drawer on desktop and mobile.
- Rooms and beds should remain legible when zoomed and should degrade to cards on small screens.
- Active filters should be visible and easy to clear.
- Search results should focus the map and open the relevant drawer.
- If floor-plan geometry fails to load, show a list/table fallback with the same filters.

## 7. Medical IoT Dashboard UX

The existing `/medical-iot` route should remain first-class and become the telemetry overview for connected care.

Required panels:

- Connected devices: count, type, status, battery, connectivity, signal strength, last seen timestamp, and source label.
- Vitals streams: heart rate, SpO2, blood pressure, respiratory rate, temperature, glucose, ECG status, oxygen flow, infusion pump state, ventilator state if applicable, and source device.
- Connectivity health: online, warning, stale, offline, reconnecting, and unknown.
- Stale/offline warnings: every stale or offline state must include the last valid timestamp and "not live" wording.
- Abnormal telemetry alerts: alert severity, parameter, threshold/rule, value, unit, timestamp, bed/unit/device, and review status.
- Trend cards: small telemetry trends with timestamps and demo/live source labels.
- Backend unavailable state: reuse the existing loading/error/empty structure and keep the UI useful with demo or empty snapshots.

Relationship to Hospital Map:

- `/medical-iot` answers "what is happening across connected devices?"
- `/hospital-map` answers "where is it happening and what spaces/devices are affected?"
- Both consume the same device registry, telemetry, alerting, location, and maintenance contracts once backend modules exist.

## 8. Device Fleet Management UX

Device Fleet Management should be a first-class operational capability, not just a table inside Medical IoT.

Core features:

- Device inventory: device ID, display name, type, model, manufacturer, serial number, firmware, software version, assigned unit/room/bed/patient placeholder, owner department, and tags.
- Assignment: assign/unassign a device to unit, room, bed, patient placeholder, or pool. Assignment actions must be audited.
- Status: online, warning, offline, stale, in use, available, cleaning, charging, maintenance, retired, lost, and unknown.
- Calibration: calibration due date, overdue status, last calibration record, next required action.
- Maintenance: preventive maintenance schedule, service records, open service tickets, maintenance overdue, blocked for clinical use flag.
- Battery/charging: current battery, charge state, charging location, low-battery warning, estimated run time if available.
- Firmware/version: current firmware, update availability, update status, and last update timestamp. The UI must not imply it can push firmware unless that regulated workflow exists.
- Location history: timestamped movement events, prior room/unit, current location, location source, confidence, and unexpected movement alerts.
- Utilization: in-use time, idle time, assigned-but-not-reporting time, pool utilization, device scarcity by unit, and redistribution recommendations.

Recommended first UI shape:

- Route can be represented inside `/hospital-map` as a Fleet tab in Phase 1.
- If the capability grows, add `/hospital-map/fleet` or a canonical `/device-fleet` route later.
- Tool Library and Command Dashboard cards should launch the fleet view through inventory IDs, not hard-coded bespoke navigation.

## 9. Telemetry Parameters

Every telemetry reading must be timestamped, source-labeled, unit-normalized, and freshness-scored.

Required parameter set:

- Heart rate: bpm, rhythm context if provided, source device, timestamp.
- SpO2: percent, oxygen delivery context if provided, timestamp.
- Blood pressure: systolic/diastolic, MAP if available, cuff/invasive source, timestamp.
- Respiratory rate: breaths/min, source, timestamp.
- Temperature: value, unit, route/source, timestamp.
- Glucose: mg/dL or mmol/L with normalized display, source, timestamp.
- ECG status: connected/disconnected, rhythm label if available, lead status, timestamp.
- Oxygen flow: L/min, oxygen device type if available, timestamp.
- Infusion pump state: running, paused, stopped, alarm, channel, medication placeholder, rate if permitted, timestamp.
- Ventilator state: mode, connected/disconnected, alarm state, key parameters only if integration supports them safely.
- Battery: percentage, charging state, low/critical threshold, timestamp.
- Connectivity: transport, signal strength, connection state, last seen timestamp.
- Last updated: required for every device and every stream.

Freshness rules:

- `fresh`: reading is within the parameter/device freshness threshold.
- `stale`: reading is older than threshold but device is not declared offline.
- `offline`: device last seen exceeds offline threshold or reports disconnected.
- `unknown`: timestamp missing, invalid, or source unavailable. Unknown data should not be rendered as healthy.

Parameter thresholds should be configurable per device type/unit in the backend, but demo data can start with deterministic thresholds.

## 10. Alerting Rules

Initial alert classes:

- Offline device: device has not reported within the offline threshold.
- Low battery: battery below warning or critical threshold.
- Abnormal vitals: telemetry crosses configured review thresholds.
- Stale telemetry: stream has not updated within expected interval.
- Device moved unexpectedly: location changes outside assignment, allowed zone, or expected workflow.
- Maintenance overdue: preventive maintenance date is past due.
- Calibration overdue: calibration due date is past due.
- Connectivity lost: transport reports disconnected or signal is unavailable.

Alert fields:

- `id`
- `deviceId`
- `deviceName`
- `type`
- `severity`
- `status`
- `title`
- `detail`
- `floorId`
- `unitId`
- `roomId`
- `bedId`
- `patientContextId` placeholder when allowed
- `triggeredAt`
- `lastObservedAt`
- `acknowledgedAt`
- `resolvedAt`
- `source`
- `ruleId`
- `demo`

Alerting behavior:

- Alerts must be review/support signals only.
- Bedside alarms remain authoritative.
- Alert timestamps and stale source labels must be visible.
- Acknowledgement/resolution actions must be audited.
- Demo alerts must be labeled as demo and must not look like live hospital events.

## 11. AI Assistant Integration

The Assistant should be able to answer operational questions without pretending to control devices.

Supported question examples:

- "Which devices are offline?"
- "Show ICU devices with low battery."
- "Which beds have active alerts?"
- "Find telemetry gaps in the last hour."
- "Which pumps need maintenance?"
- "Recommend device redistribution."

Assistant architecture:

- Add hospital operations intents and aliases to the existing NLU/canonical ID contract.
- Route UI launches through `resolveCatalogLaunch()` and `applyRegistryToolLaunch()`.
- Do not expose Hospital Map, device fleet, or telemetry as `POST /api/tools/:id/execute` executors unless the backend tool-orchestrator registry truly supports them.
- Use query-only Assistant adapters that call hospital operations APIs with RBAC, audit logging, and read-only scopes.
- Responses should include source timestamps, stale/offline warnings, filters used, result counts, and links back to `/hospital-map` or `/medical-iot`.
- Recommendations, such as device redistribution, must be framed as operational decision support requiring human review.

Recommended Assistant capabilities:

- Device status summarization.
- Unit/floor filtered alert summaries.
- Telemetry gap detection.
- Low battery and maintenance queue summarization.
- Location anomaly explanation.
- Device redistribution suggestions based on utilization and availability.
- "Open in map" deep links with selected floor/unit/device filters.

## 12. Backend Architecture

Plan new NestJS modules as domain modules under `backend/src/modules`:

- `hospital-map`: floors, units, rooms, beds, layout geometry, map snapshots, and map-specific read models.
- `device-registry`: canonical device inventory, device metadata, device type taxonomy, firmware/version fields, ownership, and assignment eligibility.
- `telemetry`: telemetry ingestion, normalization, latest readings, time-range queries, freshness calculation, and live stream/SSE support.
- `alerting`: alert rules, alert generation, acknowledgement, resolution, rule audit, and alert query APIs.
- `device-fleet`: utilization, assignment workflows, availability, pool management, redistribution recommendations, and operational fleet snapshots.
- `maintenance`: maintenance records, calibration records, service status, due/overdue calculations, and maintenance action audit.
- `location-tracking`: current location, location history, movement events, source confidence, unexpected movement rules, and future RTLS adapters.

Recommended composition:

- `HospitalMapModule` should depend on read services from device registry, telemetry, alerting, maintenance, and location tracking.
- `DeviceFleetModule` should own operational fleet views but not duplicate the canonical `MedicalDevice` entity.
- `TelemetryModule` should own freshness and latest reading logic so Hospital Map and Medical IoT use the same stale/offline rules.
- `AlertingModule` should consume telemetry, maintenance, calibration, location, and registry state to produce device alerts.
- `MaintenanceModule` should own state transitions for service/calibration records.
- `LocationTrackingModule` should abstract demo coordinates, manual assignment locations, and future RTLS/BLE/UWB feeds.

Backend safety and compliance:

- All live endpoints require auth and appropriate permissions.
- PHI should be minimized; patient ID search should start as a placeholder unless a patient-workspace/FHIR contract exists.
- All device assignment, status patch, alert acknowledgement, and maintenance actions require audit events.
- Raw telemetry retention, downsampling, and export policy should be explicit before production use.

## 13. API Contracts

The app has a global `/api` prefix in Nest. Product shorthand can use `/hospital-map/*`, but contract inventories should store runtime paths such as `/api/hospital-map/floors`.

Recommended endpoints:

- `GET /api/hospital-map/floors`: list floors and basic layout metadata.
- `GET /api/hospital-map/units`: list units, floor mappings, labels, and status summaries.
- `GET /api/hospital-map/rooms`: list rooms, beds, unit/floor references, and coordinates.
- `GET /api/hospital-map/devices`: map-ready devices with location, status, telemetry freshness, and alert summary.
- `GET /api/devices`: canonical device inventory with filters.
- `GET /api/devices/:id`: detailed device profile.
- `GET /api/devices/:id/telemetry`: latest and time-window telemetry for one device.
- `GET /api/devices/:id/location-history`: timestamped location events.
- `GET /api/devices/:id/maintenance`: maintenance and calibration records.
- `GET /api/telemetry/live`: live telemetry stream or polling snapshot, with explicit transport decision.
- `GET /api/alerts/devices`: device alerts with filters for unit, floor, severity, type, status, and time range.
- `POST /api/devices/:id/assign`: assign or unassign a device to unit, room, bed, pool, or patient placeholder.
- `POST /api/devices/:id/maintenance`: create maintenance/calibration record or status transition.
- `PATCH /api/devices/:id/status`: update device operational status when permitted.

Recommended frontend inventory/client entries:

- Add hospital map and device APIs to `src/data/frontendApiCallsInventory.js`.
- Add matching backend routes to `src/data/backendHttpRouteInventory.js`.
- Add capability flags to `src/config/backendApiCapabilities.js`, for example `hospitalMap`, `medicalDeviceRegistry`, `telemetryLive`, `deviceAlerting`, `deviceFleet`, and `deviceMaintenance`.
- API clients must skip unavailable calls and render demo/empty/backend-unavailable states rather than failing open.

Response contract requirements:

- Every telemetry response includes `generatedAt`, `source`, `sourceLabel`, and per-reading timestamps.
- Every map response includes coordinate system metadata.
- Every device status includes `status`, `statusUpdatedAt`, `lastSeenAt`, and `freshness`.
- Every alert includes `triggeredAt`, `lastObservedAt`, `severity`, and `status`.
- Demo/mock responses include `demo: true` and user-facing source labels.

## 14. Data Model

Suggested entities and key fields:

- `HospitalFloor`: `id`, `name`, `level`, `building`, `layoutAssetId`, `coordinateSystem`, `active`, `createdAt`, `updatedAt`.
- `HospitalUnit`: `id`, `floorId`, `name`, `type`, `shortCode`, `capacity`, `active`, `createdAt`, `updatedAt`.
- `Room`: `id`, `floorId`, `unitId`, `roomNumber`, `roomType`, `coordinates`, `shape`, `active`, `createdAt`, `updatedAt`.
- `Bed`: `id`, `roomId`, `bedLabel`, `bedType`, `status`, `patientContextId` placeholder, `active`, `createdAt`, `updatedAt`.
- `MedicalDevice`: `id`, `deviceIdentifier`, `name`, `type`, `model`, `manufacturer`, `serialNumber`, `firmwareVersion`, `softwareVersion`, `status`, `batteryPercent`, `connectivityStatus`, `signalStrength`, `lastSeenAt`, `active`, `createdAt`, `updatedAt`.
- `DeviceAssignment`: `id`, `deviceId`, `floorId`, `unitId`, `roomId`, `bedId`, `patientContextId` placeholder, `assignmentType`, `assignedAt`, `assignedBy`, `releasedAt`, `releasedBy`, `status`.
- `TelemetryReading`: `id`, `deviceId`, `parameter`, `value`, `unit`, `normalizedValue`, `normalizedUnit`, `timestamp`, `receivedAt`, `source`, `quality`, `freshness`, `demo`.
- `DeviceStatus`: `id`, `deviceId`, `status`, `batteryPercent`, `chargingState`, `connectivityStatus`, `signalStrength`, `lastSeenAt`, `statusUpdatedAt`, `source`.
- `DeviceAlert`: `id`, `deviceId`, `ruleId`, `type`, `severity`, `status`, `title`, `detail`, `triggeredAt`, `lastObservedAt`, `acknowledgedAt`, `resolvedAt`, `acknowledgedBy`, `resolvedBy`.
- `MaintenanceRecord`: `id`, `deviceId`, `type`, `status`, `dueAt`, `completedAt`, `completedBy`, `notes`, `serviceVendor`, `calibrationResult`, `createdAt`, `updatedAt`.
- `DeviceLocationEvent`: `id`, `deviceId`, `floorId`, `unitId`, `roomId`, `bedId`, `x`, `y`, `source`, `confidence`, `observedAt`, `receivedAt`, `unexpected`, `notes`.

DTO families:

- `HospitalMapSnapshotDto`
- `HospitalFloorDto`
- `HospitalUnitDto`
- `RoomDto`
- `BedDto`
- `MedicalDeviceDto`
- `DeviceAssignmentDto`
- `TelemetryReadingDto`
- `DeviceStatusDto`
- `DeviceAlertDto`
- `MaintenanceRecordDto`
- `DeviceLocationEventDto`
- `AssignDeviceDto`
- `CreateMaintenanceRecordDto`
- `PatchDeviceStatusDto`

## 15. Mapping Library Recommendation

Recommended starting approach: SVG/floor-plan coordinates for hospital interiors.

Rationale:

- Hospitals are indoor spaces where rooms, beds, nursing stations, device alcoves, and unit boundaries matter more than street geography.
- SVG floor plans can encode room polygons, bed anchors, device marker coordinates, alert overlays, and accessible labels without an external map provider.
- A simple coordinate grid is enough for demo data, manual layouts, and future RTLS integration.
- SVG keeps demo/offline behavior simple and avoids external map keys, billing, network dependencies, and privacy questions.

Mapping options:

- SVG floor plan: best Phase 1 choice for hospital floors, rooms, beds, markers, and responsive panels.
- Simple coordinate grid: useful fallback and demo format when a real floor plan asset is unavailable.
- Leaflet/OpenStreetMap: useful later for hospital campus, ambulance, courier, or vehicle maps, not indoor rooms.
- Mapbox/Google Maps: useful only if external maps, routing, or geocoding become necessary and institutional privacy/billing constraints are accepted.
- RTLS/BLE/UWB integration: future location source that should feed `DeviceLocationEvent` and map coordinates through `LocationTrackingModule`, not dictate the Phase 1 UI.

Phase 1 should store coordinates relative to a floor plan coordinate system, for example `viewBox` units or normalized `0..1` coordinates. Future RTLS adapters can transform real-world location events into that coordinate space.

## 16. Demo Data Strategy

Start with deterministic demo data before live backend integrations.

Demo data requirements:

- Use stable floors, units, rooms, beds, devices, telemetry readings, alerts, maintenance records, and location events.
- Include all major states: online, warning, stale, offline, low battery, maintenance overdue, calibration overdue, active alert, and normal.
- Every demo snapshot must include `source: 'demo'`, `sourceLabel`, `generatedAt`, and `demo: true`.
- UI labels must say "Demo telemetry", "Mock telemetry", or "Backend not connected" in visible areas.
- Demo vitals and telemetry must not look like live patient data.
- Patient identifiers should use placeholders such as "Patient A" or masked placeholder IDs until a real patient context contract exists.

Fallback behavior:

- If backend capability is disabled, render demo data or a no-data state with clear labels.
- If backend request fails, render an error state with retry and no stale live claims.
- If timestamps are missing or invalid, mark readings as unknown/stale rather than normal.
- If map geometry is unavailable, render the same data in list/table form.

Promotion to live:

- Add backend capability flags first.
- Add contract inventory entries and tests.
- Switch service clients from demo-first to API-first only after live APIs return complete timestamp/source/freshness fields.
- Keep demo labels in development and sample modes even after live APIs exist.

## 17. Safety and Compliance

Core safety rules:

- Monitoring support only.
- Not a replacement for bedside alarms.
- No autonomous clinical decisions.
- No autonomous bed assignment, patient movement, dispatch, maintenance scheduling, firmware updates, or device control.
- Timestamps are required for all device and telemetry data.
- Stale/offline data must be obvious.
- Mock/demo data must be clearly labeled.
- Alert and maintenance actions must be audited.
- Patient identifiers must remain placeholders until patient workspace/FHIR permissioning exists.

Compliance requirements:

- Enforce RBAC for operations/device views, PHI-linked views, and maintenance/status changes.
- Log audit events for viewing PHI-linked device context, assigning devices, changing status, acknowledging alerts, resolving alerts, and creating maintenance records.
- Store only minimum necessary patient context in device assignment records.
- Maintain source provenance for telemetry, alert rules, and location events.
- Define telemetry retention, downsampling, and deletion policies before production deployment.
- Expose source freshness and integration status in the UI so users can judge whether data is live, stale, or demo.

## 18. Responsive Layout Plan

The implementation should follow the existing mobile shell constraints and avoid overflow/clipping.

Desktop layout:

- Two-column operational layout: map on the left, detail/alerts/fleet panels on the right.
- Sticky summary/filter area with scrollable map region.
- Detail drawer can be a right-side panel.
- Fleet table uses horizontal scrolling only inside a bounded container.

Tablet layout:

- Map first, detail panel below or as slide-over.
- Filters collapse into chips and a drawer.
- Alert/fleet lists become cards when table width is constrained.

Mobile layout:

- Single-column page.
- Map panel remains responsive with pinch/zoom or explicit zoom controls.
- Detail drawer becomes a bottom sheet with clear close behavior.
- Filters move to a mobile drawer.
- Summary metrics become a horizontally scrollable, snap-friendly card row or stacked cards.
- Tables convert to cards for device inventory and alerts.
- All touch targets should be at least 44px.
- No fixed-width map/table should cause viewport overflow.

Theme/accessibility:

- Support dark and light themes through existing CSS variables.
- Do not rely on color alone for status.
- Provide accessible labels for map markers, filters, alerts, and drawer state.
- Preserve keyboard navigation through marker list fallback and focus restoration on drawer close.

## 19. Testing Plan

Frontend tests:

- `/hospital-map` protected route renders inside the app shell.
- Hospital map route has a loading, ready, empty, error, and backend-unavailable state.
- Device markers render for demo devices.
- Alert markers render for active alert devices.
- Device detail drawer opens from marker click and keyboard activation.
- Mobile detail drawer opens without page overflow.
- Telemetry Parameters Panel renders all required parameters with timestamps.
- Offline warnings render with last seen timestamp.
- Stale telemetry warnings render with stale wording.
- Low battery warnings render with battery percentage and threshold tone.
- Alert filters work by severity, unit, device type, and status.
- Fleet table renders device assignment, maintenance, calibration, firmware, battery, location, and utilization fields.
- Search supports room, device, and patient ID placeholder queries.
- Demo data labels appear in hero, summary, map, telemetry, and chart sections.
- Backend unavailable state does not present demo data as live.
- Dark/light theme status badges remain legible.
- Responsive layout tests verify no horizontal overflow at mobile widths.

Inventory and launch tests:

- `hospital-map`, `medical-iot-dashboard`, `device-fleet-management`, `telemetry-monitoring`, `device-maintenance`, and `hospital-operations-command` exist in canonical ID contracts when implemented.
- `/tools` includes Hospital Map and Medical IoT/device tools.
- Command Dashboard includes Hospital Map, Medical IoT, and device fleet management cards.
- Operations page includes Hospital Map and device fleet management launch cards.
- `applyRegistryToolLaunch()` routes each ID correctly.
- Unknown hospital-map subpaths render fallback states instead of blank pages.

Backend and contract tests:

- API contract tests for every planned endpoint once implemented.
- DTO validation tests for assignment, maintenance, status patch, telemetry query, and alert filters.
- Freshness calculation unit tests.
- Stale/offline threshold tests.
- Alert rule tests for offline, low battery, stale telemetry, abnormal vitals, unexpected movement, maintenance overdue, calibration overdue, and connectivity lost.
- Audit tests for assignment, status patch, alert acknowledgement/resolution, and maintenance record creation.
- Frontend API inventory entries match backend route inventory.
- Capability flags prevent frontend calls when backend modules are unavailable.
- SSE/live telemetry endpoint tests if live transport is implemented.

AI Assistant tests:

- Assistant can summarize offline devices from mock/query data.
- Assistant can filter ICU low-battery devices.
- Assistant can list beds with active alerts.
- Assistant can detect telemetry gaps for a time window.
- Assistant can identify pumps needing maintenance.
- Redistribution recommendations include human-review and source timestamp language.
- Assistant responses never imply device control or replacement of bedside alarms.

## 20. Implementation Phases

Phase 0: Planning and contracts

- Approve this architecture.
- Decide whether Hospital Map appears as top-level primary navigation or as a first-class Operations route with dashboard/tool-library prominence.
- Finalize canonical IDs and route naming.
- Finalize API path prefixes and capability flags.
- Define safety copy and demo data labels.

Phase 1: Frontend demo Hospital Map

- Add `/hospital-map` route, lazy page import, and protected route entry.
- Add demo floor/unit/room/bed/device/telemetry/alert/maintenance data.
- Build SVG floor-plan viewer with layers, markers, filters, search, and detail drawer.
- Add telemetry parameters panel and device fleet table.
- Add Command Dashboard, Operations, Tool Library, quick launcher, and inventory wiring.
- Add route, inventory, rendering, drawer, stale/offline, alert filter, demo-label, and responsive tests.

Phase 2: Medical IoT and fleet UX alignment

- Expand `/medical-iot` to consume shared demo data/service shape where practical.
- Align Medical IoT status, telemetry, alert, and freshness labels with Hospital Map.
- Add device fleet management tab/panel or subroute.
- Ensure `/medical-iot` and `/hospital-map` cross-link by device, unit, and alert.
- Add tests ensuring Medical IoT remains first-class and not hidden inside `/tools`.

Phase 3: Backend read APIs

- Add NestJS modules for hospital map, device registry, telemetry, alerting, device fleet, maintenance, and location tracking.
- Implement read endpoints for floors, units, rooms, devices, device detail, telemetry, location history, maintenance, and device alerts.
- Add DTO validation, route inventory entries, frontend API inventory entries, and capability flags.
- Switch frontend service clients to API-first with safe demo fallback.
- Add contract, module, service, and frontend unavailable-state tests.

Phase 4: Mutations and audit

- Implement device assignment, maintenance record creation, and status patch endpoints.
- Add RBAC and audit events for all mutations.
- Add optimistic UI only where rollback and audit semantics are clear.
- Add alert acknowledgement/resolution if product wants it in this surface.
- Add tests for permissions, validation, audit, and failure states.

Phase 5: Assistant operations intelligence

- Add read-only Assistant adapters for offline devices, low battery, active alerts, telemetry gaps, maintenance queues, and redistribution recommendations.
- Add NLU aliases and chat seeds for hospital operations questions.
- Return source timestamps and deep links back to `/hospital-map` or `/medical-iot`.
- Add Assistant tests and safety assertions.

Phase 6: Live integrations

- Add ingestion adapters for device vendor APIs, FHIR/HL7 where relevant, and future RTLS/BLE/UWB location feeds.
- Add retention/downsampling policy.
- Add live telemetry transport decision: polling first, SSE/WebSocket only when needed.
- Add observability for ingestion lag, stale streams, dropped readings, alert rule runs, and API latency.
- Validate clinical safety, compliance, and institutional workflow requirements before production deployment.

## 21. Risks and Dependencies

Risks:

- Demo telemetry could be mistaken for live data if labels are not persistent and visible.
- Users may over-trust telemetry views as a substitute for bedside alarms.
- Mapping can become too complex if RTLS/vendor constraints drive Phase 1.
- Device status, telemetry status, and alert status can diverge if multiple services compute freshness independently.
- Adding endpoints without updating contract inventories can break existing frontend/backend exposure guarantees.
- Assistant answers may imply device control or clinical authority unless prompts and response templates are constrained.
- Tables and maps can easily overflow on mobile if not designed as responsive cards/drawers from the start.
- Patient identifiers create PHI risk unless patient workspace, permissions, and audit are ready.
- Maintenance, calibration, firmware, and device-control workflows may have regulatory implications if they move beyond tracking.

Dependencies:

- Product decision on primary navigation placement for `/hospital-map`.
- Final canonical ID additions in the tool contract.
- Floor-plan SVG assets or a deterministic coordinate-grid demo.
- Permission model for hospital operations, device management, and PHI-linked views.
- Backend module ownership and route naming.
- Device vendor API/RTLS availability for live phases.
- Audit requirements for device assignment, maintenance, alert, and status actions.
- Retention and compliance policy for telemetry and location history.

Recommended dependency order:

1. Inventory/route/contract decisions.
2. Demo data and SVG map UX.
3. Shared freshness/status semantics.
4. Backend read APIs.
5. Mutations with audit.
6. Assistant query adapters.
7. Live integrations.
