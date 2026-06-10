# Emergency Resource Board

## Goal

Track operational emergency department resources so staff can understand what is available, occupied, or out of service before capacity pressure blocks patient flow.

## Tracked Resources

The Emergency Resource Board tracks:

- Rooms
- Stretchers
- Monitors
- Telemetry Units
- Infusion Pumps

Each resource should be represented as an operational asset that can be counted, grouped, and reviewed by status.

## Resource Status

Every tracked resource maps to one of three statuses:

- `Available`: ready for immediate use.
- `Occupied`: currently assigned to a patient, room, care area, or workflow.
- `Out of Service`: unavailable because of maintenance, cleaning, malfunction, missing supplies, or operational hold.

Status should be updated from live integrations when available and marked clearly when it is demo, manual, or stale.

## Resource Board Metrics

The dashboard should summarize:

- Total resources by type.
- Available count by type.
- Occupied count by type.
- Out of service count by type.
- Availability rate by type.
- Critical shortages and resources blocking patient movement.

Rooms and stretchers should connect to Emergency Capacity Intelligence because they directly affect bed availability, boarding pressure, and EMS offload speed. Monitors, telemetry units, and infusion pumps should surface equipment constraints that can block placement even when physical space exists.

## Operational Signals

The board should flag pressure when:

- Available rooms or stretchers fall below the configured threshold.
- Monitors, telemetry units, or infusion pumps are unavailable for expected demand.
- Out of service resources increase during high census.
- EMS arrivals, waiting room load, or provider queue pressure require resources that are not available.
- A resource remains occupied or out of service longer than expected.

Signals should route staff toward operational review, not make clinical placement or staffing decisions.

## Dashboard Route

The Emergency Resource Board is mounted at:

`/workspace/emergency/resources`

The dashboard should show:

- Resource availability by type.
- Status counts: Available, Occupied, and Out of Service.
- Shortage warnings.
- Resource trends during ED pressure.
- Recommended operational actions for constrained resources.

## Acceptance Mapping

Acceptance is met when staff can open `/workspace/emergency/resources` and understand current availability for rooms, stretchers, monitors, telemetry units, and infusion pumps by status.
