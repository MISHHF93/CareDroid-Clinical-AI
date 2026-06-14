# Disconnected Journey Artifacts

Generated: 2026-06-14

## Classification Rules

- Active: mounted in the current AppShell/route system or consumed by active state/services
- Wired: not a page itself, but used by active modules
- Review-only: retained under `_review` or compatibility layers
- Future: declared in route/config/API inventories but not active in pilot navigation
- Manual review: potentially useful or overlapping, but not safe to archive during this pass

## Active Or Wired

- `src/App.jsx`: active route system
- `src/components/AppShell.tsx`: active AppShell
- `src/pages/emergency/index.tsx`: active Whiteboard mission control
- `src/components/EmergencyWhiteboard.jsx`: active compatibility export
- `src/components/PatientCard.tsx`: active patient card
- `src/components/EMSPipeline.jsx`: active EMS workflow
- `src/pages/emergency/SmartIntake.jsx`: active identity/intake workflow
- `src/components/ReferralPanel.jsx`: active referrals/transfer workflow
- `src/pages/emergency/EmergencyAnalytics.jsx`: active direct analytics route
- `src/pages/emergency/EmergencySettings.jsx`: active direct settings route
- `src/store/emergencyStore.ts`: active operational state
- `src/central-node/careDroidCentralNode.ts`: active central snapshot builder
- `src/hooks/useCareDroidCentralNode.ts`: active central-node consumer hook
- `src/services/emergencyOsApi.js`: active Emergency OS API facade
- `backend/src/modules/emergency-os/*`: active backend module surface

## Review-Only / Manual Review

- `src/layout/AppShell.jsx`: older AppShell implementation, not imported by `src/App.jsx`; classify as MANUAL_REVIEW because deleting or moving it could affect retained tests or historical audit references.
- `src/features/future-modules/_review/*`: retained future/review modules; not mounted into the Emergency OS journey.
- Optional Smart Intake identity-session routes in API inventories: capability disabled, not active backend surface.
- Optional capacity history, queue analytics, transfer workflow, diversion status, and shift export endpoints: capability disabled unless backed by a mounted controller.

## No Archives Performed

No files were archived or removed during this pass. The safe choice was documentation and narrow wiring inside active journey surfaces.
