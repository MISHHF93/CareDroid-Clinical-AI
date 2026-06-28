# CareDroid Copilot Instructions

CareDroid is the AI Chief of Staff for emergency department and hospital operations. Its highest-priority mission is: "Help save a human life in the first 3 minutes of any critical alert or patient arrival." Always refine the current codebase first. Do not create a new app, replace working routes, or remove existing functionality unless explicitly requested.

Core engineering rules:
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

## User profiles and role-based access control

CareDroid models realistic hospital roles for the CareDroid Virtual City Health Network.

### Role system

Use `src/lib/users/` as the single source of truth for roles, permissions, and demo users:
- `userTypes.ts` — `CareDroidUserProfile` type and `HospitalRole` union
- `hospitalNetwork.ts` — hospital sites, city zones, departments
- `permissions.ts` — `CAREDROID_PERMISSIONS`, `ROLE_PERMISSIONS` map, permission helpers
- `roleAccess.ts` — role labels, descriptions, emergency role mapping, dashboard config
- `demoUsers.ts` — seeded demo users (`DEMO_USERS`)
- `aiChiefRouting.ts` — AI recommendation routing by role and alert scenario

### RBAC rules

- Do not hardcode role checks inside UI components. Use `useRolePermissions()` or `hasCareDroidPermission()`.
- All permission checks must go through the centralized helpers in `permissions.ts`.
- Demo users live only in `demoUsers.ts`. Never scatter mock users in component files.
- Clinical permissions follow least privilege. Non-clinical roles cannot edit clinical decisions.
- Permissions cascade from role definitions — never copy-paste permission arrays into components.
- Use `toEmergencyRoleId()` from `roleAccess.ts` to map a `HospitalRole` to an existing emergency role ID for navigation compatibility.

### Demo user switcher

`src/components/auth/DemoUserSwitcher.tsx` allows switching the active demo user during demo or dev mode.
- Only render it in demo/dev contexts. Never expose it in production.
- Switching a demo user updates both `useCareDroidUser` state and the existing `UserContext` role for nav routing.

### AI Chief routing

When AI recommendations are generated, include:
- `assignedRole` — the hospital role responsible for this recommendation
- `visibleToRoles` — which roles can see this alert/recommendation
- `escalationRole` — role to escalate to if unacknowledged
- `requiresClinicianReview` — must be `true` for all clinical recommendations
- `clinicianOverrideAvailable` — whether a clinician can dismiss/modify the AI output

Use `src/lib/users/aiChiefRouting.ts` to resolve visibility and escalation by alert scenario.

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
- `UserSwitcher.tsx` — re-exports `DemoUserSwitcher` as `UserSwitcher`.

### CareDroidRouteGuard

`src/components/auth/CareDroidRouteGuard.tsx` enforces CareDroid-level route access for routes defined in `src/lib/navigation.ts` that are NOT covered by `EmergencyRouteGuard`:
- Uses `useRolePermissions()` to get the active role.
- Calls `canRoleAccessRoute(role, pathname)` — passes through unknown paths (safe for any future routes).
- Shows an "Access denied" view with a link to `getUnauthorizedFallback()` if the role is not in `allowedRoles`.
- Applied in `router.tsx` to `/admin/operations` and `/audit` routes.
- Do NOT apply to `emergency/*` routes — those are handled by `EmergencyRouteGuard`.

### RoleDashboardPanel

`src/components/dashboard/RoleDashboardPanel.tsx` renders role-specific widget cards for the active user:
- Reads `getDashboardWidgets(role)` from `roleAccess.ts` to get `{ primary, secondary }` widget IDs.
- Renders titled widget cards in "Primary" and "Secondary" groups.
- Shows the active role, department, and hospital site from the current demo user profile.
- Use this component on landing or dashboard pages to provide role-contextual content without hardcoding role checks in page files.

### ClinicalAlertsPage role gating

`src/pages/ClinicalAlertsPage.tsx` enforces RBAC on alert actions:
- "Acknowledge" button: gated on `can(CAREDROID_PERMISSIONS.ALERT_ACKNOWLEDGE)`. Roles without this permission see a "View only" label instead.
- "Export" button: gated on `can(CAREDROID_PERMISSIONS.REPORTS_EXPORT)`. Hidden for roles that lack this permission.
- Read-only banner: shown when `isReadOnly` is true (demo_observer, security_officer, social_worker, lab_technician, radiology_technician).
- Every acknowledgement attaches `AuditMetadata` with `acknowledgedBy` (employeeId), `userRole`, and `timestamp`. Never include PHI fields.
