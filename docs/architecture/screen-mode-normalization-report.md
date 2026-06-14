# Screen Mode Normalization Report

## Implemented Modes
- `TRIAGE_SCREEN`: compact front-door clinical view with intake, queues, reassessment, and alerts.
- `REGISTRATION_SCREEN`: identity/intake-oriented view with patient lookup and queue context.
- `CHARGE_NURSE_SCREEN`: default command mode for Whiteboard, EMS, capacity, reassessment, boarding, and alerts.
- `PHYSICIAN_SCREEN`: patient-detail, reassessment, referral, and Copilot context.
- `EMS_SCREEN`: EMS inbound and bay-preparation focus.
- `WAITING_ROOM_DISPLAY`: public, read-only, redacted wall display.
- `COMMAND_CENTER_DISPLAY`: wall-density operational command view.
- `ADMIN_SCREEN`: settings, audit, analytics, and integration review context.
- `READ_ONLY_DISPLAY`: read-only, redacted display mode.

## Normalization Approach
Screen modes are metadata on the central node contract. They control visible widgets, available action categories, density, read-only behavior, default focus, and alert visibility. They do not introduce new routes, shells, or layouts.

## Privacy Controls
Public display modes redact names, MRNs, clinical complaints, alert details, and workflow events. This was validated in `src/central-node/careDroidCentralNode.test.ts`.

## Settings Support
The existing Emergency Settings surface now exposes default screen mode, command center mode, read-only display mode, and wall display refresh interval within the current Central Control section.

## Manual Review
Large-format physical display deployment still needs site review for screen placement, shoulder-surfing risk, refresh interval, downtime behavior, and local privacy policy.
