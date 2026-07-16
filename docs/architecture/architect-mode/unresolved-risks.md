# Unresolved Risks — Architect Mode

**Updated:** 2026-07-15 Stage J

| ID | Risk | Severity | Status | Next |
|----|------|----------|--------|------|
| R1 | Dual Nest + Express HTTP surfaces | High | Mitigated (runtime-auth) not retired | Nest parity then decommission Express |
| R2 | Session engines look like multi-user realtime | Medium | Labeled in shellEngineCatalog | UI StateSourceNotice where claims durable |
| R3 | Live Postgres multi-tenant HTTP e2e | High (prod) | Unit + filter contract only | Docker CI |
| R4 | Experimental engines on by capability flags | Medium | **Mitigated** — prod OFF unless VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES | Keep flag documented |
| R5 | Competing CSS namespaces residual | Low | Medical Light bridge live | Gradual migration |
| R6 | Role extension beyond Reception incomplete | Medium | Reception golden path locked | Stage I triage first |
| R7 | Uncommitted large working tree | Process | User decision | Feature branch commit |
| R8 | Playwright full suite not re-run this wave | Medium | Targeted unit green | Pre-release e2e |
| R9 | JWT permissions length in token | Low | Explicit permissions array | Monitor token size |
| R10 | it_admin previously missing from grants | Fixed | Contract tests | Keep regression |
