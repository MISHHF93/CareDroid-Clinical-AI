# Current Codebase Findings

Date: 2026-06-29

## Summary

CareDroid is already a unified Vite + React emergency operations app with a Nest/backend-capable fullstack wrapper. The current source does not only model hospital intake: it already contains dispatch, EMS, reception, whiteboard, queue, triage, alert, capacity, AI copilot, analytics, and help/manual foundations. The rebuild work therefore extends and connects existing modules instead of creating an isolated second app.

## Pages And Routes Audited

- `src/app/router.tsx` is the active route tree.
- Existing emergency surfaces include `/emergency/whiteboard`, `/emergency/dispatch`, `/emergency/ems`, `/emergency/reception`, `/emergency/intake`, `/emergency/queues`, `/emergency/reassessment`, `/emergency/capacity`, `/emergency/boarding`, `/emergency/referrals`, `/emergency/copilot`, `/emergency/analytics`, `/emergency/alerts`, `/emergency/settings`, and `/emergency/help`.
- Newly wired full-journey surfaces are `/emergency/command-center`, `/emergency/journey`, `/emergency/ed-readiness`, `/emergency/diagnostics`, `/emergency/handoffs`, and `/emergency/reports`.
- Top-level canonical aliases already map several required pages: `/staff`, `/departments`, `/analytics`, `/reports`, `/settings`, `/intake`, `/triage`, and `/alerts`.

## Services And SaaS Modules Audited

Reusable services already present:

- `EmergencySignalService`: `src/services/emergencySignalService.ts`
- `DispatchIntakeService`: `src/services/dispatchIntakeService.ts`
- `PreArrivalNotificationService`: `src/services/preArrivalNotification.ts`
- `EDReadinessService`: `src/services/edReadinessService.ts`
- `ThreeMinuteResponseService`: `src/engine/threeMinuteTimerEngine.ts`, mounted in `src/app/providers.tsx`
- `BottleneckRegistryService`: `src/services/bottleneckRegistry.ts`
- `AnalyticsService`: `src/services/analyticsService.ts`, `src/services/emergencyAnalyticsApi.ts`
- ED OS aggregator: `src/services/emergencyOperatingSystemService.ts`
- EMS pre-arrival flow: `src/services/emsPreArrivalPipelineService.ts`
- Intake, queue, capacity, reassessment, referral, boarding, and whiteboard services under `src/services`

New connecting service:

- `src/services/fullEmergencyCareJourneyService.ts` defines the canonical 20-stage journey, maps each stage to services and routes, and builds a live operating snapshot from patients, EMS arrivals, alerts, capacity, dispatch, readiness, pre-arrival, journey trace, and bottleneck signals.

## AI And Backend Logic

- AI/copilot surfaces already exist through `careDroidBrainService`, `careDroidAiApi`, `emergencyCopilotApi`, `useCareDroidAI`, `useAiChiefRouting`, and `CopilotRoute`.
- The app distinguishes AI decision support from clinician-owned decisions in multiple safety strings and manual topics.
- Backend hydration is centralized through `useEmergencyOs` and `emergencyOsApi`, with local scenario fallback through the emergency store.

## User And Role System

- `src/lib/users/userTypes.ts` already includes dispatcher, EMS coordinator, paramedic, registration clerk, triage nurse, charge nurse, registered nurse, emergency physician, specialist, pharmacist, lab technician, radiology technician, patient flow coordinator, hospital administrator, IT administrator, quality safety officer, and demo observer roles.
- Route access is mediated by `useEmergencyRolePermissions`, `CareDroidRouteGuard`, and emergency role configuration.

## Patient, Intake, Triage, Alert, Queue, Dashboard Logic

- `src/store/emergencyStore.ts` is the main local operational state with patients, staff, rooms, EMS units, EMS arrivals, alerts, queues, referrals, capacity, workflow logs, audit logs, and hydration.
- Triage and acuity support exists in `triageAssist`, `triageEngine`, and patient `triageAssist` envelopes.
- Critical alert logic exists in `alertEngine`, `alertEngineDerived`, `clinicalAlertsApi`, and the three-minute timer engine.
- Queue, waiting-room, reassessment, boarding, and capacity services are present and already used by route pages.

## Reused Versus Rebuilt

Reused:

- Existing route shell, emergency store, role model, manual system, EMS board, dispatch console, reception/intake, queue, capacity, analytics, alerts, AI Chief/copilot, and timer engine.

Extended:

- Data models now include the final journey types requested by the rebuild.
- The central operating system now exposes `fullEmergencyCareJourney`.
- The in-app manual now describes all 20 journey stages.
- Missing operational pages now render from the canonical journey snapshot.

New:

- `FullEmergencyCareJourneyService`
- `FullJourneyOperatingPage`

## Duplicate, Isolated, Or Broken Code

- There are many historical aliases and legacy redirects in `routes.config.ts`; they are not broken, but they can obscure canonical ownership.
- The repo contains broad SaaS modules and older pages outside the emergency shell. The current implementation avoids quarantining new code by wiring the new journey service directly into routes and the ED OS aggregator.
- No destructive cleanup was performed because unrelated historical files may be intentional.
