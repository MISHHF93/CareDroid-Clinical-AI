# User Profile Tool Segmentation Production Validation Report

Date: 2026-05-29

## Executive Status

Status: Passed after two validation fixes.

The profile-to-tool graph now improves navigation while preserving broad discovery through the `All` filter, keeping calculators discoverable, protecting admin and operations tools from normal clinical users, and giving hidden tools a clear restore path.

Fixes made during validation:

- Boosted explicit profile assistant seed tools in `scoreToolForProfile`, so emergency profiles reliably surface `heart-score`, `nihss`, `qsofa`, and `perc` in top recommendations.
- Updated `ProfileToolPreferences` so hidden tools are listed first and can be restored even after they are removed from default tool views.
- Updated `/tools` empty-state copy so restricted and hidden states explain why tools are unavailable instead of looking like missing inventory.
- Added mobile CSS coverage for the dashboard Profile Tool Graph Card so columns stack on compact screens.

## Validation Results

1. Every user-facing tool has segmentation metadata: Passed. Covered by `profileToolSegmentation.test.js`, which verifies role, specialty, workspace, permission, risk, visibility, backend, and human-review metadata across the user-facing projection.
2. Default profile shows a safe useful baseline: Passed. The medical-student baseline exposes calculators, lab interpretation, protocols, and broad clinical reference tools while excluding governance, security, and audit surfaces.
3. Emergency Physician profile surfaces emergency tools: Passed. Emergency seed tools are boosted and covered by tests for `heart-score`, `nihss`, `qsofa`, and `perc`.
4. Cardiologist profile surfaces cardiology tools: Passed. Tests verify `has-bled` and `grace-acs` recommendations for cardiology.
5. Nurse profile surfaces bedside workflow tools: Passed. Tests verify bedside workflow visibility such as Braden, Morse/fall, lab, and workflow-style tools without admin surfaces.
6. Fleet Operator profile surfaces fleet/operations tools: Passed. Tests verify fleet visibility and nurse exclusion from `fleet-command`.
7. Biomedical Engineer profile surfaces IoT/device/system health tools: Passed. Tests verify IoT, device, telemetry, and system-health style visibility.
8. Administrator profile surfaces governance/security/audit tools: Passed. Tests verify admin visibility for governance, security, and audit tools.
9. Normal clinical users do not see restricted admin tools by default: Passed. Nurse and normal clinical graphs exclude restricted governance/security/audit tools.
10. Admin users can access restricted tools: Passed. Admin graphs include protected governance/security/audit tools.
11. Hidden tools can be restored: Passed after fix. `ProfileToolPreferences` now includes hidden rows before visible rows and tests verify `Show tool` calls `toggleHidden`.
12. Pinned tools persist: Passed. `ToolPreferencesContext` coverage verifies stored pinned, hidden, and profile settings; additional coverage verifies hidden toggle restore behavior.
13. `All` view still allows broad discovery when permitted: Passed. `/tools` tests switch from `Recommended for Me` to `All` and verify all visible allowed tools render without duplicates.
14. `/tools` never looks empty unless truly no tools match: Passed after fix. Empty workspaces keep the workspace message; hidden/restricted filter states now show explanatory copy.
15. AI assistant suggestions match selected profile: Passed. AI suggestion tests verify profile-context suggestions for cardiology; segmentation tests verify emergency, cardiology, and fleet assistant recommendations.
16. Dashboard Profile Tool Graph Card counts match `/tools` filters: Passed. Graph count tests verify `all`, `recommended`, `pinned`, `recent`, and `specialty` buckets match `filterToolsForProfileGraph`.
17. Mobile layout for profile graph and filters: Passed. Dashboard mobile tests verify Profile Tool Graph columns stack; ToolsOverview responsive tests verify profile filter tabs and summary wrap with touch-friendly controls.
18. No duplicate tools appear after segmentation: Passed. `/tools` tests and graph tests verify rendered and filtered IDs remain unique.
19. No canonical routes are broken by profile filtering: Passed. Route tests verify `/profile/tool-preferences`, `/tools`, `/tools/calculators/:slug`, and clinical tool routes remain registered.
20. Fallback message explains restricted or hidden tools: Passed after fix. `/tools` tests verify restricted-profile and hidden-preference explanations.

## Test Evidence

Passed commands:

```bash
npm run test:run -- src/data/profileToolSegmentation.test.js src/contexts/ToolPreferencesContext.test.jsx src/pages/profile/ProfileToolPreferences.test.jsx src/pages/tools/ToolsOverview.inventory.test.jsx src/pages/tools/ToolsOverview.responsive.test.js src/pages/Dashboard.chatLayout.test.jsx src/pages/Dashboard.mobile.test.jsx src/utils/chatCapabilitySuggestions.test.js src/routing/canonicalRouteRedirects.test.js
```

Result: 9 files passed, 75 tests passed.

```bash
npm run test:run -- src/pages/tools/Calculators.route.test.jsx src/routes/clinicalToolRoutes.test.js src/routes/clinicalToolRoutes.production.test.js src/routing/canonicalRouteRedirects.test.js
```

Result: 4 files passed, 264 tests passed.

```bash
npm run test:run -- src/pages/tools/ToolsOverview.responsive.test.js src/pages/Dashboard.mobile.test.jsx src/test/responsiveRegression.coverage.test.js src/styles/responsiveUx.test.js src/components/Sidebar.responsive.test.js src/pages/tools/Calculators.responsive.test.js src/pages/tools/ClinicalToolCatalog.responsive.test.js src/pages/tools/ToolPages.responsive.test.js
```

Result: 8 files passed, 99 tests passed.

```bash
npm run test:responsive-regression
```

Result: 11 files passed, 461 tests passed.

```bash
npm run lint
```

Result: Passed with 0 errors. Existing repository warnings remain outside the validation changes.

```bash
npm run build
```

Result: Passed. Asset validation passed and Vite production build completed.

## Production Readiness Notes

The segmentation model is safe for production validation because restricted tools are filtered by role and permissions, admin profiles can still reach protected surfaces, and normal users can always use `All` for permitted broad discovery.

The main UX risk found was hidden-tool recovery. That has been fixed by making hidden tools visible in `/profile/tool-preferences` even though they remain hidden from default `/tools` views.

The second UX risk was empty-state ambiguity. That has been fixed with explicit hidden and restricted explanations in `/tools`, so users are not left thinking critical tools disappeared.
