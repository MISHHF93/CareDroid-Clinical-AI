# Dashboard Context Note Audit

Date: 2026-06-07

## Scope

Audited dashboard and dashboard-adjacent surfaces for static/script-like text that looked like intended AI/context behavior:

- `/dashboard`
- `/operations`
- `/digital-twin`
- `/hospital-map`
- `/medical-iot`
- `/devices`
- `/fleet/map` and `/fleet/command`
- `/live-map`
- `/ai-command-center`
- `/simulation`
- `/laboratory`
- profile/tool graph cards

Search patterns included `context note`, `note:`, `AI context`, `suggested context`, `this dashboard`, `placeholder`, `script`, `demo message`, `coming soon`, `TODO`, `static recommendation`, `sample insight`, `mock insight`, `generated insight`, `assistant note`, and `contextual note`.

## Findings And Classification

| File | Component | Visible text / pattern | Current purpose | Static/demo? | Should be functional? | Classification | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/pages/CommandDashboard.jsx` | `DashboardPanel` / My Workspace | Role, specialty, department, AI style, enabled packs, recommended AI agents displayed as chips | Profile/workspace context summary | Static rendering of context fields | Yes | Functional AI context needed / recommendation card | Converted to `ContextInsightCard` with profile, suggested action, entitlement pack, and assistant context sources. |
| `src/components/ProfileToolGraphCard.jsx` | `ProfileToolGraphCard` | `Assistant context: ...`, specialty/workspace tool spans | Tool graph context summary | Static line that looked like generated AI context | Yes | Functional AI context needed / empty state | Converted to `ContextInsightCard` entries with generated/empty states and actions. |
| `src/components/StateSourceNotice.jsx` | `StateSourceNotice` | Long source-state explanatory paragraphs | Help/source honesty | Static help text | No, but should be unobtrusive | Help text / backend unavailable state | Moved `details` into collapsible `Source details` disclosure. |
| `src/pages/MedicalIotDashboard.jsx` | Medical IoT source strip and visual note | Backend/demo message, mock telemetry note, device context | Source status and telemetry context | Demo/backend status was visible as passive text | Yes | Functional AI context needed / backend unavailable state | Added offline, telemetry review, and backend status insight cards. Kept source details collapsed. |
| `src/pages/HospitalMapDashboard.jsx` | Hospital map source/detail panels | `Patient placeholder`, source message, mock map details | Demo patient/location context | Demo/static | Partly | Demo-only insight / help text | Renamed to anonymized demo labels and added alert, freshness, and source cards. |
| `src/pages/DeviceFleetManagement.jsx` | Device detail panel and source notice | `Location History Placeholder`, browser-only placeholder actions | Demo action limitations | Static/demo | Partly | Backend unavailable state / help text | Removed placeholder wording, added maintenance/calibration/write-unavailable insight cards. |
| `src/pages/fleet/FleetDashboard.jsx` | Fleet source notice, warning paragraph, visual note | Mock telemetry, no live dispatch writes | Source/safety status | Demo/static | Yes | Contextual recommendation card / backend unavailable state | Added maintenance, route readiness, and telemetry source insight cards. |
| `src/pages/LiveTrackingMap.jsx` | Live map source strip | `Future data sources...` and no backend tracking line | Roadmap/source explanation | Static roadmap-like note | Yes | Backend unavailable state / recommendation card | Removed future-source line and added stale marker, layer mix, and backend tracking insight cards. |
| `src/pages/DigitalTwinIntelligence.jsx` | Local `InsightCard`, status paragraph | Predictive operational twin insights | Generated locally but custom card omitted source/status | Yes | Functional AI context needed | Replaced local insight card with shared `ContextInsightCard` and added operational twin source card. |
| `src/pages/AiCommandCenterDashboard.jsx` | AI source status and panel descriptions | Source/fallback status and AI metrics | Mixed backend/fallback | Yes | Functional AI context needed / backend unavailable state | Added source mix, retrieval context, and warning cards with live/demo/unavailable labels. |
| `src/pages/LaboratoryDashboard.jsx` | Trend card paragraph | Demo lab trend explanation | Demo-only static paragraph | Yes | Yes | Demo-only insight / launch action | Replaced trend paragraph with abnormal labs, specimen queue, and LIS/FHIR unavailable cards. |
| `src/pages/SimulationScenarioPlayer.jsx` | AI tutor hint/feedback labels | Hardcoded simulated training hint | Static demo content labeled as AI | Yes | No, unless AI is wired | Demo-only insight | Renamed to demo tutor content and added simulation context cards. |
| `src/pages/Operations.jsx` | Operational hub explanation | Navigation orientation | Static but useful | Partly | Yes for next action | Recommendation card / launch action | Added route-backed Operations recommendation cards. |

## Notes Not Converted

- Input `placeholder` attributes were retained when they were normal form hints.
- Short chart descriptions and badges such as `Mock telemetry` or `Demo data` were retained where they are concise source labels.
- Safety disclaimers were retained where they are clinical/operational guardrails, while source details were moved behind a disclosure.

