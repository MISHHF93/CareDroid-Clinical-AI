# Disconnected Code After Emergency OS Refactor

Date: 2026-06-13

## Active Product Boundary

The active Emergency OS product now exposes only the 12 target routes under `src/components/AppShell.tsx`. Code listed here remains in the repository because deleting it would be higher risk than documenting it for follow-up review.

## Retired Route Surfaces

These route concepts are no longer active pages:

- Pulse / department pulse
- Patient Journey as a standalone route
- Provincial Health
- Integration Hub
- Real-Time Simulation
- Emergency Tools / Clinical Calculator Hub as a standalone route
- Shift / Shift Summary
- Command Center alias

Their route constants and redirect aliases are preserved in `src/config/routes.config.js` so legacy URLs can resolve safely. Active navigation, command palette route entries, search discovery, render inventory, and role-visible navigation no longer expose them as primary destinations.

## Legacy Shell And Workspace Code

- `src/layout/AppShell.jsx` and related legacy layout tests still exist and should be reviewed before deletion. The active shell is `src/components/AppShell.tsx`.
- Workspace-era tests and docs still reference `/workspace/emergency/command-center` and `/workspace/emergency/simulations`; these are legacy/general-platform references and were not broadly rewritten in this pass.
- Existing docs such as older traceability and capability reports still mention prior route decisions. The new reports in this folder supersede those route statements for the active product.

## API And Client Drift

The following are documented for manual review rather than deep persistence refactor:

- Optional Express/Mongoose surfaces and snake_case payload shapes.
- Advanced Emergency OS simulation endpoints and clients.
- Provincial health and integration hub placeholder endpoints.
- Shift report export metadata.
- Duplicate calculator/tool launch surfaces that remain as components or feature records but are not active routes.

## Feature Registry Drift

`lib/features/featureRegistry.ts` still contains feature records for retired concepts such as `department_pulse`, `clinical_calculator_hub`, and `shift_summary`. Their `sidebarRoute` values now resolve to `/emergency/whiteboard` so they do not advertise retired pages. Keeping the records preserves settings/flag compatibility while the product owner decides whether to deprecate or migrate them.
