# CareDroid Emergency OS Patient Journey Reconstruction

Generated: 2026-06-14

## Source State

The active Emergency OS experience is a single Vite React app rooted at `src/App.jsx`, rendered through `src/components/AppShell.tsx`, with canonical paths in `src/config/routes.config.js` and primary navigation derived from `src/config/unified-navigation.config.ts` through `src/config/navigation.config.js`.

The active backend Emergency OS surface is the Nest `EmergencyOsController` in `backend/src/modules/emergency-os/emergency-os.controller.ts`, mounted under `/api/emergency/*`. The frontend facade is `src/services/emergencyOsApi.js`; active module hooks in `src/hooks/useEmergencyOs.js` hydrate the shared `src/store/emergencyStore.ts` state.

## Journey Model

The source domain model already defines the core ED journey in `src/types/emergency.ts`:

- Arrival
- Registration
- Triage
- Waiting
- Assessment
- Orders
- Results
- Disposition
- Admission
- Discharge

The requested "Consultation/Referral" stage is represented as the active `Referral` domain object and `ReferralCreated` timeline/workflow events rather than a `PatientState`. "Smart Intake" and "Identity Verification" are active workflow surfaces before/around Registration, implemented by `src/pages/emergency/SmartIntake.jsx`, `src/components/QuickIntake`, and backend Smart Intake endpoints.

## Reconstruction Decision

No second architecture was created. The pass kept:

- One AppShell: `src/components/AppShell.tsx`
- One route system: `src/App.jsx` plus `src/config/routes.config.js`
- One navigation registry: `src/config/unified-navigation.config.ts` projected through `src/config/navigation.config.js`
- One command palette registry: `src/config/commandPalette.config.js` consumed by `src/components/CommandPalette.tsx`
- One backend Emergency OS API surface: `/api/emergency/*`
- One domain model: `src/types/emergency.ts`
- One central node: `src/central-node/careDroidCentralNode.ts` and backend `CareDroidCentralNodeService`

## Safe Reconstruction Applied

The Queues route now supplements backend queue rows with existing local journey signals for `Referral` and discharge-ready `Disposition` patients, so referral and discharge bottlenecks are visible even when the backend queue envelope is partial.

The central node queue snapshot now includes `referral`, `discharge`, and `reassessment` queue rows sourced from existing referrals, patient disposition state, and reassessment flags.

## Remaining Principle

The application remains a human-reviewed Emergency OS. Identity matches, triage movement, referral decisions, admission, and discharge are surfaced for staff action; no autonomous identity, disposition, or clinical decision logic was introduced.
