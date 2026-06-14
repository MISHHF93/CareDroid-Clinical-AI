# API Surface Normalization Report

Date: 2026-06-13

## Canonical Frontend API Path

Active Emergency OS pages use the frontend facade in `src/services/emergencyOsApi.js`, consumed by `src/hooks/useEmergencyOs.js` and synchronized with `src/store/emergencyStore.ts`.

The canonical backend surface is Nest `/api/emergency/*`.

## Active Endpoint Group

`src/services/emergencyOsApi.js` now exports `ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS` for active page/facade usage:

- `whiteboard`
- `patients`
- `ems`
- `intake`
- `smartIntakeVerticalSlice`
- `queues`
- `reassessment`
- `capacity`
- `boarding`
- `referrals`
- `copilot`
- `workflowLogs`
- `analytics`
- `settings`

## Review-Only Endpoint Group

`REVIEW_ONLY_EMERGENCY_OS_API_ENDPOINT_KEYS` keeps retained capabilities explicit without promoting them to active routes:

- patient journey standalone API
- provincial health connector
- integration hub connector
- real-time simulation
- federated learning
- hybrid digital twin

These remain demo/facade/review-backed unless product work promotes them into the active 12-route surface.

## Optional Runtime Endpoints

Optional Express/Mongoose smart-intake runtime endpoints remain documented in inventory as optional runtime surfaces. They are not the primary active page contract. Active Smart Intake continues to prefer the Nest Emergency OS facade and local fallback behavior.

## Copilot

The active copilot path remains `CopilotPanel` / `ChatInterface` -> `clinicalChatService.js` -> `/api/emergency/copilot/message` with fallback behavior. No AI provider or backend convention was changed in this pass.
