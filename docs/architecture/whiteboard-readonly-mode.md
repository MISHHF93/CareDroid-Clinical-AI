# Whiteboard Read-Only Mode

## Purpose

Large-monitor, nurse-station, and operations wall displays that show department status without sensitive editing actions.

## Screen Modes

Defined in `src/central-node/careDroidCentralNode.ts`:

| Mode | `readOnly` | `publicDisplay` | PHI redaction |
| --- | --- | --- | --- |
| `READ_ONLY_DISPLAY` | true | true | Yes — names, flags, alert messages |
| `WAITING_ROOM_DISPLAY` | true | true | Yes — queue health only |
| `COMMAND_CENTER_DISPLAY` | false | false | No |

## Activation

1. **Settings** — `EmergencySettings.jsx`:
   - `defaultScreenMode` → `READ_ONLY_DISPLAY`
   - `readOnlyDisplayMode` checkbox → forces read-only
   - `wallDisplayRefreshInterval` → auto-refresh interval (seconds)

2. **Role** — `read_only_viewer` role sets `roleContext.readOnly: true`

3. **Query param** — `/emergency/whiteboard?display=readonly` for kiosk URLs (transient, does not persist settings)

Resolution order (`resolveCareDroidScreenMode`):

```
?display=readonly → READ_ONLY_DISPLAY
readOnlyDisplayMode || role.readOnly → READ_ONLY_DISPLAY
defaultScreenMode → configured mode
role-based override from route (useRouteScreenMode)
```

## Whiteboard Behavior When Read-Only

Implemented in `src/pages/emergency/index.tsx`:

### Hidden

- `QuickIntake` modal and "+ Central Intake" button
- Mission-control mutating actions (create patient, EMS convert, queue move)
- Patient card transition buttons (`Next`, `Reassess`, `Refer`, `Board`, `Discharge`)
- EMS "Prepare Bay" / "Add to Board" actions

### Visible

- Patient grid (with redacted names when `publicDisplay`)
- Queue intelligence panel
- Capacity / command metrics (via `useOperationalIntelligence`)
- Alerts (redacted severity messages)
- EMS inbound cards (status only, no convert)
- Auto-refresh at `wallDisplayRefreshInterval`

### PHI Redaction

`redactCentralNodeSnapshotForScreenMode` in `careDroidCentralNode.ts`:

- Patient names → "Patient ###"
- Clinical flags → hidden
- Alert messages → generic operational text

## Auto-Refresh

When `effectiveScreenMode` is `READ_ONLY_DISPLAY` or `WAITING_ROOM_DISPLAY`:

- Poll `initializeFromBackend()` at `emergencySettings.wallDisplayRefreshInterval` (default from store)
- Minimum interval: 15 seconds

## Settings Reference

| Setting | Store path | Default |
| --- | --- | --- |
| `defaultScreenMode` | `emergencySettings.defaultScreenMode` | `CHARGE_NURSE_SCREEN` |
| `readOnlyDisplayMode` | `emergencySettings.readOnlyDisplayMode` | `false` |
| `wallDisplayRefreshInterval` | `emergencySettings.wallDisplayRefreshInterval` | store default |

## Distinction from Registration Clerk on Whiteboard

| Concern | Read-only display | Registration clerk |
| --- | --- | --- |
| Intent | Wall monitor | Staff awareness |
| Patient create | Hidden | Hidden (redirect to Reception) |
| Patient transitions | Hidden | Hidden |
| PHI | Redacted | Full (role has READ_PHI) |
| Navigation | Minimal / kiosk | Full sidebar |

## Validation Checklist

- [ ] `?display=readonly` hides all mutating controls
- [ ] Patient names redacted in header metrics
- [ ] Auto-refresh runs without user interaction
- [ ] `read_only_viewer` role cannot open intake or transition patients
- [ ] Settings toggle persists across reload

## Related

- `src/hooks/useRouteScreenMode.ts` — route + query resolution
- `src/pages/emergency/EmergencySettings.jsx` — admin configuration
