# Reception-First Strategy

## Summary

CareDroid Emergency OS pivots its primary operational entry point from universal clinical mission control to **Reception-first patient arrival**. Every patient enters the department through Reception; the Whiteboard remains the operational awareness layer for charge nurse, physician, manager, and command-center displays.

## Constraints

- Do not redesign the application shell.
- Do not replace `AppShell.tsx`.
- Do not remove the Whiteboard.
- Wire existing capabilities; do not rebuild parallel flows.

## Problem Statement (ASU Feedback)

1. **Too many data entry points** — patient creation, search, intake, and queue assignment are scattered across Whiteboard, Intake, Patients, EMS, and command palette.
2. **Wrong workflow origin** — the product evolved from "universal doctor" to whiteboard-centric mission control; front-desk staff (receptionist, registration clerk) are the first users but were not the design center.

## Target Workflow

```
Patient Arrival → Reception → Smart Intake → Verification → Queue Assignment → Whiteboard
```

## Role Model

| Role | Reception role | Default route | Patient creation origin |
| --- | --- | --- | --- |
| `registration_clerk` | Primary user | `/emergency/reception` | Reception only |
| `triage_nurse` | Handoff consumer | `/emergency/whiteboard` | Reception preferred; emergency quick-create on whiteboard |
| `charge_nurse` | Operational consumer | `/emergency/whiteboard` | Reception preferred; emergency quick-create retained |
| `physician` | Clinical consumer | `/emergency/whiteboard` | Reception preferred |
| `ems_user` | EMS pipeline | `/emergency/ems` | EMS convert path |
| `read_only_viewer` | Wall display | `/emergency/whiteboard` | None |

Registration maps to `REGISTRATION_SCREEN` in `src/central-node/careDroidCentralNode.ts`.

## Entry Point Consolidation

| Before | After |
| --- | --- |
| `/emergency/intake` as registration landing | `/emergency/reception` as Arrival Dashboard |
| `QuickIntake` on Whiteboard for all roles | Whiteboard quick-create demoted for `registration_clerk` |
| `N` shortcut → whiteboard + intake modal | `N` → reception quick create for all create-capable roles (except EMS) |
| Standalone Intake nav for clerks | Intake embedded in reception workflow |

## Whiteboard Role

The Whiteboard (`src/pages/emergency/index.tsx`) becomes:

- **Operational awareness layer** for clinical and management roles
- **Read-only wall display** when `READ_ONLY_DISPLAY` or `?display=readonly` is active
- **Not** the primary patient creation surface for front-desk staff

## Success Criteria

- Registration clerk completes search → create → intake → queue handoff without visiting whiteboard.
- Whiteboard remains mission-control for charge nurse, physician, and manager.
- Read-only wall display works from settings or query param.
- Click depth from reception: ≤2 interactions to start intake, ≤3 to finalize and see patient on queue/whiteboard.

## Final Success Definition

**Reception becomes the fastest and most efficient workflow in the product.**

**Whiteboard remains the operational mission-control view.**

**The entire Emergency OS revolves around the patient's arrival and movement through the department** — Arrival → Registration → Triage → Waiting → Assessment → Results → Disposition → Admission → Discharge.

## Related Documents

- `reception-workspace-audit.md` — capability inventory
- `intake-to-whiteboard-flow.md` — technical handoff sequence
- `reception-screen-design.md` — Arrival Dashboard UX
- `whiteboard-readonly-mode.md` — wall display behavior
- `patient-arrival-experience.md` — single-workflow checklist

## Prior Art

`docs/architecture/whiteboard-first-refactor.md` promoted whiteboard as mission control. This strategy inverts the **origin** of patient creation while preserving whiteboard as the consumption layer for clinical operations.
