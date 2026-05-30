# Route Health Report

Generated: 2026-05-30T02:04:33.280Z

## Summary

The route graph is now normalized through `src/routing/routeHealth.js`, which audits direct `App.jsx` routes, generated calculator routes, tool inventory routes, workspace routes, public auth aliases, legacy redirects, smoke-route references, and scanned page files.

| Metric | Result |
| --- | ---: |
| Total route entries audited | 367 |
| Active routes | 260 |
| Alias routes | 26 |
| Deprecated routes | 11 |
| Hidden routes | 70 |
| Orphaned pages | 0 |
| Blank routes | 0 |
| Unreachable route references | 0 |
| Duplicate route ownership conflicts | 0 |

## Health States

| State | Meaning |
| --- | --- |
| `active` | Canonical user-facing route with a real owner page, generated tool page, calculator route, workspace page, or public content page. |
| `alias` | Supported alternate path that resolves into a canonical route, preserving deep links and auth intent where applicable. |
| `deprecated` | Legacy route retained only as a compatibility redirect to a canonical destination. |
| `hidden` | Route that is permission-gated, admin/developer oriented, fallback-only, wildcard-only, or otherwise not part of primary user navigation. |
| `orphaned` | Page file or route reference with no normalized route owner. Current count is zero. |

## Source Coverage

The audit combines these route owners and reference surfaces:

- `src/App.jsx` direct `<Route>` registrations and redirect routes.
- `AUTH_PATH_ALIASES`, assistant aliases, tools aliases, calculator aliases, map aliases, and fleet aliases.
- `CALCULATOR_ROUTE_DEFS`, including all generated calculator detail routes.
- `REGISTRY_TOOL_PATHS` and frontend-visible tool inventory routes.
- Primary and advanced sidebar navigation.
- Platform dashboards and workspace route entries.
- Responsive smoke-route fixtures.
- `src/pages/**/*.jsx` route page scan, excluding test files and internal support components.

## Normalized Route Classes

| Class | Representative paths | Health |
| --- | --- | --- |
| Command center | `/dashboard` | `active` |
| AI launcher | `/assistant` | `active` |
| AI aliases | `/ai`, `/copilot` | `alias` |
| Legacy command paths | `/home`, `/chat`, `/catalog`, `/fleet` | `deprecated` |
| Tool library | `/tools`, `/tools/catalog`, `/tools/calculators`, `/tools/:product` and generated registry tool paths | mixed `active` / `hidden` |
| Calculator detail routes | `/tools/calculators/:slug` and generated Tier-A/Tier-B calculator paths | `active` |
| Specialty tool routes | `/tools/cardiology/:toolId`, `/tools/neurology/:toolId`, `/tools/pulmonology/:toolId`, and generated specialty tool inventory paths | `active` |
| Workspace routes | `/workspaces`, `/workspace/:workspaceId`, `/workspace` | `active` / `alias` |
| Platform OS routes | `/search`, `/timeline`, `/digital-twin`, `/workflows`, `/assets`, `/notifications` | `active` |
| Governance and audit routes | `/governance/*`, `/audit/*`, `/review/*`, `/operations/observability` | `hidden` |
| Patient platform routes | `/patients`, `/patients/:patientId/*` | mixed `active` / `hidden` |
| Fleet operations | `/fleet/map`, `/fleet/command`, `/fleet/route-optimizer`, `/fleet/predictive-maintenance` | `active` |
| Fleet legacy aliases | `/fleet/live-map`, `/fleet/tracking` | `deprecated` |
| Public/legal routes | `/`, `/auth`, `/auth-callback`, `/help`, `/terms`, `/legal/privacy`, `/gdpr`, `/hipaa`, `/version` | `active` |
| Fallbacks | `*`, `/tools/*`, `/fleet/*` | `hidden` |

## Validation Gates

All automated gates are enforced by `src/routing/routeHealth.test.js`:

- No blank routes: pass.
- No unreachable route references: pass.
- No duplicate route ownership conflicts: pass.
- No orphan pages: pass.

## Operational Notes

- Route ownership is de-duplicated by canonical path before validation, so generated tool routes and explicit `App.jsx` registrations can share the same route without becoming duplicate owners.
- Deprecated routes remain registered as redirects so old links do not break, but they no longer own UI surfaces.
- Hidden routes are valid route graph members, not failures. They are classified separately because they are permission-gated, admin/developer surfaces, wildcard fallbacks, or operational backplanes.
- Orphan page detection scans page files and excludes test files plus internal support modules used by routed pages.
