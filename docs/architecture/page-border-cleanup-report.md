# Page Border Cleanup Report

## Scope

Cleaned page-content borders in CareDroid Emergency OS without changing routing, AppShell structure, Header, Sidebar, command palette shell, or system chrome styling.

## Changed Patterns

- Replaced large page-card perimeter borders with existing surface backgrounds and soft elevation.
- Preserved clinical state affordances by keeping priority left rails, warning/danger glows, active inset markers, status chips, and button/input affordances.
- Kept table and list readability through row spacing, retained header/row dividers where they act as separators, and used background contrast for nested rows.
- Converted selected/active nested cards from full borders to inset status markers where safe.
- Left focus outlines and form-control borders intact.

## Files Changed

- `src/components/CapacityCrisisMode.css`
- `src/components/CopilotPanel.css`
- `src/components/CrisisMode.css`
- `src/components/EMSPipeline.css`
- `src/components/EMSPressureScore.css`
- `src/components/EmergencyWhiteboard.css`
- `src/components/PatientCard.css`
- `src/components/PatientCard.tsx`
- `src/components/PatientDetailPanel.css`
- `src/components/PatientDetailPanel.tsx`
- `src/components/QueueIntelligencePanel.css`
- `src/components/QuickIntake.tsx`
- `src/components/ReassessmentDrawer.css`
- `src/components/ReferralPanel.css`
- `src/pages/emergency/EmergencyAnalytics.css`
- `src/pages/emergency/EmergencySettings.css`
- `src/pages/emergency/SmartIntake.css`
- `src/pages/emergency/index.tsx`

## Borders Removed Or Softened

- Whiteboard: stats cards, content frame, mission cards, EMS arrival preview cards, skeletons, and detail overlay edge.
- Patient surfaces: patient cards now use priority left rails and state shadows instead of full borders; Patient Detail timeline/workflow/sepsis rows use surface contrast.
- EMS and referrals: operational rows and metric tiles keep severity rails while dropping full-card outlines.
- Smart Intake and Quick Intake: page panels, field/candidate cards, modal shell, and protocol/info panels use surfaces and inset state accents.
- Queue, reassessment, capacity, crisis, analytics, settings, and Copilot content: nested card borders were removed where background/elevation already separated the content.

## Borders Kept Intentionally

- AppShell, Header, Sidebar, command palette shell, and system chrome were not edited.
- Focus outlines, form input borders, primary/action button borders, close buttons, alert/status borders, clinical chips, and critical warning/danger affordances remain.
- Table row/header dividers and drawer/section separators remain where they preserve scanability.
- Priority rails, status dots, warning/danger pulses, and selected/active inset markers remain visible.

## Validation

- Static review confirmed edits were limited to page content and component styles listed above.
- Remaining border usage in touched files is primarily controls, inputs, separators, alerts, chips, or clinical state indicators.
- Edited-file IDE diagnostics: no linter errors found.
- Focused Emergency OS tests passed: `npx vitest run src/components/EmergencyWhiteboard.navigation.test.js src/components/EmergencyWhiteboard.storeReactivity.test.jsx src/components/QueueIntelligencePanel.test.jsx src/components/PatientCard.clinicalIntelligence.test.jsx src/pages/emergency/EmergencySettings.test.jsx src/components/EMSPressureScore.test.js src/components/CrisisMode.test.jsx src/components/ReassessmentDrawer.test.ts`.
- Frontend typecheck passed: `npm run typecheck:frontend`.
- Frontend lint passed: `npm run lint`.
- Production build passed: `npm run build`.
- Build emitted existing Vite warnings about circular manual chunks and `offlineService.js` being both dynamically and statically imported.
- Full visual QA is still required in the browser because the work is visual and the tree contains many pre-existing dirty changes from parallel workers.

## Manual Visual QA

- Whiteboard: grid/list views, mission-control cards, queue panel expanded/collapsed, patient detail overlay.
- Patient cards: P1/P2/P3, long wait, LWBS risk, deterioration risk, reassessment due, EMS arrival, keyboard selected.
- EMS: unit grid, diversion card, incoming/arrived/critical rows, pressure gauge.
- Smart Intake and Quick Intake: verified/conflicting/missing/overridden fields, selected candidates, protocol suggestions.
- Reassessment, Capacity, Boarding, Referrals, Copilot, Analytics, and Settings pages in light/dark and responsive widths.
