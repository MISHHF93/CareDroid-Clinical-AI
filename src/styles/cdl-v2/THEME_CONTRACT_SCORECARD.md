# CDL v2 Theme Contract Scorecard

**Updated:** 2026-07-22 (whole-app visual re-score)  
**Authority:** `theme.css` + `theme-init.ts` + `compat.css` + `text-normalization.css` + `shell-readability.css`

## Whole-app visual construct (0–10)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Theme system coherence | 7.5 | Dual-mode CDL + init; legacy cascade still present |
| Light readability | 7.5 | Shell greys → CDL ink-muted |
| Dark readability | 7.0 | CDL dark tokens; shell re-asserted after cascade |
| Card architecture | 7.0 | Single shell patients path |
| Page composition | 6.5 | Patients flattened; other routes next |
| Alarm/severity | 7.0 | Unified primitives on key surfaces |
| Cross-page consistency | 5.5 | Wave V3 routes still open |
| **Overall** | **~7.1 / 10** | Was ~6.4; target ≥8.5 |

## Contract scores (0–3)

| Element | Before | Now | Notes |
|---------|--------|-----|-------|
| Theme binding (init ↔ toggle) | 0.5 | 3 | preference light/dark/system |
| Page canvas light/dark | 1.5 | 3 | `--cdl-surface-page` |
| Card + ink pair | 1 | 3 | `--cdl-card-bg/fg` |
| Primary text | 1.5 | 3 | `--cdl-ink` |
| Muted text AA | 1 | 3 | light `#334155`, dark `#cbd5e1` |
| Shell header/sidebar | 1 | 2.5 | shell-readability + hex purge |
| Severity tints | 1.5 | 3 | dark mixes into card |
| Cross-namespace sync | 0.5 | 3 | medical/app/cd → cdl |
| Overall contract | **~1.3** | **~2.9** | |

## Required tokens (light + dark)

- `--cdl-surface-page`, `--cdl-surface-card`, `--cdl-ink`, `--cdl-ink-muted`
- `--cdl-border`, `--cdl-critical-text`, `--cdl-warning-text`, `--cdl-ok-text`
- `--cdl-card-bg`, `--cdl-card-fg`

## Verify

```bash
npx vitest run src/styles/cdl-v2/theme.contract.test.ts
# Toggle theme in UI; patients/whiteboard must flip cards+text together
```
