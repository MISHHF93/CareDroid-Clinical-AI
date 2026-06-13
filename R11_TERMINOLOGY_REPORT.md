# R11 Terminology Report

## Searches Run

- `rg '"Case"' src --glob '*.{ts,tsx,js,jsx}'`
  - Result: 0 residual matches.
- `rg "'Case'" src --glob '*.{ts,tsx,js,jsx}'`
  - Result: 0 residual matches.
- `rg 'case_id|caseId|case_status' src --glob '*.{ts,tsx,js,jsx}'`
  - Result: 0 residual matches.
- `rg '\b(Case|Cases|Record|Records|Workspace|Dashboard)\b' src --glob '*.{ts,tsx,js,jsx}'`
  - Result: residual matches remain in technical, non-ED, route, TypeScript utility, dashboard component, and generic "use cases"/"edge cases" contexts.
- `rg 'CareDroid Emergency OS|Emergency Workspace|Workspace Dashboard|Standalone Emergency Workspace|Emergency Workspace overview|Dashboard-first workflow|Dashboard model|Dashboard widgets reduced|\bCase workflows\b|active case|EMS case|sample case|summarize active case|Confirm owner|specialty owner|operational owner|mitigation owner|SaaS modules|\bModule add-on\b|Enterprise module add-on|Patient Journey Engine feed|Create Intake Record|Structured Record|intake record' src --glob '*.{ts,tsx,js,jsx}'`
  - Result: 0 residual matches.
- `rg 'Encounter ID|Queue Item|Ticket|Assignee|\bVisit\b|\bClient\b|CareDroid Emergency OS|Emergency Workspace|Workspace Dashboard|Create Intake Record|Structured Record|intake record' src --glob '*.{ts,tsx,js,jsx}'`
  - Result: remaining matches are technical `Client-side` implementation notes and non-patient/client API language.

## Changes Made

### Patient Terminology

- Replaced patient-facing `case` language with `patient` or `scenario`:
  - Patient workflow cards now say `Summarize active patient` and `Patient workflows`.
  - EMS handoff and demo metrics now say EMS `patient(s)`.
  - Simulation copy now uses `patient scenarios` or `simulation scenarios`.
  - NLU simulation alias changed from `practice sepsis case` to `practice sepsis scenario`.

### Emergency OS / Whiteboard Terminology

- Replaced ED-facing `CareDroid Emergency OS` labels with `Emergency OS`.
- Replaced ED-facing `Emergency Workspace` copy with `Emergency OS`.
- Replaced ED-facing `Dashboard` copy with `Emergency Whiteboard` or `Whiteboard`.
- Updated accessible labels from `Dashboard context` to `Whiteboard context`.
- Updated onboarding and deployment labels:
  - `Emergency OS Onboarding`
  - `Emergency OS overview`
  - `Standalone Emergency OS`
  - `ED Command Whiteboard`

### Feature / Module Terminology

- Replaced user-facing `modules` copy with `features` in Emergency automation marketplace and future-feature UI copy.
- Replaced `Module add-on` billing text with `Feature add-on`.
- Left internal `module` property names and metrics such as `totalModules` intact where they are existing code contracts.

### Patient State / Ownership / Record Terms

- Replaced patient-facing `Status` labels with `State` where the UI described patient whiteboard/reassessment state.
- Replaced patient/referral `owner` action copy with assigned-staff language.
- Replaced intake `Record` wording with patient/context language:
  - `Create Intake Patient`
  - `Structured Patient`
  - `intake patient context`
- Left structural fields such as `structuredRecord` and TypeScript `Record<>` untouched.

### Tests Updated

- Updated focused UI/data tests that asserted old terminology:
  - `CommandDashboard.test.jsx`
  - `WorkspaceHome.test.jsx`
  - `OperatingWorkspace.launch.test.jsx`
  - `workspaceExperience.test.js`
  - `emergencyOperatingSystem.test.js`
  - `emergencyIntakeOperatingSystemService.test.js`
  - `workspaceDataPipelineService.test.js`
  - `edAutomationMarketplace.test.js`
  - `referralHub.test.js`
  - `simulationLaboratoryViewerWiring.test.js`
  - `automationRegistry.test.js`
  - `RecommendationsPage.test.jsx`
  - `emergencyOperatingSystemService.test.js`

## File / Component Renames

- `CaseCard` -> `PatientCard`: skipped. No active `CaseCard` symbol found in `src`.
- `CaseStore` -> `emergencyStore`: skipped. No active `CaseStore` symbol found in `src`; `emergencyStore` already exists.
- `CaseList` / `PatientList`: skipped. No active symbols found in `src`.
- `UserProfile` -> `StaffProfile`: skipped. No active clinical staff `UserProfile` component found; residual references are documentation/example auth UI snippets or auth concerns.
- `AdminDashboard` -> `Settings`: skipped. No active `AdminDashboard` component found; residual references are documentation/example snippets.
- `AnalyticsDashboard` -> `ShiftSummary` or stub: skipped. Existing `AnalyticsDashboard` is a platform analytics page, not an ED shift-summary surface. Renaming it would create broad route/import churn outside R11 terminology scope.

No file renames were performed.

## Intentional Residual Old Terms

- `case` remains in JavaScript `switch case` syntax, test names like `edge cases`, and generic product phrases such as tool `Use Cases`.
- `Record` remains in TypeScript utility types, JSDoc types, internal `EmergencyRecord` aliases, structural fields like `structuredRecord`, and legal consent-record pages.
- `Workspace` remains in route paths, workspace-context infrastructure, non-ED workspace settings, and platform architecture pages.
- `Dashboard` remains in non-ED page names, dashboard component names such as `DashboardGrid`, registry/tool ids such as `medicalIotDashboard`, and platform/fleet/analytics surfaces outside ED whiteboard context.
- `Client` remains in API/client implementation terminology such as `Client-side in ...`; no patient/client usage was changed.
- `Owner` remains in governance, plugin, route ownership, billing/admin, and AI model ownership contexts that are not patient assignment.

## Verification

- `npx vitest run src/pages/WorkspaceHome.test.jsx src/pages/OperatingWorkspace.launch.test.jsx src/data/workspaceExperience.test.js src/pages/CommandDashboard.test.jsx src/data/emergencyOperatingSystem.test.js src/services/emergencyIntakeOperatingSystemService.test.js src/services/workspaceDataPipelineService.test.js src/services/edAutomationMarketplace.test.js src/services/referralHub.test.js src/data/simulationLaboratoryViewerWiring.test.js src/data/automationRegistry.test.js src/pages/RecommendationsPage.test.jsx src/services/emergencyOperatingSystemService.test.js`
  - Passed: 12 test files, 63 tests.
- `npx tsc --noEmit`
  - Passed.
- ReadLints on edited files
  - Passed: no linter errors found.

