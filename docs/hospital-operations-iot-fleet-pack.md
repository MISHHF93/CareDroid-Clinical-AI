# Hospital Operations, Medical IoT, and Fleet Tools Pack

## Scope

This pack adds launchable hospital operations, Medical IoT, and fleet tools across three tiers. All outputs are operational decision support only. The pack does not make autonomous dispatch, staffing, admission, transfer, discharge, device-assignment, or clinical decisions.

## Tier A Calculators

- Bed Occupancy Calculator: `/tools/calculators/bed-occupancy-calculator`
- Staffing Ratio Calculator: `/tools/calculators/staffing-ratio-calculator`
- Turnaround Time Calculator: `/tools/calculators/turnaround-time-calculator`
- Resource Utilization Index: `/tools/calculators/resource-utilization-index`

The calculators are deterministic frontend forms backed by `src/utils/hospitalOperationsCalculators.js`. They expose planning indicators only and require source-system verification before action.

## Tier B Assistants

- Dispatch AI
- Hospital Command Assistant
- Resource Allocation Assistant
- Device Recommendation Assistant

These launch as chat-assisted workflows from the calculators hub and `/assistant`. Backend NLU patterns exist for routing, but the tools are not POST-executable orchestrator tools. All chat seeds explicitly require human approval and prohibit autonomous dispatch/resource/device decisions.

## Tier C Dashboards, Maps, and Engines

- Hospital Map Dashboard: `/hospital-map`
- Live Fleet Map: `/fleet/map`
- Medical IoT Dashboard: `/medical-iot`
- Device Fleet Management: `/hospital-map`
- Predictive Maintenance Engine: `/fleet/predictive-maintenance`
- Route Optimization Engine: `/fleet/route-optimizer`
- Asset Tracking Dashboard: `/hospital-map`
- Telemetry Monitoring Center: `/hospital-map`
- Incident Command Center: `/hospital-map`
- Hospital Operations Cockpit: `/hospital-map`
- Device Battery Intelligence: `/medical-iot`
- Capacity Prediction Engine: `/hospital-map`

Maps are visible SVG/coordinate layouts with marker layers and detail drawers. Demo/mock telemetry is labeled in the UI via source banners such as backend demo hospital map contract messaging.

## Backend Contracts

Backend contracts are documented in `backend/src/modules/live-tracking/hospital-operations-iot-fleet.contracts.ts`.

Current live/demo endpoints:

- `GET /api/hospital-map/floors`
- `GET /api/hospital-map/devices`
- `GET /api/fleet/vehicles/live`
- `GET /api/fleet/routes/active`
- `GET /api/devices/live`
- `GET /api/telemetry/live`
- `GET /api/alerts/devices`

Tier B assistants route through `POST /api/chat/message` and remain unsupported by `POST /api/tools/:id/execute` until real executors are intentionally added.

## Fallbacks And Safety

- Hospital map, fleet map, and Medical IoT services fall back to clearly labeled demo telemetry when backend capabilities are unavailable.
- Loading, empty, and error states are present on map/dashboard surfaces.
- Responsive map layouts use scalable SVG canvases, marker overlays, and scrollable detail/table regions.
- Human approval is required for every operational action.
