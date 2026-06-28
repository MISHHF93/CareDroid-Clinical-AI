# Critical Alert Workflow

Purpose: make critical clinical and operational signals visible, acknowledged, and traceable.

## Workflow

1. Alert is created by alert engine, patient flag, reassessment breach, EMS/offload pressure, or backend alert payload.
2. Alert appears in the whiteboard banner, patient card context, reassessment queue, or Alerts Center.
3. User opens Alerts Center or the patient card.
4. User verifies source data and acknowledges or escalates.
5. Resolution remains in the operational log/audit trail.

## Roles

Charge nurse coordinates department response. Triage nurse handles front-door/reassessment safety. Physician reviews patient-specific clinical risk. Admin and quality staff review logs and trends.

## Failure Modes

If backend sync is unavailable, the frontend shows local or simulation state with API-state banners where enabled. Staff must validate against the live department record.

