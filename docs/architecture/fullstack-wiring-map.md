# Emergency OS Full-Stack Wiring Map

Date: 2026-06-13

## Active Frontend Flow

The active frontend path is:

`src/main.jsx` -> `src/App.jsx` -> `RootLayout` -> `src/components/AppShell.tsx` -> target route component.

Navigation is sourced from `src/config/unified-navigation.config.ts`. Route and redirect definitions are sourced from `src/config/routes.config.js`. Search discovery is sourced from `src/data/searchFirstDiscovery.js`. Command palette route entries are sourced from `src/config/commandPalette.config.js` and the runtime command palette in `src/components/CommandPalette.tsx`.

## Route To UI Map

| Route | UI surface | Data path |
| --- | --- | --- |
| `/emergency/whiteboard` | `EmergencyWhiteboard` | `useEmergencyStore`, `useEmergencyOs`, `/api/emergency/*` facade |
| `/emergency/patients` | Patient census route in `src/App.jsx` | `useEmergencyPatients`, `src/store/emergencyStore.ts` |
| `/emergency/ems` | `EMSPipeline` | `useEmergencyStore`, EMS arrival actions, `/api/fleet/snapshot` feature metadata |
| `/emergency/intake` | `SmartIntake` | `useEmergencyStore`, `createSmartIntakePatient`, `/api/emergency/intake/*` |
| `/emergency/queues` | Queue route in `src/App.jsx` | `useEmergencyQueues`, queue selectors in `emergencyStore` |
| `/emergency/reassessment` | Reassessment route in `src/App.jsx` | `useReassessmentQueue`, reassessment selectors/actions |
| `/emergency/capacity` | Capacity route in `src/App.jsx` | `useCapacityStatus`, `/api/emergency/capacity/history` |
| `/emergency/boarding` | Boarding route in `src/App.jsx` | `useBoardingStatus`, `/api/emergency/analytics` |
| `/emergency/referrals` | `ReferralPanel` | `useEmergencyStore`, `/api/emergency/referrals` |
| `/emergency/copilot` | `CopilotPanel` / `ChatInterface` | `clinicalChatService.js`, `/api/emergency/copilot/message` fallback path |
| `/emergency/analytics` | `EmergencyAnalytics` | `useEmergencyStore`, `/api/emergency/analytics` |
| `/emergency/settings` | `EmergencySettings` | `useEmergencyStore`, feature/settings registries |

## Backend Contract

The active backend surface remains the Nest module under `backend/src/modules/emergency-os`, exposed through `/api/emergency/*`. The canonical frontend facade is `src/services/emergencyOsApi.js`, consumed by `src/hooks/useEmergencyOs.js` and synchronized through `src/store/emergencyStore.ts`.

Optional Express/Mongoose and advanced placeholder endpoints are not promoted to active navigation by this pass. They remain manual-review surfaces because payload naming, persistence semantics, and identifiers still drift from the canonical facade.

## Copilot Wiring

The active AI/copilot path remains:

`src/components/CopilotPanel.tsx` and `src/components/ChatInterface.jsx` -> `src/services/clinicalChatService.js` -> `/api/emergency/copilot/message`.

No provider-level AI changes were made. Copilot feature gates and tool-action permissions were left intact, while retired page navigation commands were removed or routed to active Emergency OS pages.

## Registry Ownership

- Routes and redirects: `src/config/routes.config.js`
- Sidebar navigation: `src/config/unified-navigation.config.ts`
- Route command palette config: `src/config/commandPalette.config.js`
- Runtime command palette UI/actions: `src/components/CommandPalette.tsx`
- Search discovery: `src/data/searchFirstDiscovery.js`
- Render inventory: `src/data/emergencyPageRenderInventory.js`
