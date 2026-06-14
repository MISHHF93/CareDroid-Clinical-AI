# Notification Center Realignment Report

## Chosen Active Center

The active Emergency OS Notification Center is the existing header bell and panel in `src/components/Header.tsx`, mounted by the existing `src/components/AppShell.tsx`. No new AppShell, route, or parallel notification system was introduced.

## Realignment Applied

- Replaced the small inline alert drawer with a tokenized `Notification Center` dialog panel in the existing header.
- Kept the data source as the existing Emergency OS alert stream: store alerts, central node operational alerts, realtime/polling refreshes, and module-derived alert builders.
- Added read, acknowledge, and dismiss state to the existing alert model/store instead of creating a separate notification queue.
- Added local fallback state for backend-only central snapshot alerts so read/acknowledge/dismiss still works when an alert is not present in the local store.
- Added patient, encounter, source module, severity, timestamp, read/unread, and acknowledged metadata in each visible notification.
- Added intentional disabled action states for missing patients, missing routes, and inaccessible routes.

## Supported Alert Types

The active panel supports these categories through existing alert data and derived central notices:

- Operational alerts from `store.alerts` and `centralSnapshot.operationalAlerts`.
- Reassessment overdue/due alerts from store extractors and reassessment engine flags.
- EMS inbound/ETA alerts from EMS intake, arrivals, and realtime event extraction.
- Capacity alerts from capacity status and capacity engine.
- Boarding alerts from boarding status extraction.
- Referral delay/pending alerts from referral extraction.
- System sync alerts from central node sync state.
- AI/Copilot safety notices from central node AI safety context.
- Integration and provincial data alerts from `integrationEvents`.

## Actions

Notification actions now support:

- `Open patient` for patient-linked alerts.
- `Open module` for EMS, reassessment, capacity, boarding, referral, queue, sync/settings, integration/provincial, and Copilot alerts.
- `Acknowledge`.
- `Mark read`.
- `Dismiss`.

If a target is unavailable, the primary action renders disabled with a clear label such as `Patient unavailable`, `Route unavailable`, or `No target available`.

## Design Constraints Preserved

- Existing `AppShell` and routing are unchanged.
- Header layout is not redesigned; the bell remains in the existing topbar.
- Styles use existing app/status/design tokens with fallbacks.
- Panel behavior is scoped to the Emergency OS header and does not block primary workflows with a modal overlay.
