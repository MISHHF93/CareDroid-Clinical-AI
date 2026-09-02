# CareDroid Copilot Instructions

CareDroid is the AI Chief of Staff for emergency department and hospital operations. Its highest-priority mission is: "Help save a human life in the first 3 minutes of any critical alert or patient arrival." Always refine the current codebase first. Do not create a new app, replace working routes, or remove existing functionality unless explicitly requested.

Core engineering rules:
- Work in the current codebase only. Do not create a new app, replacement shell, quarantined service, isolated demo, orphan component, or disconnected "new architecture".
- New helpers/components/services are allowed only when immediately imported by real app consumers.
- Consolidate duplicate role/user/access logic into the canonical identity layer instead of adding parallel systems.
- Follow the existing React, Vite, Nest, TypeScript, routing, state, and styling patterns.
- Prefer incremental refactoring over rewrites.
- Keep AI calls centralized through the CareDroid AI node/service in `lib/ai/careDroidAI.ts`.
- Use backend `/ai/node`, frontend `src/services/careDroidAiApi.ts`, and `src/hooks/useCareDroidAI.ts` for AI workflows.
- Do not call AI providers directly from UI components.
- Use typed interfaces, exported schemas, and predictable JSON response shapes.
- Preserve existing props and routes when editing shared components.
- Keep loading, empty, and error states accessible.
- Maintain WCAG AA intent: semantic HTML, keyboard focus, labels, and status regions.
- Never hardcode secrets or expose provider keys to frontend code.
- Never log protected health information. Log only operational metadata such as intent, field names, status, timing, and confidence.

Canonical identity and access rules:
- `src/lib/users/canonicalAccess.ts` is the canonical identity/access compiler.
- Use `CareDroidUserProfile`, `CompiledCareDroidAccessProfile`, `CANONICAL_ROLE_CATALOG`, and `compileCareDroidAccessProfile(user)` for role-aware work.
- HospitalRole, EmergencyRoleId, SaaS profile role, and backend UserRole must compile into one `CompiledCareDroidAccessProfile`; do not introduce another role system.
- Use canonical helpers for access decisions: `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `canAccessRoute`, `canSeeNavigationItem`, `canPerformClinicalAction`, `canReviewAI`, `canOwnAlert`, and `canMutatePatient`.
- Route guards and navigation must share canonical access logic. No nav item should point to a route that direct URL access denies.
- Fail safely: when profile compilation or role resolution is uncertain, deny mutation and prefer emergency-safe read-only visibility.
- Preserve backend compatibility with `physician`, `nurse`, `student`, and `admin`; put richer CareDroid role identity in profile metadata/`roleProfileId`.
- Follow least privilege. Generic `nurse` must not become `charge_nurse`; registration clerks must not override clinical AI; demo observers remain read-only; IT admins must not edit clinical data unless explicitly permitted; hospital admins should see operational data with minimized clinical detail.
- Demo switching must update the active user, canonical profile, compiled profile, permissions, navigation, dashboard widgets, AI Chief routing, alert ownership, and staff assignment identity together.
- Staff assignment records should reference canonical profile IDs when available.

AI safety rules:
- AI is clinical decision support, not a replacement for clinicians.
- Clinical AI outputs must require clinician review.
- Recommendations must include confidence, reasoning, warnings, and next actions.
- Avoid definitive diagnosis language.
- Flag incomplete data and emergency red flags clearly.
- Provide accept, modify, dismiss, and escalate affordances in UI.
- Every clinical recommendation must require clinician review and allow clinician override.
- Never display raw AI JSON to end users.

First 3 minutes principle:
- Help staff answer: who needs help first, why are they critical, where should they go, who must be notified, what is the next safest action, what information is missing, and whether a clinician reviewed it.
- Critical arrivals and severe alerts must expose a response timer, severity, patient status, responsible role, acknowledgement state, escalation state, next action, and clinician review state.
- 0:00-0:30 capture complaint, detect red flags, mark priority, and start timer.
- 0:30-1:00 suggest ESI-style acuity, identify missing life-critical data, and notify nurse/doctor/team lead.
- 1:00-2:00 recommend routing and next safest action, and surface allergies, medications, history, and vital risks.
- 2:00-3:00 escalate if unacknowledged, generate handoff, update command center, and show clinician review required.

Supported CareDroid AI intents:
- `patient_intake_assist`
- `critical_alert_assessment`
- `three_minute_response_plan`
- `triage_recommendation`
- `patient_summary`
- `department_routing`
- `wait_time_prediction`
- `staff_resource_insight`
- `hospital_command_insight`
- `escalation_recommendation`
- `handoff_summary`
- `service_bottleneck_analysis` — analyze active SaaS/service bottlenecks and recommend mitigations
- `workflow_delay_analysis` — identify root causes of clinical workflow delays
- `fallback_recommendation` — recommend fallback actions when a service is degraded or unavailable
- `three_minute_risk_projection` — project whether the 3-minute response target is at risk given active bottlenecks
- `operational_root_cause_summary` — summarize operational root causes across services, queues, and clinical workflows

Universal AI response shape:

```json
{
  "intent": "triage_recommendation",
  "status": "success",
  "priority": "critical | high | medium | low",
  "data": {},
  "confidence": 0.87,
  "reasoning": [],
  "warnings": [],
  "redFlags": [],
  "nextActions": [],
  "assignedRole": "Responsible clinician",
  "recommendedDepartment": "Emergency Department",
  "requiresClinicianReview": true,
  "clinicianOverrideAvailable": true,
  "generatedAt": "ISO_TIMESTAMP",
  "safetyDisclaimer": "This AI output is decision support only and must be reviewed by a licensed clinician."
}
```

Frontend AI display rules:
- Use reusable AI components from `src/components/ai`.
- Do not display raw AI JSON to users.
- Show recommendation, confidence, reasoning, warnings, next actions, review requirement, and override controls.
- Use the frontend API client/hook (`src/services/careDroidAiApi.ts`, `src/hooks/useCareDroidAI.ts`) instead of scattered component fetch calls.

Testing expectations:
- Add focused tests for AI schema validation, response shape, error handling, fallback behavior, and AI card rendering.
- Keep the app buildable with frontend typecheck and Vite build.

## Verifying your work

Do not invent a verification command or reach for a narrow `test:*` script.
There is one command per stage, and they compose:

```bash
npm run doctor            # environment diagnosis; changes nothing
npm run verify            # typecheck (BOTH sides) + lint + docs:check + deps:integrity + architecture:check
npm run verify:full       # verify + the whole frontend suite + root integration
npm run production:check  # verify:full + frontend and backend builds
```

- **`npm run verify` before you claim a change is done.** It typechecks the
  backend too; `typecheck:frontend` alone will miss a backend break.
- **`npm run test:run:parallel` is how you run the whole frontend suite.**
  Plain `vitest run` is serial and slow enough to get abandoned midway, which
  is how partial runs get reported as full ones.
- **`npm run validate:ci` is NOT the full suite.** It runs a named subset of
  frontend tests plus backend build/test/e2e and a bundle-budget check. A green
  CI is a weaker claim than a green `verify:full`; do not conflate them.
- **Do not edit source while a full suite run is in flight.** Mid-run edits
  produce stale-read failures that look like real regressions.
- Report what actually ran. If a suite failed, say so with the output; if a
  step was skipped, say that.

`npm run architecture:check` enforces two rules the type system cannot:

1. **No new import cycles.** A module calling into a partially-initialized
   module is how `ReferenceError: Cannot access 'X' before initialization`
   reaches production, which has happened here. Held to a baseline, not zero --
   lower the baseline when you genuinely break one, never raise it without a
   comment saying why the new cycle is unavoidable.
2. **No `src/` importing `backend/src/`.** The boundary is the HTTP API.

When a route redirects and neither access-denied panel renders, check
`ED_EXTENSION_ROUTE_REDIRECTS` (`src/config/edApplication.config.ts`) before
anything else: it matches by *prefix* above the route tree, so grepping the
redirect tables for your path finds nothing. This has silently swallowed a real
route three times.

**Unwired is not dead.** A module with no importers is usually a function not
linked yet, not garbage. Read what it does and either wire it or label it;
delete only what actively contradicts the live implementation. Before deleting
anything, grep tests twice -- once for imports, once for files that read it
from disk (`readFileSync`), because contract tests do the latter.
## User profiles and role-based access control

CareDroid models realistic hospital roles for the CareDroid Virtual City Health Network.

### Role system

Current canonical rule: use `src/lib/users/canonicalAccess.ts` as the identity/access compiler for all role-aware work. HospitalRole, EmergencyRoleId, SaaS profile role, and backend UserRole must compile into one `CompiledCareDroidAccessProfile` via `compileCareDroidAccessProfile(user)`. Do not add a parallel role system.

Use `src/lib/users/` as the single source of truth for roles, permissions, and demo users:
- `userTypes.ts` — `CareDroidUserProfile` type and `HospitalRole` union
- `hospitalNetwork.ts` — hospital sites, city zones, departments
- `permissions.ts` — `CAREDROID_PERMISSIONS`, `ROLE_PERMISSIONS` map, permission helpers
- `roleAccess.ts` — role labels, descriptions, emergency role mapping, dashboard config
- `demoUsers.ts` — seeded demo users (`DEMO_USERS`)
- `aiChiefRouting.ts` — AI recommendation routing by role and alert scenario

### RBAC rules

Canonical access helpers in `canonicalAccess.ts` are the preferred surface: `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `canAccessRoute`, `canSeeNavigationItem`, `canPerformClinicalAction`, `canReviewAI`, `canOwnAlert`, and `canMutatePatient`.

- Do not hardcode role checks inside UI components. Use `useRolePermissions()` or `hasCareDroidPermission()`.
- All permission checks must go through the centralized helpers in `permissions.ts`.
- New route, navigation, AI, alert, staff assignment, and mutation checks must use `CompiledCareDroidAccessProfile` and the canonical helpers.
- Demo users live only in `demoUsers.ts`. Never scatter mock users in component files.
- Clinical permissions follow least privilege. Non-clinical roles cannot edit clinical decisions.
- Permissions cascade from role definitions — never copy-paste permission arrays into components.
- Use `compileCareDroidAccessProfile()` to map a `HospitalRole` to emergency role, SaaS role, backend compatibility role, routes, permissions, dashboard widgets, AI capabilities, and alert ownership.

### Demo role switcher

`src/components/account/ProfileRoleSwitcher.tsx` allows switching the active demo role during demo or dev mode (rendered inside `UserAccountMenu` — do not add a second standalone instance elsewhere; see the doc comment in `src/components/account/index.ts`).
- Gate it with `useProfileSwitcherVisibility()`. Never expose it in production.
- Switching calls `switchDemoRole()` from `useEmergencyRolePermissions()`, which carries `caredroidProfile`, `compiledAccessProfile`, permissions, emergency role, SaaS role, backend compatibility role, and hospital role together in one profile update.
- `src/components/auth/DemoUserSwitcher.tsx`/`UserSwitcher.tsx` (an older, separate demo-user-switching implementation built on `useCareDroidUser`) has been removed — it had zero real importers anywhere in the app.

### AI Chief routing

AI Chief routing must consume canonical profiles where available. Recommendations should include `ownerRole`, `ownerUserId`, `owningDepartment`, `owningSite`, `visibleToRoles`, `visibleToUsers`, `escalationRole`, `escalationUserId`, `requiresClinicianReview`, `clinicianOverrideAvailable`, and `fallbackOwnerRole`. Clinical recommendations always require clinician review.

When AI recommendations are generated, include:
- `assignedRole` — the hospital role responsible for this recommendation
- `visibleToRoles` — which roles can see this alert/recommendation
- `escalationRole` — role to escalate to if unacknowledged
- `requiresClinicianReview` — must be `true` for all clinical recommendations
- `clinicianOverrideAvailable` — whether a clinician can dismiss/modify the AI output

Use `src/lib/users/aiChiefRouting.ts` to resolve visibility and escalation by alert scenario.

**React hook:** Use `useAiChiefRouting()` from `src/hooks/useAiChiefRouting.ts` to get the current user's visible scenarios, `canSeeScenario(scenario)`, `getRoutingFor(scenario)`, and `filterByProfile(recommendations)` — all bound to the current `compiledProfile`. Do NOT call `filterAiRecommendationsByProfile` or `isAlertVisibleToCompiledProfile` directly in components; use the hook instead.

### Alert ownership

Alerts and bottlenecks must use canonical ownership metadata:
- `ownerRole`, `ownerUserId`, `owningDepartment`, `owningSite`
- `backupRole`, `escalationChain`, `acknowledgementAuthority`
- `responseDeadline`, `impactsThreeMinuteTarget`

Do not scatter hardcoded alert owner literals when a canonical resolver/helper can be used.

- All `BottleneckEvent` objects are constructed via the `bottleneck()` helper in `bottleneckRegistry.ts`, which calls `canonicalAlertOwnership()`. This helper resolves `ownerRole` to a canonical `HospitalRole` via `resolveHospitalRole()` and enriches ownership with `backupRole`, `escalationChain`, and `acknowledgementAuthority`.
- `ownerRole` values passed to `bottleneck()` must be canonical `HospitalRole` strings (e.g., `'charge_nurse'`, `'it_admin'`) — never SaaS role or alias strings.
- In components, use `canOwnAlert(compiledProfile, event.ownerRole)` from `canonicalAccess.ts` to determine if the current user is the designated alert owner. Use `getCompiledRoleLabel(event.ownerRole)` for human-readable role display.
- Acknowledgement permission is controlled by `CAREDROID_PERMISSIONS.ALERT_ACKNOWLEDGE` (set on `compiledProfile.alertCapabilities.canAcknowledge`). Role-specific ownership check is `canOwnAlert(compiledProfile, ownerRole)`, which is a narrower check than acknowledgement permission alone.

### Audit metadata

Where supported, attach `AuditMetadata` from `src/lib/users/userTypes.ts` to mutations:
- `createdBy`, `updatedBy`, `acknowledgedBy`, `reviewedBy`, `escalatedBy`, `timestamp`, `userRole`
- Never log PHI. Log only role, intent, field names, status, and timestamps.
- Use `profile.employeeId` (not `fullName`, `email`, or `phone`) for `createdBy`/`updatedBy`/`acknowledgedBy`.

### Hook and component aliases

Two hook aliases reduce naming friction for consumers who prefer more explicit names:
- `useCurrentUser()` from `src/hooks/useCurrentUser.ts` — named wrapper over `useCareDroidUser()`, same return type.
- `usePermissions()` from `src/hooks/usePermissions.ts` — named wrapper over `useRolePermissions()`, same return type.

localStorage utilities for the current demo user session live in `src/lib/auth/currentUser.ts`:
- `readCurrentDemoUserId()`, `writeCurrentDemoUserId(id)`, `clearCurrentDemoUser()`, `resolveCurrentDemoUser()`

Component aliases at `src/components/auth/`:
- `RoleBadge.tsx` — re-exports `RoleBadge` from `src/domain/staff/RoleBadge`.

### RoleGate

`RoleGate` in `src/components/PermissionGate.tsx` gates children by hospital role. It resolves the active role via `resolveHospitalRole()` from `canonicalAccess.ts`, so comparisons are always against canonical `HospitalRole` names regardless of whether `user.role` is an emergency-role string, alias, or SaaS role. Pass canonical `HospitalRole` values (e.g., `'charge_nurse'`, `'emergency_physician'`) not emergency aliases (e.g., `'physician'`, `'nurse'`). Prefer `PermissionGate` with a `CAREDROID_PERMISSIONS` constant over `RoleGate` wherever a permission-based check is more semantically correct.

### CareDroidRouteGuard

`src/components/auth/CareDroidRouteGuard.tsx` enforces CareDroid-level route access for routes defined in `src/lib/navigation.ts` that are NOT covered by `EmergencyRouteGuard`:
- Uses `useRolePermissions()` to get the active role.
- Calls canonical `canAccessRoute(compiledProfile, pathname)` so direct route access and navigation share the same decision.
- Shows an "Access denied" view with a link to `getUnauthorizedFallback()` if the role is not in `allowedRoles`.
- Applied in `router.tsx` to `/admin/operations` and `/audit` routes.
- Do NOT apply to `emergency/*` routes — those are handled by `EmergencyRouteGuard`.

### ClinicalAlertsPage role gating

`src/pages/ClinicalAlertsPage.tsx` enforces RBAC on alert actions:
- "Acknowledge" button: gated on `can(CAREDROID_PERMISSIONS.ALERT_ACKNOWLEDGE)`. Roles without this permission see a "View only" label instead.
- "Export" button: gated on `can(CAREDROID_PERMISSIONS.REPORTS_EXPORT)`. Hidden for roles that lack this permission.
- Read-only banner: shown when `isReadOnly` is true (demo_observer, security_officer, social_worker, lab_technician, radiology_technician).
- Every acknowledgement attaches `AuditMetadata` with `acknowledgedBy` (employeeId), `userRole`, and `timestamp`. Never include PHI fields.
- Bottleneck alerts from `useOperationalIntelligence()` are merged with clinical alerts and displayed in the same list. Bottleneck IDs are prefixed `bottleneck-`.

## SaaS Service Bottleneck Detection System

CareDroid detects not only patient risk but also service and workflow bottlenecks that delay care. The system runs on every operational snapshot cycle (30-second poll).

### Core types (`src/services/bottleneckRegistry.ts`)

- `BottleneckEvent` — a detected service or workflow delay: `id`, `category` (`clinical_workflow | operational | saas_backend | interoperability | frontend`), `serviceName`, `severity` (`critical | high | medium | low`), `impactsThreeMinuteTarget`, `fallbackAction`, `ownerRole`, `responseDeadline`, `status`
- `ServiceHealth` — per-service health rollup: `serviceName`, `status` (`healthy | degraded | down | unknown`), `latencyMs`, `errorRate`, `fallbackAvailable`, `currentBottlenecks`
- `ThreeMinuteRiskProjection` — risk projection: `status` (`on_track | at_risk | breach_likely`), `criticalBottlenecks`, `highRiskPatientsAffected`, `nextOwnerRole`, `fallbackAction`, `summary`
- `BottleneckRegistrySnapshot` — complete snapshot: `activeBottlenecks`, `serviceHealth`, `threeMinuteRiskProjection`, `rootCauseSummary`, `currentServiceMap`, `analytics`
- `CURRENT_SERVICE_MAP` — 44-service current service map documenting all frontend and backend services

### Key functions

- `detectBottleneckEvents(input)` — derives `BottleneckEvent[]` from queue health, capacity band, sync status, AI Chief availability, reassessment overdue count, unacknowledged critical alerts, and existing service signals
- `buildThreeMinuteRiskProjection(events)` — builds risk projection from impacting events
- `buildBottleneckRegistrySnapshot(input)` — entry point: calls detect + serviceHealth + projection + analytics
- `bottleneckEventsToAlerts(events, previousAlerts)` — converts high/critical bottleneck events to `Alert[]` for the clinical alerts surface
- `adaptExistingServiceSignalsToBottlenecks(signals)` — adapts flow engine, escalation engine, queue, capacity, reassessment, and referral signals to `BottleneckEvent[]`

### UI components (`src/components/bottlenecks/BottleneckPanels.tsx`)

All bottleneck UI is colocated in this file. Available exports:
- `BottleneckSeverityBadge` — severity chip (critical/high/medium/low)
- `ThreeMinuteRiskIndicator` — on_track / at_risk / breach_likely status pill with summary
- `FallbackActionCard` — shows fallback action for the primary bottleneck event
- `ServiceHealthCard` — per-service status card (status, latency, error rate, fallback)
- `BottleneckImpactCard` — full bottleneck event card with severity, category, owner, deadline
- `BottleneckList` — list of `BottleneckImpactCard` items with empty state
- `RootCauseSummaryPanel` — AI Chief root cause summary + primary fallback action
- `ServiceDependencyMap` — grid of `ServiceHealthCard` items (first 6 services)
- `BottleneckCommandPanel` — composed command panel: ThreeMinuteRiskIndicator + BottleneckList + ServiceDependencyMap + RootCauseSummaryPanel

### Data flow

```
bottleneckRegistry.buildBottleneckRegistrySnapshot(input)
  → careDroidCentralNode.ts (centralSnapshot.bottleneckRegistry)
  → useOperationalIntelligence (30-second poll)
  → ClinicalAlertsPage (bottleneck alerts merged with clinical alerts)
  → CommandDashboard (BottleneckCommandPanel)
  → EmergencyAnalytics (BottleneckList + ThreeMinuteRiskIndicator, shown when surfaces.analytics.showPlatformLayers = true)
  → CopilotPanel (bottleneck context in system prompt, quick actions include "Will we breach the 3-minute target?")
```

### Safety rules for bottleneck data

- Never include patient PHI in `BottleneckEvent` fields. Use `affectedPatientId` (opaque ID) not name/DOB/MRN.
- Use `profile.employeeId` for audit metadata when a bottleneck is acknowledged.
- Never allow a bottleneck registry failure to crash the app or block emergency read-only workflow.
- If `buildBottleneckRegistrySnapshot` throws, callers must catch and return an empty/safe snapshot.
- `impactsThreeMinuteTarget: true` events must always have a non-empty `fallbackAction`.
