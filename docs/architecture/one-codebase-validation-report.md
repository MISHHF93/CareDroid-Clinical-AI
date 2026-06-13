# One Codebase Validation Report

## Active Product

The active user-facing product is CareDroid Emergency OS.

## Active Route Contract

The active route tree in `src/App.jsx` now uses:

- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/analytics`
- `/emergency/settings`

Legacy roots redirect to `/emergency/whiteboard`.

## One-System Checks

| Check | Result | Notes |
|---|---|---|
| One active app shell | Pass | `src/components/AppShell.tsx` is mounted by `src/App.jsx` |
| One active router | Pass | `BrowserRouter` and route tree are owned by `src/App.jsx` |
| One active sidebar | Pass | `src/components/Sidebar.tsx` is mounted by active shell |
| One active header | Pass | `src/components/Header.tsx` is mounted by active shell |
| One active whiteboard | Pass | `src/pages/emergency/index.tsx` is mounted |
| One active intake | Pass | `src/components/QuickIntake.tsx` is used by whiteboard |
| One active patient card | Pass | `src/components/PatientCard.tsx` is used by active whiteboard |
| One active detail panel | Pass | `src/components/PatientDetailPanel.tsx` is mounted by active shell |
| One active ED Copilot panel | Pass | `src/components/CopilotPanel.tsx` is mounted by active shell |
| One Emergency OS type model | Pass | `src/types/emergency.ts` powers new Emergency OS modules |
| Mobile code imported into active web | Pass | No active web imports of Android/Capacitor code found |
| Legacy platform pages mounted | Pass | Not mounted by active route tree |

## Backend Endpoint Convention

The desired backend convention is `/api/emergency/*`. Current backend still exposes many documented exceptions:

- `/api/auth/*`
- `/api/chat/*`
- `/api/settings/features`
- `/api/patients/*`
- `/api/fleet/*`
- `/api/audit/*`
- `/api/subscriptions/*`
- `/api/tenant/*`
- other platform-governance and clinical-tool endpoints

These are documented exceptions until backend controllers and frontend service wrappers are migrated.

## What Was Moved

No physical moves in this pass.

## What Was Merged

- Active route tree, sidebar targets, and command palette route destinations now align to Emergency OS.

## What Was Archived

- Review archive manifest created at `archive/_review/README.md`.

## What Was Removed

- Generic platform `/settings` page removed from active mount.
- Legacy product roots removed from active route surface via redirects.

## Manual Review

- Backend endpoint migration to `/api/emergency/*`.
- Provider reduction in `src/App.jsx`.
- Legacy route/navigation/config/test cleanup.
- Mobile archive decision.

## Commands Run

- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`
- `npm run test:run -- src/test/routePagesSmoke.test.jsx`
- `npm run backend:build`
- `npm ls --depth=0`
- `cd backend && npm ls --depth=0`
- Playwright route/console check across `/`, `/dashboard`, `/settings`, `/emergency`, `/emergency/whiteboard`, `/emergency/patients`, `/emergency/ems`, `/emergency/intake`, `/emergency/queues`, `/emergency/reassessment`, `/emergency/capacity`, `/emergency/boarding`, `/emergency/referrals`, `/emergency/copilot`, `/emergency/analytics`, and `/emergency/settings`
- Repository glob and ripgrep inventory

## Validation Result

Pass.

- Frontend typecheck: pass
- Frontend lint: pass
- Production build: pass
- Focused route smoke test: pass
- Backend build: pass
- Root dependency install check: pass
- Backend dependency install check: pass
- Browser route smoke: pass
- Browser console errors: 0
