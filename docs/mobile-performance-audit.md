# Mobile Performance Audit

## Scope

This audit tracks the mobile performance contracts used by the responsive and compact UX regression suite.

## Core Web Vitals

- LCP: Route-level lazy loading keeps large dashboard, calculator, catalog, chart, and fleet bundles out of the initial app chunk.
- CLS: Loaders reserve viewport height, images declare dimensions where available, and compact surfaces avoid late layout jumps from oversized cards.
- INP: Startup work is deferred after first paint, touch targets remain explicit, and interactive controls use lightweight CSS transitions.

## Current Safeguards

- Heavy services are loaded through deferred startup tasks instead of synchronous app boot imports.
- Mobile CSS uses `content-visibility`, reserved loader height, and `touch-action: manipulation`.
- Responsive QA covers phone, tablet, desktop, and wide desktop viewport tiers.

## Follow-Up Risks

- Large calculator and chart chunks should continue to be monitored as new tools are added.
- Manual device testing is still useful for keyboard behavior, map canvas panning, and bottom navigation overlap.
