# Active System Map

Date: 2026-06-13

## Single Active Runtime

```text
CareDroid Emergency OS
├─ Frontend: Vite React SPA
│  ├─ Entry: src/main.jsx
│  ├─ Router: src/App.jsx
│  ├─ Shell: src/components/AppShell.tsx
│  ├─ Header: src/components/Header.tsx
│  ├─ Sidebar: src/components/Sidebar.tsx
│  ├─ Navigation source: src/config/unified-navigation.config.ts
│  ├─ Route source: src/config/routes.config.js + src/App.jsx renderer
│  ├─ Command registry: src/config/commandPalette.config.js
│  ├─ Store: src/store/emergencyStore.ts
│  ├─ Central node hook: src/hooks/useCareDroidCentralNode.ts
│  └─ API facade: src/services/emergencyOsApi.js
│
├─ Backend: Nest application
│  ├─ Entry: backend/src/main.ts
│  ├─ Root module: backend/src/app.module.ts
│  ├─ Global prefix: /api
│  ├─ Emergency OS module: backend/src/modules/emergency-os/emergency-os.module.ts
│  ├─ Emergency OS controller: backend/src/modules/emergency-os/emergency-os.controller.ts
│  ├─ Emergency OS services: backend/src/modules/emergency-os/emergency-os.services.ts
│  └─ Emergency OS route base: /api/emergency/*
│
└─ Shared/Support
   ├─ Emergency logic: lib/emergency-os/logic.ts
   ├─ AI config base: lib/ai/config.ts
   ├─ Feature registry: lib/features/featureRegistry.ts
   ├─ MCP tooling: mcp/
   └─ Android packaging: android/ + capacitor.config.json
```

## Canonical Frontend Routes

- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/analytics`
- `/emergency/settings`

## Canonical Backend Endpoints

- `/api/emergency/central-node/snapshot`
- `/api/emergency/whiteboard`
- `/api/emergency/patients`
- `/api/emergency/ems`
- `/api/emergency/intake`
- `/api/emergency/queues`
- `/api/emergency/reassessment`
- `/api/emergency/capacity`
- `/api/emergency/boarding`
- `/api/emergency/referrals`
- `/api/emergency/copilot`
- `/api/emergency/analytics`
- `/api/emergency/settings`

## Compatibility Layers

- `src/config/navigation.config.js` projects the unified navigation into older JS consumers.
- `src/navigation/primaryNavigation.js` re-exports navigation projections.
- `src/store/emergency-store.ts` re-exports `src/store/emergencyStore.ts`.
- `frontend/src/*` files are compatibility shims, not a second frontend app.
- `frontend/src/components/SystemHealth.tsx` re-exports `src/components/SystemHealth.tsx`.
- `src/components/CommandPalette.jsx` re-exports `src/components/CommandPalette.tsx`.

## Optional/Manual Review Layers

- `backend/src/api/routes-registry.ts` is optional Express/Mongoose routing, gated by environment.
- `src/layout/AppShell.jsx` is a legacy shell helper retained for tests/manual review.
- Broad platform modules in `backend/src/app.module.ts` are still mounted and require a separate retirement plan if CareDroid is narrowed further.
# Active System Map

Date: 2026-06-13

## Single Active Spine

```text
package.json
  -> vite.config.js
  -> src/main.jsx
  -> src/App.jsx
  -> src/components/AppShell.tsx
       -> src/components/Sidebar.tsx
       -> src/components/Header.tsx
       -> src/components/CommandPalette.tsx
       -> src/components/CopilotPanel.tsx
       -> <Outlet />
  -> canonical /emergency/* pages
       -> src/hooks/useEmergencyOs.js
       -> src/store/emergencyStore.ts
       -> src/services/emergencyOsApi.js
       -> /api/emergency/*
  -> backend/src/main.ts
       -> backend/src/app.module.ts
       -> backend/src/modules/emergency-os/emergency-os.module.ts
       -> backend/src/modules/emergency-os/emergency-os.controller.ts
       -> backend/src/modules/emergency-os/emergency-os.services.ts
```

## Canonical Frontend Routes

| Route | Classification | Render Source | Data Source |
| --- | --- | --- | --- |
| `/emergency/whiteboard` | ACTIVE_EMERGENCY_OS | `src/components/EmergencyWhiteboard.jsx` | `fetchEmergencyWhiteboard`, store |
| `/emergency/patients` | ACTIVE_EMERGENCY_OS | inline route in `src/App.jsx` | `fetchEmergencyPatients`, store |
| `/emergency/ems` | ACTIVE_EMERGENCY_OS | `src/components/EMSPipeline.jsx` | `fetchEMSIntake`, store |
| `/emergency/intake` | ACTIVE_EMERGENCY_OS | `src/pages/emergency/SmartIntake.jsx` | `fetchSmartIntake`, intake actions |
| `/emergency/queues` | ACTIVE_EMERGENCY_OS | inline route in `src/App.jsx` | `fetchEmergencyQueues`, store |
| `/emergency/reassessment` | ACTIVE_EMERGENCY_OS | inline route in `src/App.jsx` | `fetchReassessmentQueue`, store |
| `/emergency/capacity` | ACTIVE_EMERGENCY_OS | inline route in `src/App.jsx` | `fetchCapacityStatus`, store |
| `/emergency/boarding` | ACTIVE_EMERGENCY_OS | inline route in `src/App.jsx` | `fetchBoardingStatus`, store |
| `/emergency/referrals` | ACTIVE_EMERGENCY_OS | `src/components/ReferralPanel.jsx` | `fetchReferrals`, store |
| `/emergency/copilot` | ACTIVE_EMERGENCY_OS | inline route and AppShell panel | `fetchEDCopilot`, AI client |
| `/emergency/analytics` | ACTIVE_EMERGENCY_OS | `src/pages/emergency/EmergencyAnalytics.jsx` | `fetchEmergencyAnalytics`, store |
| `/emergency/settings` | ACTIVE_EMERGENCY_OS | `src/pages/emergency/EmergencySettings.jsx` | `fetchEmergencySettings`, `updateEmergencySettings` |

## Redirect Surface

Legacy and non-Emergency paths such as `/dashboard`, `/home`, `/workspace`, `/mobile`, `/android`, `/tools/*`, `/assistant`, `/chat`, `/ai`, and unknown `/emergency/*` are redirected to `/emergency/whiteboard`.

## Central Node

| Artifact | Classification | Role |
| --- | --- | --- |
| `src/central-node/careDroidCentralNode.ts` | ACTIVE_EMERGENCY_OS | Frontend central operational snapshot builder and redaction logic. |
| `src/hooks/useCareDroidCentralNode.ts` | ACTIVE_EMERGENCY_OS | React facade combining store snapshot, backend snapshot, and realtime state. |
| `backend/src/modules/emergency-os/emergency-os.controller.ts` | ACTIVE_EMERGENCY_OS | Exposes `/api/emergency/central-node/snapshot`. |

## Compatibility Boundaries

| Artifact | Classification | Role |
| --- | --- | --- |
| `src/config/navigation.config.js` | SHARED_REQUIRED | Projection from unified navigation for legacy consumers. |
| `store/emergencyStore.ts` | DUPLICATE_INACTIVE | Root re-export shim for tests/legacy imports. |
| `frontend/src/store/emergency-store.ts` | DUPLICATE_INACTIVE | Frontend-root compatibility re-export, not a second app. |
| `src/layout/AppShell.jsx` | DUPLICATE_INACTIVE / NEEDS_MANUAL_REVIEW | Legacy shell helper, not active router shell. |
