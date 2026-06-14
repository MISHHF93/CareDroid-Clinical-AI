# Nested Card Flattening Report

## Findings

- Patient cards used a raised outer card plus multiple inner floating chips for demographics, complaint, state, room, staff, timeline, saved scores, and mission actions. This created a card-on-card feel inside already dense whiteboard cards.
- Patient detail surfaces repeated dark mini-cards for vitals, notes, workflow logs, timeline items, and sepsis bundle rows inside a fixed detail drawer.
- Queue, EMS, referral, reassessment, and capacity crisis surfaces used row-level card backgrounds, borders, rounded panels, and shadows inside larger operational sections.
- Whiteboard mission-control cards and arrival/task previews were styled as nested cards inside a mission-control band.
- Empty, loading, and error states were already visible; they needed to remain distinct without adding extra elevation.

## Files Changed

- `src/styles/design-tokens.css`
- `src/components/PatientCard.css`
- `src/components/PatientDetailPanel.tsx`
- `src/components/PatientDetailPanel.css`
- `src/components/EmergencyWhiteboard.css`
- `src/pages/emergency/index.tsx`
- `src/components/QueueIntelligencePanel.css`
- `src/components/EMSPipeline.css`
- `src/components/ReferralPanel.css`
- `src/components/ReassessmentDrawer.css`
- `src/components/CapacityCrisisMode.css`
- `src/pages/emergency/EmergencyAnalytics.css`
- `src/pages/emergency/SmartIntake.css`

## Before / After Pattern Summary

- Before: inner rows often used `var(--color-card)`, `var(--color-floating-surface)`, full borders, large radii, and `var(--component-card-shadow)` inside an already elevated panel.
- After: top-level operational shells remain visually distinct, while nested elements use shared inner-surface tokens:
  - `--component-inner-surface-bg`
  - `--component-inner-surface-border`
  - `--component-inner-row-bg`
  - `--component-inner-row-hover-bg`
  - `--component-inner-radius`
  - `--component-inner-shadow`
- Patient cards now keep priority/status/wait/flag signals prominent, but interior chips and quick actions read as inline metadata/actions instead of stacked cards.
- Patient detail vitals, notes, workflow logs, timeline items, and sepsis bundle rows now render as drawer rows/sections.
- EMS, referral, queue, reassessment, and capacity crisis items keep status color strips/chips while removing row-level elevation.
- Whiteboard mission-control previews and KPI/stat cells use flattened inner-row treatment while preserving existing navigation and workflows.

## Validation

- Edited-file diagnostics: passed with no linter errors.
- Focused tests: `npm run test:run -- src/components/PatientCard.clinicalIntelligence.test.jsx src/components/EmergencyWhiteboard.navigation.test.js src/components/EmergencyWhiteboard.storeReactivity.test.jsx` passed, 3 files / 9 tests.
- Frontend typecheck: `npm run typecheck:frontend` passed.
- Build: `npm run build` passed. Vite reported existing bundle warnings about manual chunk circularity and `offlineService.js` being both statically and dynamically imported.

## Remaining Manual Visual QA

- Review dark and light theme whiteboard patient cards for density/readability at desktop, tablet, and phone widths.
- Verify mission-control quick actions remain comfortably tappable and do not overflow on the smallest supported cards.
- Review Emergency OS EMS, referrals, reassessment drawer, patient detail drawer, and capacity crisis drawer for sufficient row separation after elevation removal.
