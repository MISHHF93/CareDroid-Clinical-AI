import { describe, expect, it } from 'vitest';
import { CHART_PALETTE, COLOR_CSS_VARS, COLOR_INLINE_STYLES } from './colorSchema.registry';
import { MEDICAL_THEME } from './medicalTheme.constants';

describe('colorSchema.registry', () => {
  it('exposes canonical CSS variable names for inline styles', () => {
    expect(COLOR_CSS_VARS.fgMuted).toBe('var(--app-fg-muted)');
    expect(COLOR_CSS_VARS.accent).toBe('var(--app-accent-interactive)');
    expect(COLOR_CSS_VARS.danger).toBe('var(--app-danger)');
  });

  it('aligns chart palette with medical theme constants', () => {
    expect(CHART_PALETTE.critical).toBe(MEDICAL_THEME.danger);
    expect(CHART_PALETTE.low).toBe(MEDICAL_THEME.success);
    expect(CHART_PALETTE.criticalBg).toBe(MEDICAL_THEME.criticalTint);
  });

  it('provides reusable inline style fragments', () => {
    expect(COLOR_INLINE_STYLES.textMuted).toEqual({ color: 'var(--app-fg-muted)' });
    expect(COLOR_INLINE_STYLES.textDanger).toEqual({ color: 'var(--app-danger)' });
    expect(COLOR_INLINE_STYLES.guidelineBadge.border).toContain('var(--medical-accent-border)');
  });
});
