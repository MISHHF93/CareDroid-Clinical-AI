# Hospital Digital Twin Roadmap

**Status:** Planning baseline  
**Date:** 2026-06-05  
**Scope:** Hospital map, Medical IoT, device fleet, live maps, occupancy, alerts, telemetry, fleet operations, and operations dashboards as one Digital Twin product.  
**Goal:** Define how current operational surfaces become a coherent Digital Twin suite for hospitals, health systems, EMS, and biomedical engineering teams.  
**Non-goal:** This document does not implement live integrations, real-time streaming, clinical alarm certification, or production device control.

## Executive Summary

CareDroid already contains the major pieces of a Digital Twin product, but they are presented as separate modules: `/hospital-map`, `/medical-iot`, `/devices`, `/fleet/map`, `/live-map`, `/digital-twin`, operations dashboards, alerts, telemetry, route optimization, and predictive maintenance. The target product should make `/digital-twin` the executive product wrapper while the other pages become layers, workspaces, and detail views.

The Digital Twin should answer one operational question:

```text
What is happening across the facility, devices, people, fleet, alerts, and workflows right now, and what should operations teams review next?
```

The near-term strategy is to unify existing demo-backed data and routes behind a canonical data model, then progressively replace demo data with live organization-scoped integrations.

## Current Surface Map

| Surface | Current route | Target product role |
| --- | --- | --- |
| Digital Twin | `/digital-twin` | Product wrapper, executive overview, layer launcher |
| Hospital Map | `/hospital-map` | Facility, floors, rooms, beds, device markers, unit context |
| Medical IoT | `/medical-iot` | Device telemetry, signal quality, stale/offline state, alerts |
| Device Fleet | `/devices` | Device inventory, lifecycle, maintenance, calibration, assignment |
| Fleet Map | `/fleet/map` | Vehicle location, route lines, ETAs, EMS/transport status |
| Live Map | `/live-map` | Unified live tracking layer across facility, devices, fleet, and alerts |
| Operations | `/operations` | Operational hub and entry point from primary navigation |
| Operations Center | `/operations-center` | Command center detail surface for incident and capacity workflows |

## Backend Module Map

The roadmap should build from current backend module ownership:

- [`backend/src/modules/hospital-map`](../backend/src/modules/hospital-map): floors, rooms, hospital map data, and device location services.
- [`backend/src/modules/telemetry`](../backend/src/modules/telemetry): device registry, telemetry readings, telemetry audit, and alert service.
- [`backend/src/modules/fleet`](../backend/src/modules/fleet): fleet data, vehicle tracking, fleet audit, and fleet service.
- [`backend/src/modules/live-tracking`](../backend/src/modules/live-tracking): live tracking coordination.
- [`backend/src/modules/clinical-alerts`](../backend/src/modules/clinical-alerts): clinical and operational alert surfaces.
- [`backend/src/modules/workspaces`](../backend/src/modules/workspaces): operations, fleet, and Medical IoT workspace scoping.
- [`backend/src/modules/platform-assets`](../backend/src/modules/platform-assets): entitlement and packaging for `digital-twin-pack`, `medical-iot-pack`, `hospital-operations`, and `fleet-logistics`.
- [`backend/src/modules/audit`](../backend/src/modules/audit) and [`backend/src/modules/observability`](../backend/src/modules/observability): operational audit and reliability telemetry.

## Frontend UX Map

The target user experience should consolidate operational breadth without deleting routes.

```text
Operations primary nav
  -> Operations hub
     -> Digital Twin overview
        -> Facility layer
        -> Device layer
        -> Fleet layer
        -> Alert layer
        -> Workflow layer
        -> Analytics layer
```

Page responsibilities:

- `/operations`: the primary entry for operations users, with cards for Digital Twin, Hospital Map, Medical IoT, Devices, Fleet, Live Map, alerts, and analytics.
- `/digital-twin`: the composed product overview with layer toggles, health summary, alerts, and links into detail pages.
- `/hospital-map`: facility detail view for floors, rooms, beds, zones, and local device markers.
- `/medical-iot`: telemetry detail view for connected devices, signal quality, stale data, and biomedical alerts.
- `/devices`: device lifecycle detail view for inventory, maintenance, calibration, firmware, and assignments.
- `/fleet/map`: EMS/transport detail view for vehicles, routes, ETAs, and dispatch status.
- `/live-map`: unified real-time map for live overlays across facility, devices, fleet, and alerts.

## Digital Twin Data Model

The Digital Twin should normalize facility, device, fleet, occupancy, alert, and workflow data into a shared organization-scoped model.

### Core Entities

| Entity | Purpose | Key fields |
| --- | --- | --- |
| `TwinFacility` | Hospital or campus root | `id`, `organizationId`, `name`, `timezone`, `address`, `status` |
| `TwinBuilding` | Building within facility | `id`, `facilityId`, `name`, `type`, `geoBoundary` |
| `TwinFloor` | Floor or map plane | `id`, `buildingId`, `level`, `name`, `mapAssetId`, `coordinateSystem` |
| `TwinZone` | Unit, ward, department, or operational area | `id`, `floorId`, `name`, `zoneType`, `capacity`, `riskState` |
| `TwinRoom` | Room, bay, OR, lab, storage area | `id`, `zoneId`, `roomType`, `bedCount`, `status` |
| `TwinBed` | Bed or care position | `id`, `roomId`, `occupancyStatus`, `acuity`, `lastUpdatedAt` |
| `TwinDevice` | Medical or operational device | `id`, `organizationId`, `deviceType`, `vendor`, `serial`, `status`, `assignedLocationId` |
| `TwinTelemetryPoint` | Latest normalized signal | `deviceId`, `parameter`, `value`, `unit`, `quality`, `observedAt` |
| `TwinVehicle` | EMS or transport unit | `id`, `fleetId`, `vehicleType`, `status`, `crewStatus`, `location` |
| `TwinAlert` | Clinical, device, facility, fleet, or workflow alert | `id`, `sourceType`, `severity`, `state`, `locationRef`, `assignedTo`, `createdAt` |
| `TwinWorkflow` | Operational workflow or incident | `id`, `type`, `state`, `linkedAlerts`, `linkedAssets`, `ownerWorkspaceId` |

### Location Model

Location should support both indoor and outdoor contexts:

- Facility hierarchy: facility, building, floor, zone, room, bed.
- Indoor coordinates: floor map coordinates and optional device/asset marker positions.
- Outdoor coordinates: latitude/longitude for fleet, transport, and campus-wide movement.
- Logical location: department, workspace, service line, or command center state when physical coordinates are unavailable.

### Telemetry Model

Telemetry should separate raw readings from normalized twin state:

- Raw integration event: source-specific payload, vendor, timestamp, ingestion metadata.
- Normalized parameter: parameter ID, unit, value, quality, status, and timestamp.
- Derived status: online, stale, degraded, alerting, maintenance due, calibration due.
- Twin projection: the current state shown on maps, dashboards, and alerts.

## Map Layers

Digital Twin map layers should be explicit, permissioned, and independently toggled.

| Layer | Includes | Primary users |
| --- | --- | --- |
| Facility | buildings, floors, zones, rooms, beds | operations, nursing leadership, facilities |
| Occupancy | bed status, capacity, queue pressure, unit load | bed managers, operations leaders |
| Devices | device markers, status, battery, maintenance state | biomedical engineering, nursing operations |
| Telemetry | latest parameters, signal quality, stale warnings | biomedical engineering, clinical engineering |
| Alerts | clinical, device, fleet, incident, facility alerts | operations, incident command |
| Fleet | vehicles, routes, ETAs, crew/unit state | EMS, transport, dispatch |
| Workflows | incidents, transfers, maintenance jobs, escalation states | operations, administrators |
| Analytics | utilization, bottlenecks, alert burden, downtime | leadership, quality, finance |

## Alerting Strategy

Alerts should be normalized across facility, telemetry, fleet, and workflow sources.

Alert classes:

- `clinical`: deterioration, critical values, escalation, care workflow state.
- `device`: offline, stale telemetry, low battery, calibration, maintenance, anomaly.
- `fleet`: delayed route, unit unavailable, maintenance risk, dispatch conflict.
- `facility`: capacity, room status, environmental, bed pressure, zone closure.
- `workflow`: unassigned action, overdue review, unresolved incident, escalation pending.
- `security`: device security, unusual access, data feed anomaly.

Required alert fields:

- `organizationId`
- `workspaceId`
- `sourceType`
- `sourceId`
- `severity`
- `state`
- `locationRef`
- `assetId`
- `assignedTo`
- `acknowledgedBy`
- `createdAt`
- `updatedAt`
- `resolvedAt`

## Workflow Automation

Digital Twin should not imply autonomous clinical or operational control. It should recommend, route, and track actions with clear human ownership.

Workflow examples:

- Assign biomedical technician to offline device cluster.
- Escalate stale telemetry for critical device class.
- Create incident command workflow for capacity surge.
- Route transport request to Fleet & EMS suite.
- Trigger simulation or training recommendation after repeated operational failures.
- Create governance review for device security or data quality issue.

Workflow rules:

- Recommendations require human confirmation for staffing, dispatch, maintenance, or clinical escalation.
- Every workflow action produces audit events.
- Workflow ownership is workspace-scoped.
- Automation must expose stale or demo-backed data warnings.

## Demo vs Live Data Strategy

The Digital Twin roadmap should label data sources by readiness.

| Data source | Demo mode | Live mode |
| --- | --- | --- |
| Facility map | Seeded floors, rooms, zones, devices | Imported facility CAD/map data or configured map assets |
| Occupancy | Simulated bed and queue state | ADT, bed management, EHR, or operations feed |
| Device inventory | Seeded device fleet | CMMS, device vendor, asset management integration |
| Telemetry | Synthetic readings and stale states | Device gateway, telemetry broker, vendor APIs |
| Alerts | Generated demo alerts | Alert services, rules engine, integration events |
| Fleet | Seeded vehicles and routes | CAD, AVL/GPS, transport management integration |
| Workflows | Local simulated workflow states | Case management, work-order, incident, and automation integrations |

UI requirements:

- Show demo/live status at the dataset and layer level.
- Do not mix demo and live data without visible labeling.
- Track source freshness and last ingestion time.
- Block commercial claims for live monitoring until integrations are validated.

## Product Packaging

Digital Twin packaging should align with [Asset-Pack Productization Plan](./asset-pack-productization-plan.md):

- Digital Twin Suite: full product wrapper, facility map, occupancy, telemetry overlays, alert correlation, operations dashboard.
- Medical IoT Suite: device inventory, telemetry, maintenance, biomedical alerts, device security signals.
- Fleet & EMS Suite: fleet map, live vehicle tracking, route optimization, dispatch AI, predictive maintenance.
- Governance & Compliance Suite: audit logs, security events, device data lineage, review workflows.
- Emergency Department Suite: hospital map and alert overlays for ED operations.

## Backend Capability Requirements

Minimum viable capabilities:

- Organization-scoped reads and writes for map, telemetry, fleet, alert, and workflow data.
- Consistent membership and entitlement checks for all organization IDs.
- Asset-aware access decisions for Digital Twin surfaces.
- Normalized location model shared by hospital map, telemetry, and fleet.
- Alert normalization and audit records.
- Demo/live source labeling.
- Data freshness tracking.
- Workspace-level layer defaults.

Enterprise capabilities:

- Real-time streaming or polling strategy with backpressure.
- Integration connectors for ADT, CMMS, device gateways, CAD/AVL, and bed management.
- Configurable alert rules.
- Incident workflow engine.
- Historical analytics and export.
- SIEM/security event integration for device and telemetry risks.

## Implementation Phases

### Phase 1: Product Unification

- Make `/digital-twin` the product overview for existing operational routes.
- Add explicit layer taxonomy and route links.
- Align asset IDs and packs for Digital Twin, Medical IoT, Fleet & EMS, and Hospital Operations.
- Add demo/live labels to Digital Twin surfaces.

### Phase 2: Canonical Twin Model

- Define shared entity contracts for facility, floor, zone, room, bed, device, telemetry point, vehicle, alert, and workflow.
- Normalize existing hospital-map, telemetry, and fleet sample data into the twin model.
- Add organization/workspace scoping to all Digital Twin reads.
- Add freshness and source metadata.

### Phase 3: Alert And Workflow Layer

- Normalize alert classes and states.
- Connect device, fleet, facility, and workflow alerts to map layers.
- Add human-confirmed workflow automation.
- Emit audit events for acknowledgements, assignments, and state changes.

### Phase 4: Live Integration Readiness

- Define integration contracts for ADT/bed, device telemetry, CMMS, CAD/AVL, and facility map import.
- Add validation and monitoring for each feed.
- Add fallback and stale-data behavior.
- Add enterprise readiness checklist per source.

### Phase 5: Commercial Digital Twin

- Ship buyer-facing dashboards for utilization, alert burden, device uptime, fleet performance, and operational bottlenecks.
- Add organization-level value metrics and renewal reporting.
- Add premium Operations AI routing for correlated Digital Twin insights.
- Package implementation services for map setup and live integrations.

## Risks

- Users experience separate maps and dashboards instead of one product.
- Demo data is mistaken for live hospital monitoring.
- Device telemetry is shown without source quality, freshness, or clinical limitations.
- Organization-scoped data is readable without membership enforcement.
- Workflow automation appears autonomous rather than human-confirmed.
- Fleet and facility coordinate models diverge.
- Alert volume grows without prioritization, ownership, or acknowledgement metrics.

## Acceptance Criteria

- `/digital-twin` clearly presents Hospital Map, Medical IoT, Devices, Fleet, Live Map, alerts, and operations analytics as one product.
- Every Digital Twin surface has an asset ID and pack mapping.
- Facility, device, telemetry, fleet, alert, and workflow concepts have a shared organization-scoped data model.
- Demo/live data status and source freshness are visible.
- Map layers are explicit and permission-aware.
- Alert acknowledgement, assignment, resolution, and workflow actions are auditable.
- Implementation phases distinguish product unification, data model work, live integration readiness, and commercial launch.

