# Backend Exposure Report

Status: source-aligned harness summary

This report should be regenerated from backend route and frontend API exposure inventories when package tooling is available:

```bash
npm run exposure:write-docs
```

## Source Inventories

- Backend routes: `src/data/backendHttpRouteInventory.js`
- Frontend API calls: `src/data/frontendApiCallsInventory.js`
- Capability flags: `src/config/backendApiCapabilities.js`
- Exposure policy: `src/data/backendRouteExposurePolicy.js`
- Capability exposure matrix: `src/data/capabilityExposureMatrix.js`

## Exposure Rules

- User-facing frontend calls must match a backend route or a disabled capability gate.
- Backend routes intended for users must be listed in the frontend API inventory before UI entry points are added.
- Backend routes not ready for users should be documented as internal, deferred, unsupported, or capability-gated.
- Clinical intelligence routes must carry permission preflight in `App.jsx` and `toolInventory.js`.
- Missing routes must produce disabled UI, local fallback, or clear unsupported messaging, never blank screens.

## Known Exposure Classes

| Class | Examples | Harness rule |
|---|---|---|
| Fully exposed user routes | Auth, profile, subscriptions, chat, clinical intelligence, audit, notifications, tools list/execute/results | Keep frontend calls, backend routes, permissions, and tests aligned. |
| Frontend-only/gated | Team management actions, exports, report scheduling, chat persistence, notification stream/send-channel, clinical alerts API calls | Do not expose as available server features while capability flags are false. |
| Internal/deferred backend routes | OAuth/SAML/OIDC callbacks, metrics, webhook, AI internals, admin CRUD surfaces | Keep out of normal user launch paths unless productized. |
| Platform trust/audit rows | Source scan, executor catalog, backend exposure and render/execute matrices | May appear in trust/source catalog, not normal workflow discovery. |

## Current Priority

The next exposure hardening step is to keep user-facing routes, Assistant recommendations, `/tools` cards, and workspace cards tied to the canonical inventory and launch resolver. Hidden backend capability promotion must follow this order:

1. Add backend route inventory.
2. Add frontend API inventory.
3. Add capability flag and exposure policy.
4. Add inventory route/launch/safety metadata.
5. Add UI fallback states.
6. Add route, launch, backend exposure, and responsive tests.
