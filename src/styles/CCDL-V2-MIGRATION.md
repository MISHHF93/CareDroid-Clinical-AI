# CCDL v2 Migration Notes

**Started:** 2026-07-22  
**Repo:** primary clone `C:\Users\borah\CareDroid-Clinical-AI`  
**Direction:** Clinical depth (subtle elevation, high-DPI icons, unified alarms)

## What landed (foundation)

| Path                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `src/styles/cdl-v2/`             | New single source of truth tokens                                          |
| `src/styles/cdl-v2/index.css`    | Loaded first from `main.tsx`                                               |
| `src/styles/cdl-v2/compat.css`   | Aliases legacy `--cd-*` / `--app-*` / `--medical-*` / `--alarm-*`          |
| `src/alarm/`                     | Unified `AlarmKpi`, `AlarmBanner`, `AlarmRail`, `AlarmDock` + severity map |
| `CriticalAlertBanner`            | Migrated to `data-severity` + CDL classes                                  |
| `components/primitives/Icon.tsx` | CSS token colors (no inline hex)                                           |

## CDL 2.1 visual authority (2026-08-27)

- `cdl-v2/refresh.css` makes the shared shell and primitives visibly resolve to the
  CDL contract after the legacy application graph loads.
- Persistent structure now uses a deep-navy sidebar, clinical-teal interaction,
  a 60px utility bar, and a 72px route identity band.
- Authentication is a responsive product entry experience instead of an isolated
  generic form card.
- `cdl-v2/DESIGN-LANGUAGE.md` is the current product grammar and migration boundary.

## Rules for new work

1. **No new CSS outside `cdl-v2/`** unless a temporary route-local exception is documented.
2. Severity only via `resolveAlarmSeverity` / `data-severity`.
3. Icons: lucide + `cdl-icon` utilities; stroke ~1.85.
4. Elevation: levels 0–4 only (`--cdl-elev-*`).
5. Prefer `AlarmBanner` / `AlarmRail` / `AlarmDock` over one-off alert CSS.

## Remaining waves

- **B:** Wire all rails (Operational / Whiteboard / reception) to `src/alarm/*`
- **C:** Finish lucide-only registry; remove Tabler dual path
- **D1–D5:** Route surface migration (shell → flow → EMS/ops → clinical → platform)
- **E:** Interactive AI / copilot visual parity
- **F:** Delete obsolete `src/styles/*` override layers after zero consumers

## Verify

```bash
npx vitest run src/alarm/alarmSystem.test.ts
# App: cdl-v2 loads before design-system.css (see main.tsx)
```
