# Reception Workspace Audit

## Purpose

Inventory every reception-related capability in the active Emergency OS spine. Status as of the Reception-First refactor.

**Legend:** Exists | Wired | Gap

## Capability Matrix

| Capability | Exists | Wired | Primary files | Notes |
| --- | --- | --- | --- | --- |
| Reception / Arrival Dashboard | Yes | Yes | `ReceptionWorkspace.jsx`, `/emergency/reception` | Canonical front door |
| Registration clerk home | Yes | Yes | `emergencyRolePermissions.js`, `App.jsx`, `AppShell.tsx` | `defaultRoute` + role home redirects |
| Patient search | Yes | Yes | `ReceptionWorkspace.jsx` hero search | Local store filter; autofocus + `/` shortcut |
| Quick patient create | Yes | Yes | `QuickIntake.tsx` on reception | Handoff via `receptionHandoff.ts` |
| Smart Intake workflow | Yes | Yes | `SmartIntake.jsx` | `?from=reception`; clerk blocked from standalone intake |
| OCR / ID scan launcher | Yes | Yes | Reception → `?step=ocr` | Session start preserves deep-linked step |
| OCR backend API | Yes | Partial | `smartIntakeApi.js` | `emergencySmartIntakeIdentitySession: DISABLED` |
| Duplicate detection | Yes | Demo | `SmartIntake.jsx`, backend `match()` | Live when identity session enabled |
| Allergies / medications | Partial | Partial | Intake fixtures, `PatientDetailPanel` | Review in Smart Intake; edit post-handoff |
| Referral documents | Partial | Partial | `ReferralPanel.jsx`, intake fixtures | Clinical roles → `/emergency/referrals` |
| Encounter creation | Yes | Yes | `createSmartIntakePatient`, vertical slice | Quick create + Smart Intake |
| Arrival reason | Yes | Yes | `QuickIntake.tsx` complaint category | Wired in quick create |
| Queue handoff | Yes | Yes | `receptionHandoff.ts` | `movePatientToState(Triage)` + queue filter + workflow log |
| QuickIntake reception variant | Yes | Yes | `QuickIntake.tsx` | Reception copy; no Central Node banner |
| EMS / verification queue dedupe | Yes | Yes | `ReceptionWorkspace.jsx` | EMS-flagged patients only in EMS queue |
| Mobile sidebar primaries | Yes | Yes | `Sidebar.tsx` | `reception, whiteboard, patients` when intake hidden |
| Role-aware catch-all redirects | Yes | Yes | `App.jsx` | `/mobile`, `/android`, `/emergency/*` → `EmergencyDefaultRedirect` |
| Recent arrivals metric | Yes | Yes | `ArrivalMetricsPanel.jsx` | 30-minute window |
| Waiting count | Yes | Yes | `ArrivalMetricsPanel.jsx` | `PatientState.Waiting` |
| Awaiting verification | Yes | Yes | Metrics + work queue | Opens Smart Intake with `patientId` |
| Awaiting triage | Yes | Yes | Metrics + pre-triage queue | Store-derived |
| Receptionist-only layout | Yes | Yes | `useScreenModeCapabilities.ts`, `Header.tsx`, `AppShell.tsx` | Single chrome band; no ops strip |
| Clerk whiteboard access | Removed | Yes | `emergencyRolePermissions.js`, `App.jsx` guard | Nav + route redirect to reception |
| Header-only search | Yes | Yes | `Header.tsx` | No page-level duplicate search |
| Reception backend handoff | Yes | Yes | `POST /api/emergency/reception/handoff` | Persists triage transition + workflow log |
| Clerk EMS convert | Yes | Yes | `emergencyRolePermissions.js`, `ReceptionWorkspace.jsx` | Register inbound units at arrival |
| Intake Command Center (legacy) | Yes | No | `WorkspaceHome.jsx` (future-modules) | Quarantined; do not mount |
| Screen modes | Yes | Yes | `useRouteScreenMode.ts` | Registration on reception/intake routes |
| Read-only whiteboard | Yes | Yes | `index.tsx`, `EmergencySettings.jsx` | `?display=readonly` + settings |
| Whiteboard patient create | Yes | Demoted | `index.tsx` | Blocked for `registration_clerk` |
| Legacy `NewPatientIntake.jsx` | Yes | No | Superseded by `QuickIntake` | Do not wire |

## Navigation (post-refactor)

| Surface | Status |
| --- | --- |
| Sidebar first item (clerk) | Reception |
| `registration_clerk.defaultRoute` | `/emergency/reception` |
| Login / `/` / `/emergency` redirect | Role home (reception for clerk) |
| Intake nav (clerk) | Hidden in sidebar |
| Header Create / palette Create | Reception quick create for create-capable roles (except EMS) |
| `N` shortcut | Reception quick create for create-capable roles (except EMS) |
| Mobile bottom nav (clerk) | Reception · Whiteboard · Patients |

## Composed Stack (reuse, not rebuild)

| Component | Role on Reception |
| --- | --- |
| `QuickIntake.tsx` | Quick Create modal (`variant="reception"`) |
| `ArrivalMetricsPanel.jsx` | Metrics row |
| `SmartIntake.jsx` | Identity / OCR / verify sub-flow |
| `receptionHandoff.ts` | Queue + snapshot handoff |
| `emergencyStore` | Patients, EMS, operational summary |
| `useRouteScreenMode` | `REGISTRATION_SCREEN` |

## Remaining Gaps (P2)

1. Enable `emergencySmartIntakeIdentitySession` and wire full `SmartIntakeApi` pipeline
2. Extract shared search from `PatientsRoute` to reduce duplication
3. Use `GET /api/emergency/queues` on reception refresh (currently store-derived)
4. Dedicated allergy/medication capture substeps when backend session provides arrays
5. PHI redaction on patient grid in read-only mode (central-node snapshot only today)
6. EMS convert → reception verify using live store patient (demo fixtures still used for OCR fields)
7. Auto-invoke unknown-patient finalize action without extra click (mode banner only today)

## Out of Scope

- AppShell replacement
- Camera hardware integration
- Mounting `WorkspaceHome.jsx` mega-surface
- New backend endpoints
