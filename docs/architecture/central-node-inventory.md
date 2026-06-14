# Central Node Inventory

## Active Spine
- Frontend: Vite React SPA rooted in `src/App.jsx`.
- Shell: existing `src/components/AppShell.tsx`; no new shell or layout structure was introduced.
- Routes: canonical Emergency OS route tree in `src/config/routes.config.js`; the pilot-facing pages remain dedicated routes with Whiteboard-first redirects/aliases preserved.
- State: existing Zustand store in `src/store/emergencyStore.ts` remains the operational state source for patients, rooms, capacity, EMS, referrals, alerts, workflow logs, websocket status, settings, feature flags, and Copilot messages.
- API client: existing `src/services/emergencyOsApi.js` now includes the central-node snapshot endpoint.
- Backend: existing Nest `EmergencyOsModule` and `/api/emergency/*` controller/service convention.

## Existing Operational Surfaces
- Whiteboard: `src/pages/emergency/index.tsx` consumes store state plus `useEmergencyWhiteboard`, opens Quick Intake, reassessment drawer, EMS conversion, queue navigation, referral workflow, capacity crisis actions, and patient cards.
- Patient cards/details: `PatientCard.tsx` selects patients into the existing `PatientDetailPanel.tsx`; cards do not create a parallel navigation-only detail path.
- Command palette/search: `CommandPalette.tsx`, Header patient lookup, and AppShell keyboard handlers provide global patient/action lookup.
- Alerts/notifications: store `alerts`, Header alert drawer, `EMSCriticalBroadcast`, `dispatchAlert`, and sonner toaster are already present.
- Audit/events: store `workflowLogs`, `auditLog`, backend `WorkflowActionLogService`, websocket dispatcher, and realtime polling facade already exist.
- Backend modules: whiteboard, patients, journey, EMS, intake, queues, reassessment, capacity, boarding, referrals, integrations, Copilot, analytics, settings, workflow logs.

## Inventory Decision
`CareDroidCentralNode` was normalized as a facade over existing store/service data, not as a new application, shell, router, API convention, or duplicate state island.
