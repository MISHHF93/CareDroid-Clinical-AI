# Notification Wiring Report

## Active Data Flow

```text
Emergency OS modules / realtime / polling
  -> emergencyStore.alerts
  -> useCareDroidCentralNode().snapshot.operationalAlerts
  -> Header Notification Center
```

Additional app notification compatibility:

```text
NotificationContext / NotificationService / NotificationToast compatibility
  -> dispatchAlert()
  -> emergencyStore.addAlert()
  -> Header Notification Center and Sonner toasts
```

## Store Wiring

`src/store/emergencyStore.ts` is the canonical alert state. It already normalizes backend, realtime, whiteboard, capacity, EMS, queue, reassessment, boarding, and referral alerts. This pass added alert state actions:

- `markAlertRead(alertId)`.
- `acknowledgeAlert(alertId)`.
- `dismissAlert(alertId)`.

The alert model now carries `read`, `acknowledged`, `acknowledgedAt`, `dismissed`, and `dismissedAt` state.

## Header Wiring

`src/components/Header.tsx` now merges:

- Store alerts.
- Central-node operational alerts.
- System sync status notices.
- AI/Copilot safety notice.
- Latest integration/provincial event notice.

Duplicate ids are normalized into one visible feed. Dismissed alerts are hidden from the active panel. Read and acknowledge state is applied from store fields with local fallback for backend-only central alerts.

## Action Routing

Primary action routing uses existing canonical Emergency OS routes only:

- Patient alerts: `/emergency/patients?patientId=...`.
- EMS: `CANONICAL_ROUTES.emergencyEms`.
- Reassessment: `CANONICAL_ROUTES.emergencyReassessment`.
- Capacity: `CANONICAL_ROUTES.emergencyCapacity`.
- Boarding: `CANONICAL_ROUTES.emergencyBoarding`.
- Referral: `CANONICAL_ROUTES.emergencyReferrals`.
- Queue/wait alerts: `CANONICAL_ROUTES.emergencyQueues`.
- Sync/system: `CANONICAL_ROUTES.emergencySettings`.
- Integration/provincial: existing Emergency OS integration/provincial route constants.
- AI/Copilot: `CANONICAL_ROUTES.emergencyCopilot`.

If role access blocks a route, the action renders disabled instead of routing around permissions.

## Backend Wiring

Backend notification and clinical-alert modules remain available but were not made the active Emergency OS Notification Center. The active UI uses current Emergency OS central/store alert data because that is already wired to realtime/polling and module extractors.

## Fixture/Demo Mode

When backend refresh is unavailable, the store keeps local demo/fixture alert data. The panel continues to show store-derived operational alerts and an explicit sync status notice rather than disconnected static mocks.
