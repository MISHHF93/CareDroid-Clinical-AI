# Emergency OS UX Standardization Report

Date: 2026-06-13

## Scope

Active Emergency OS pages standardized in the existing Vite React/AppShell architecture:

- Emergency Whiteboard
- Patients
- EMS
- Smart Intake
- Queues
- Reassessment
- Capacity
- Boarding
- Referrals
- Copilot
- Analytics
- Settings

No new AppShell, router, API convention, module, or product feature was introduced.

## Dominant Design Language

The active Emergency OS product language is already established by AppShell, Whiteboard, EMS, Referrals, Analytics, and Settings:

- Dark AppShell background with `var(--color-background)`.
- Bordered rounded surfaces using `var(--color-surface)` and `var(--color-border-subtle)`.
- Compact uppercase eyebrows in `var(--status-info)`.
- KPI/status strips with monospace values and uppercase labels.
- Operational cards with left status accents for risk/breach states.
- Dashed empty states for intentional no-data conditions.
- Inline loading/error/status banners that preserve local fallback behavior.
- Role-aware disabled controls that remain visible and explain availability.

## Standardization Applied

- Normalized the shared inline Emergency route wrapper in `src/App.jsx` to match existing CSS-variable page heroes, surfaces, KPI cards, state banners, empty states, and data-source notes.
- Added patient search to the Patients route using the existing `q` query parameter already produced by command/search flows.
- Added Queue KPI cards from existing queue data and normalized queue rows to the shared card/list pattern.
- Normalized Capacity recommendations and Copilot quick-action/safety surfaces as Emergency OS cards/pills.
- Added a referral form empty state when no active patient matches the selector query.
- Normalized Smart Intake root background, button typography, pointer states, and disabled states.
- Normalized Settings disabled button cursor behavior.
- Preserved all existing page behavior and AppShell route mounting.

## Page Results

- Whiteboard: retained as the strongest active visual reference.
- Patients: standardized hero/actions/KPI/search/card/empty pattern.
- EMS: retained existing Emergency OS surface language; clarified disabled actions in previous AppShell pass.
- Smart Intake: aligned root surface and button/disabled states.
- Queues: added KPI strip and normalized queue list cards.
- Reassessment: inherits standardized route wrapper, KPI, patient cards, empty/error/loading states.
- Capacity: inherits standardized route wrapper/KPIs and normalized recommendations.
- Boarding: inherits standardized route wrapper, KPI strip, patient cards, and empty/error/loading states.
- Referrals: retained existing cards/forms/action bars and added no-match patient selector state.
- Copilot: inherits standardized route wrapper/KPIs and normalized safety/quick action surfaces.
- Analytics: retained chart card language and intentional loading/empty chart states.
- Settings: retained existing admin card/form sections and normalized disabled cursor behavior.

## Remaining Manual Browser QA

- Verify responsive spacing for the AppShell header plus route page heroes at tablet and mobile widths.
- Exercise overlay stacking: command palette, patient detail, Copilot, reassessment drawer, alert drawer, QuickIntake, and referral form.
- Confirm keyboard focus visibility across Smart Intake, Referrals, Settings, and Patient detail controls.
- Hard-refresh each active route in Chromium to confirm direct-route render with the deployed Vite fallback.

## Validation

Passed:

- `npm run typecheck:frontend`
- `npm run lint`
- `npx vitest run src/routing/canonicalRouteTree.behavior.test.jsx src/config/unified-navigation.config.test.ts src/components/AppShell.r12.test.tsx src/components/CommandPalette.test.tsx src/components/QuickCommandLauncher.test.jsx src/pages/emergency/EmergencySettings.test.jsx`
- `npm run build`
- Edited-file diagnostics for App route, Referral, Smart Intake, Settings, and this report

Nonblocking warnings:

- Git reported LF-to-CRLF normalization warnings for existing tracked files.
- Vite build still reports the existing circular manual chunk warning: `vendor -> vendor-react -> vendor`.
- Vite build still reports the existing mixed static/dynamic import warning for `src/services/offlineService.js`.
