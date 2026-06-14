# Hidden Artifact Discovery

Date: 2026-06-14

## Scope

This Deep Harmonization pass searched for repository artifacts that already existed but were not visible in the active CareDroid Emergency OS UI. The pass preserved the current architecture:

```text
src/main.jsx -> src/App.jsx -> src/components/AppShell.tsx
  -> canonical /emergency/* route tree
  -> src/services/emergencyOsApi.js / hooks / store
  -> backend/src/modules/emergency-os/emergency-os.controller.ts
```

No second AppShell, router, API surface, store, or design system was created.

## Category Search Summary

| Search Area | Hidden / Under-Visible Findings | Classification | Action |
| --- | --- | --- | --- |
| Components | `HandoffBriefGenerator`, Department Pulse page, Shift Summary page, legacy `src/layout/AppShell.jsx`, archived future workspace components | ACTIVE after wiring / DUPLICATE_LEGACY / FUTURE_MODULE | Mounted Pulse and Shift through `src/App.jsx`; left legacy shell and future archive untouched. |
| Services | `clinicalAlertsApi.js`, `emergencyAnalyticsApi.js`, `smartIntakeApi.js`, partially optional `emergencyTransportApi.js` | MANUAL_REVIEW / LEGACY / FUTURE_MODULE / PARTIALLY_WIRED | No new service facade created. Active Emergency OS continues through `emergencyOsApi.js`; review-only services documented below. |
| Hooks | `useCareDroidCentralNode`, advanced hooks in `useEmergencyOs.js`, `usePatientTimelineContext` | WIRED / PARTIALLY_WIRED / ACTIVE | Central node is already visible in `Header.tsx`; patient timeline remains active in patient detail. Advanced review-only hooks were not mounted further. |
| Stores | `src/store/emergencyStore.ts` plus legacy lowercase `src/store/emergency-store.ts` | ACTIVE / LEGACY_COMPAT | Active pages continue to use `emergencyStore.ts`. No store split introduced. |
| Providers | App-level providers in `src/App.jsx` | MOUNTED | No hidden Emergency OS provider found that required wiring. |
| DTOs / Entities | Backend clinical alerts, AI, personalization, artifacts, platform, and Emergency OS DTO/entity modules | BACKEND_ACTIVE / PLATFORM_SCOPE | Emergency OS route changes did not require DTO/entity changes. Platform-scoped modules left outside active ED UI. |
| Fixtures | `edScenarioFixtures.js`, `firstCustomerDemoMode.js`, seeded Emergency OS store state | WIRED_BUT_UNDER_VISIBLE | Already feed store/settings/demo behavior; no extra scenario UI was added in this pass. |
| Calculators | `ClinicalCalculatorHub`, calculator components, Medical Tools route | ACTIVE | Already visible through `/emergency/tools`; no duplicate calculator route was added. |
| AI prompts | `HandoffBriefGenerator` prompt, backend `clinical-query.prompt.ts`, guarded tool prompts | ACTIVE / PLATFORM_SCOPE | Shift handoff prompt became reachable through `/emergency/shift`; platform prompts left outside ED UI unless already exposed through Copilot/tools. |
| Integrations | EMS transport API, clinical alerts backend, settings integration status | PARTIALLY_WIRED / DEMO / ACTIVE_SETTINGS | Avoided mounting demo/streaming surfaces without normalized persistence. |
| Analytics | `EmergencyAnalytics`, local `emergencyAnalyticsApi.js`, Shift Summary | ACTIVE / LEGACY / ACTIVE_AFTER_WIRING | Shift Summary now visible as a dedicated AppShell route; legacy analytics API remains review-only. |
| Alerts | Emergency store alerts, clinical alerts page/backend module, tool-risk alerts | ACTIVE / MANUAL_REVIEW / ACTIVE_TOOLS | Kept active store alerts in Pulse; left clinical alert management page review-only pending alert-model reconciliation. |

## Artifact Classification

| Artifact | Classification Before | Decision | Evidence |
| --- | --- | --- | --- |
| `src/pages/emergency/pulse/index.tsx` | UNMOUNTED / WIRED_TO_STORE | ACTIVE | Department Pulse already computed capacity, EMS, queue, staff, alert, referral, and workflow-log context from `useEmergencyStore`, but `/emergency/pulse` redirected to the whiteboard. Mounted as an AppShell route and linked from Analytics. |
| `src/pages/emergency/shift/index.tsx` | UNMOUNTED / WIRED_TO_STORE | ACTIVE | Shift Summary already consumed active shift, patients, referrals, alerts, capacity history, EMS, and `HandoffBriefGenerator`, but `/emergency/shift` redirected to the whiteboard. Mounted as an AppShell route and linked from Analytics. |
| `src/components/HandoffBriefGenerator.tsx` | UNMOUNTED_INDIRECT | ACTIVE | Existing generator is used by the Shift Summary page and now becomes reachable through `/emergency/shift`. |
| `src/pages/ClinicalAlertsPage.jsx` + `src/services/clinicalAlertsApi.js` | UNMOUNTED / MANUAL_REVIEW | MANUAL_REVIEW | Demo alert management is outside the active Emergency OS alert engine. It should not be merged until persistence and alert semantics are normalized. |
| `src/services/emergencyAnalyticsApi.js` | LEGACY / MANUAL_REVIEW | MANUAL_REVIEW | Contains useful helpers and disabled export path, but active analytics uses `emergencyOsApi.js` and store hydration. |
| `src/services/smartIntakeApi.js` | FUTURE_MODULE / MANUAL_REVIEW | MANUAL_REVIEW | Optional identity-session API remains disabled; active Smart Intake uses canonical Emergency OS API/store flow. |
| `src/services/emergencyTransportApi.js` | PARTIALLY_WIRED / MANUAL_REVIEW | MANUAL_REVIEW | EMS fleet/diversion and referral transport sync are optional integrations. Core EMS still uses `/api/emergency/ems`. |
| `src/layout/AppShell.jsx` | DUPLICATE_LEGACY | MANUAL_REVIEW | Not runtime-mounted. Tests and old helpers still reference it, so it was not archived in this pass. |
| `src/features/future-modules/_review/*` | FUTURE_MODULE | REVIEW_ARCHIVE | Already isolated as future/review material and left untouched. |

## Applied Wiring

| Issue Found | Why It Matters | Files Changed | Before | After | Validation |
| --- | --- | --- | --- | --- | --- |
| Department Pulse existed but `/emergency/pulse` redirected to whiteboard. | Charge nurse and command-center users lost a compact operational pulse view that already summarized queues, alerts, EMS, referrals, capacity, and staff workload. | `src/App.jsx`, `src/pages/emergency/EmergencyAnalytics.jsx`, `src/pages/emergency/EmergencyAnalytics.css`, route/config/inventory/test files | Hidden artifact; only route constants and legacy redirects existed. | Active AppShell route at `/emergency/pulse`, legacy `/pulse` and `/workspace/emergency/pulse` route there, Command Palette opens it, Analytics shows a visible link card. |
| Shift Summary and handoff generator existed but `/emergency/shift` redirected to whiteboard. | Shift handoff and throughput metrics are critical operational artifacts for pilot readiness and patient-flow continuity. | Same route/config/inventory/test files | Hidden artifact; handoff generator reachable only if manually imported through the unmounted page. | Active AppShell route at `/emergency/shift`, legacy `/shift`, `/shift-summary`, and workspace aliases route there, Command Palette opens it, Analytics shows a visible link card. |

## Active Wiring Map

```text
/emergency/pulse
  -> AppShell
  -> src/pages/emergency/pulse/index.tsx
  -> useEmergencyStore
  -> patients / capacity / referrals / EMS / alerts / workflowLogs
  -> Department Pulse rendered UI

/emergency/shift
  -> AppShell
  -> src/pages/emergency/shift/index.tsx
  -> buildShiftSummary + HandoffBriefGenerator
  -> useEmergencyStore
  -> activeShift / patients / staff / capacityHistory / referrals / alerts / EMS
  -> Shift Summary + handoff brief rendered UI
```

## Manual Review Queue

- Normalize `ClinicalAlertsPage` with the Emergency OS alert model before mounting.
- Decide whether `emergencyAnalyticsApi.js` helpers should be folded into active analytics or retained as legacy review code.
- Keep advanced simulation, federated-learning, and digital-twin hooks review-only unless product scope changes.
- Migrate any remaining tests/helpers off `src/layout/AppShell.jsx` before archiving it.

## Architecture Result

CareDroid still has one active Emergency OS spine. This pass did not create new architecture; it surfaced two high-value existing operational artifacts through the current route tree and command palette.

