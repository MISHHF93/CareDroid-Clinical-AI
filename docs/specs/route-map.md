# CareDroid Route Map

Canonical route constants live in `src/config/routes.config.ts`.

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
