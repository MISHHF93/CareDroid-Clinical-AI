# UX Debt Report

Generated from `src/data/uxDebtEliminationEngine.js`.

Current UX health score: **88/100 (watch)**.

## Scope

The UX Debt Elimination Engine audits these surfaces:

- Navigation
- Routes
- Cards
- Forms
- Dialogs
- Drawers
- Tables
- Maps
- Calculators
- Dashboards

## Root Finding

The app now has a stronger canonical shell after the bottom navigation mismatch fix: authenticated navigation is owned by the sidebar/drawer, main content has one scroll contract, and compact layouts no longer reserve phantom bottom tab space.

Remaining UX debt is mostly discoverability and coverage debt rather than active layout conflict. The largest issues are high-volume shared hubs, responsive smoke coverage gaps for some canonical routes, and legacy alias volume that needs owner/removal criteria.

## Classification Summary

- Duplicate UX: no critical duplicate primary navigation detected.
- Conflicting UX: no sidebar plus bottom-tab conflict detected in the current app shell.
- Hidden UX: calculator and route surfaces still need stronger deep-linking and responsive coverage visibility.
- Obsolete UX: legacy route aliases remain for compatibility and should stay documented.
- Accessibility issue: current sidebar drawer and generic drawer retain expected modal/focus semantics.

## Current Findings

### High-volume calculator hub can hide individual tools

- Classification: hidden UX
- Surface: calculators
- Severity: medium
- Evidence: many calculator records share `/tools/calculators` as a visible launch surface.
- Recommendation: keep the calculator hub, but preserve individual deep links, clear grouping, anchorable search results, and visible launch context so tools do not feel buried.

### Some canonical routes are outside responsive smoke coverage

- Classification: hidden UX
- Surface: routes
- Severity: medium
- Evidence: canonical routes are compared against `RESPONSIVE_QA_PAGES`; any missing route can drift without viewport checks.
- Recommendation: add responsive smoke coverage for high-traffic routes first, then explicitly allowlist internal/admin-only routes.

### Legacy route alias volume needs ownership

- Classification: obsolete UX
- Surface: routes
- Severity: low
- Evidence: route aliases preserve compatibility but can obscure which route is canonical.
- Recommendation: keep redirects, but document owner, canonical target, and removal criteria for each alias group.

## Eliminated In This Pass

### Sidebar and bottom tab duplication

- Classification: conflicting UX
- Surface: navigation
- Status: eliminated
- Evidence: `AppShell` no longer renders `app-shell-bottom-nav`, `AppShell.css` no longer reserves bottom-nav height, and Quick Command no longer offsets above a removed bottom tab bar.
- Guardrail: `src/layout/AppShell.navigation.test.jsx`, `src/layout/AppShell.layout.test.js`, `src/test/mobileScrolling.contract.test.js`, and `src/styles/compactUxFlattening.test.js`.

## Automated Checks

The engine and tests now check:

- No AppShell bottom navigation when Sidebar/drawer exists.
- No obsolete bottom-nav spacing tokens in authenticated shell CSS.
- Canonical route paths are unique.
- Navigation labels do not point to conflicting destinations.
- High-volume hub routes are flagged as hidden UX.
- Compact drawer and generic Drawer retain accessibility semantics.
- Canonical routes are compared against responsive smoke coverage.
- Markdown report generation includes health score, classifications, findings, and acceptance rule.

## Acceptance Rule

No page should feel like it belongs to a different application. The engine enforces that rule by keeping navigation single-source, route paths canonical, responsive coverage visible, drawers/dialogs accessible, and high-volume hubs explicitly reviewed.

