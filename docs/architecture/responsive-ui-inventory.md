# Responsive UI Inventory

## Scope Adaptation

The active CareDroid Emergency OS frontend is the existing Vite/React app under `src/`. The detailed responsive prompt was adapted to this repository reality:

- No `/frontend` tree was created.
- `src/components/AppShell.tsx`, `src/App.jsx`, and the current route configuration remain intact.
- Existing Emergency OS components and CSS/token files were extended instead of replacing the AppShell, router, whiteboard, or patient cards.
- Tailwind was not introduced because the active app uses CSS modules/files, inline React styles, and global token layers.

## Active Emergency OS Surfaces

- Shell and navigation: `src/components/AppShell.tsx`, `src/components/Header.tsx`, `src/components/Header.css`, `src/components/Sidebar.tsx`, `src/components/Sidebar.css`.
- Whiteboard route: `src/components/EmergencyWhiteboard.jsx` re-exports `src/pages/emergency/index.tsx`.
- Patient cards and drawers: `src/components/PatientCard.tsx`, `src/components/PatientCard.css`, `src/components/PatientDetailPanel.tsx`, `src/components/PatientDetailPanel.css`, `src/components/ReassessmentDrawer.tsx`, `src/components/ReassessmentDrawer.css`.
- EMS and referral operations: `src/components/EMSPipeline.jsx`, `src/components/EMSPipeline.css`, `src/components/ReferralPanel.jsx`, `src/components/ReferralPanel.css`.
- Intake, analytics, settings: `src/pages/emergency/SmartIntake.jsx`, `src/pages/emergency/SmartIntake.css`, `src/pages/emergency/EmergencyAnalytics.jsx`, `src/pages/emergency/EmergencyAnalytics.css`, `src/pages/emergency/EmergencySettings.jsx`, `src/pages/emergency/EmergencySettings.css`.
- Existing responsive/token stack: `src/styles/design-tokens.css`, `src/styles/layout-breakpoints.css`, `src/styles/responsive-ux.css`, `src/styles/mobile-first-layout.css`, `src/styles/mobile-first-recovery.css`.
- New Emergency OS-specific utility layer: `src/styles/emergency-responsive.css`.

## Device Classes

- Phone small: 320, 375, 390, 414.
- Phone large / compact tablet: 640, 768.
- Tablet portrait/landscape: 768, 1024.
- Laptop/desktop: 1280, 1440, 1536.
- Ultrawide/command center: 1920, 2560, 3840.

## Primary Responsive Risks Found

- Active whiteboard used inline desktop-first grids and fixed card assumptions.
- Patient cards had fixed heights that could clip mission actions and badges on phones.
- Detail/Copilot/Reassessment drawers used viewport heights that did not consistently account for mobile visual viewport and bottom navigation.
- EMS/referral rows preserved dense desktop row layouts longer than practical on phones.
- Settings audit tables and long form sections needed card-like phone behavior.
- Header/sidebar were mostly responsive but needed tighter small-phone and safe-area handling.
