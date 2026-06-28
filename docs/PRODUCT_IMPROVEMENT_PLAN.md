# Product Improvement Plan

Generated: 2026-06-28

## Traceability Chain

Problem statement: CareDroid must reduce administrative delay between patient arrival and clinician action.

Objective: Make the first three minutes easier to execute by aligning route access, shortcuts, in-app help, role manuals, and workflow documentation.

Stakeholder value: Frontline staff reach the right screen faster, documentation promises match app behavior, and training material reflects current source code.

## Implemented In This Pass

| Change | Objective | Stakeholder value | Source |
|---|---|---|---|
| Added `CANONICAL_ROUTES.emergencyDocumentation`. | Reduce duplicate route literals and align docs with mounted routes. | Developers and clinicians can rely on one route name. | `src/config/routes.config.ts` |
| Added documentation route to clinical/operations permission sets. | Remove blocked path to mounted Clinical Documentation Assistant. | Physicians, triage nurses, charge nurses, managers, and admins can open the documented assistant. | `src/config/emergencyRolePermissions.ts` |
| Updated router to use the canonical documentation route. | Keep routing source-of-truth consistent. | Fewer route drift regressions. | `src/app/router.tsx` |
| Added contextual Guide trigger to shared emergency route pages. | Embed documentation into the product. | Users can open page help from operational pages without memorizing `?`. | `src/pages/emergency/emergencyRouteShared.tsx` |
| Implemented documented shortcuts for Alerts, Documentation, Whiteboard, and Pulse. | Remove clicks for urgent surfaces. | Faster navigation during first-three-minute workflows. | `src/components/AppShell.tsx` |
| Added missing role and workflow manuals. | Complete training coverage requested by the product brief. | Better onboarding and operational consistency. | `docs/users`, `docs/workflows` |

## Next Priorities

| Priority | Recommendation | Expected impact |
|---|---|---|
| P0 | Add tests for new keyboard shortcuts and documentation route access. | Prevents route/permission drift. |
| P1 | Add a generated docs manifest from `src/config/userManual.config.ts`. | Keeps Help Hub and `/docs` synchronized. |
| P1 | Add page-level Help triggers to Reception, Whiteboard, Analytics, Pulse, Shift, Alerts, and Settings. | Completes in-app help consistency beyond shared route pages. |
| P2 | Expand role model if Specialist, IT Admin, Quality Safety, and AI Chief need first-class app personas. | Better enterprise role fidelity. |

