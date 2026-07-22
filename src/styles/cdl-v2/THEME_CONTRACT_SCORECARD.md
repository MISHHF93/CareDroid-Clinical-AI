# CDL v2 Theme Contract Scorecard

**Updated:** 2026-07-22  
**Authority:** `theme.css` + `theme-init.ts` + `compat.css` + `text-normalization.css`

## Scores (0–3)

| Element | Before | After (target) | Notes |
|---------|--------|----------------|-------|
| Theme binding (init ↔ toggle) | 0.5 | 3 | `theme-init` resolves preference |
| Page canvas light/dark | 1.5 | 3 | `--cdl-surface-page` both modes |
| Card + ink pair | 1 | 3 | `--cdl-card-bg/fg` both modes |
| Primary text | 1.5 | 3 | `--cdl-ink` |
| Muted text AA | 1 | 3 | light `#334155`, dark `#cbd5e1` |
| Severity tints | 1.5 | 3 | dark mixes into card, not white |
| Cross-namespace sync | 0.5 | 3 | medical/app/cd alias CDL |
| Overall | **~1.3** | **≥2.7** | |

## Required tokens (light + dark)

- `--cdl-surface-page`, `--cdl-surface-card`, `--cdl-ink`, `--cdl-ink-muted`
- `--cdl-border`, `--cdl-critical-text`, `--cdl-warning-text`, `--cdl-ok-text`
- `--cdl-card-bg`, `--cdl-card-fg`

## Verify

```bash
npx vitest run src/styles/cdl-v2/theme.contract.test.ts
# Toggle theme in UI; patients/whiteboard must flip cards+text together
```
