# Central Operational Snapshot Contract

## Frontend Contract
`buildCareDroidCentralNodeSnapshot` returns:

- `node`: always `CareDroidCentralNode`.
- `sync`: source, connection status, mode, freshness, and message.
- `currentDepartmentStatus`: patients today, active patients, waiting patients, longest wait, average wait, capacity band, active alerts.
- `activePatientFlow`: active patient references and critical patient references.
- `queueHealth`: queue counts, oldest wait, targets, and breach status.
- `emsPressure`: inbound count, critical inbound count, pressure status.
- `capacityStatus`: existing capacity snapshot.
- `boardingStatus`: boarder count and risk.
- `reassessmentStatus`: due and overdue counts.
- `referralStatus`: pending referral count.
- `operationalAlerts`: active in-app alerts.
- `screenContext`: selected screen mode, widget/action/density policy, redaction status.
- `roleContext`: current Emergency OS role, read-only state, allowed routes.
- `tenantSettings`: tenant and screen-mode settings.
- `aiCopilotContext`: enabled state, human-review requirement, recent message count.
- `moduleStatuses`: enabled module settings.
- `recentEvents`: workflow logs.
- `operationalSummary`: header-ready metrics.

## Backend Contract
`GET /api/emergency/central-node/snapshot` returns an `EmergencyModuleEnvelope<CareDroidCentralNodeSnapshot>` with:

- `patientsToday`
- `activePatients`
- `waitingPatients`
- `longestWait`
- `averageWait`
- `emsInbound`
- `emsPressure`
- `reassessmentsDue`
- `capacityStatus`
- `boarders`
- `boardingRisk`
- `referralsPending`
- `operationalAlerts`
- `whiteboardColumns`
- `queueMetrics`
- `recentEvents`
- `tenantSettings`
- `enabledModules`

## Settings Added
- `defaultScreenMode`
- `enabledScreenModes`
- `readOnlyDisplayMode`
- `commandCenterMode`
- `wallDisplayRefreshInterval`

## Redaction Rule
`WAITING_ROOM_DISPLAY` and `READ_ONLY_DISPLAY` redact full names, MRNs, chief complaints, clinical notes, patient alert messages, patient IDs on alerts, and workflow event details from public display snapshots.
