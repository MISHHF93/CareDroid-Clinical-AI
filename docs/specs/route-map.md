> **SUPERSEDED** — Use [docs/generated/routes.md](../generated/routes.md). Regenerate: `npm run docs:generate`

# CareDroid Route Map

Canonical routing is owned by a single map in `src/config/routes.config.ts`:

- `CANONICAL_ROUTES` — stable path constants
- `CANONICAL_ROUTE_MAP` — route metadata (component, permissions, roles, nav, aliases, landing defaults)
- `CANONICAL_PILOT_VISIBLE_NAV_IDS` — pilot-customer sidebar allowlist
- `USER_PROFILE_ROUTE_DEFAULTS` — default landing path per hospital role/profile

Navigation is generated from `CANONICAL_ROUTE_MAP` in `src/config/unified-navigation.config.ts`. Per-role sidebar visibility and ordering come from `src/config/roleClusterNav.config.ts`. Route guards read the same map via `src/lib/navigation.ts` and `CareDroidRouteGuard`.

Core ED routes:

- `/emergency/reception`
- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/alerts`
- `/emergency/copilot`
- `/emergency/documentation`
- `/emergency/tools`
- `/emergency/pulse`
- `/emergency/shift`
- `/emergency/analytics`
- `/emergency/settings`
- `/emergency/help`

Legacy aliases redirect to canonical emergency routes. New product surfaces must add constants to `CANONICAL_ROUTES`, route entries to `src/app/router.tsx`, navigation metadata to `src/config/unified-navigation.config.ts`, and manual topics to `src/config/userManual.config.ts`.
