# Mobile Performance Audit

Generated: 2026-06-06

## Core Web Vitals

- **LCP:** Keep the largest above-the-fold route content lazy, cacheable, and free of startup service blocking.
- **CLS:** Reserve loader, image, and shell dimensions so navigation and dashboard cards do not shift during hydration.
- **INP:** Defer non-critical startup tasks, heavy service imports, and dashboard recommendations until after first paint or idle time.

## Guardrails

- Keep route-level code splitting for dashboard, calculators, clinical catalog, Dexie, Firebase, and large visualization bundles.
- Keep images lazy-loaded with async decoding and explicit dimensions.
- Keep touch interactions responsive with mobile performance CSS helpers.
