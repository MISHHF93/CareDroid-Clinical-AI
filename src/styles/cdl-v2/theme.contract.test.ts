import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themeCss = readFileSync(join(__dirname, 'theme.css'), 'utf8');
const indexCss = readFileSync(join(__dirname, 'index.css'), 'utf8');
const compatCss = readFileSync(join(__dirname, 'compat.css'), 'utf8');
const themeInit = readFileSync(join(__dirname, '../../theme-init.ts'), 'utf8');
const textNorm = readFileSync(join(__dirname, '../text-normalization.css'), 'utf8');

const REQUIRED = [
  '--cdl-surface-page',
  '--cdl-surface-card',
  '--cdl-ink',
  '--cdl-ink-muted',
  '--cdl-border',
  '--cdl-critical-text',
  '--cdl-warning-text',
  '--cdl-ok-text',
  '--cdl-card-bg',
  '--cdl-card-fg',
];

describe('CDL v2 theme contract', () => {
  it('loads theme.css in the cdl-v2 entry', () => {
    expect(indexCss).toContain("theme.css");
  });

  it('defines dual-mode selectors', () => {
    expect(themeCss).toContain("html[data-theme='light']");
    expect(themeCss).toContain("html[data-theme='dark']");
    expect(themeCss).toContain('color-scheme: dark');
  });

  it('defines required tokens in both light and dark blocks', () => {
    const lightIdx = themeCss.indexOf("html[data-theme='light']");
    const darkIdx = themeCss.indexOf("html[data-theme='dark']");
    expect(lightIdx).toBeGreaterThan(-1);
    expect(darkIdx).toBeGreaterThan(lightIdx);
    const lightBlock = themeCss.slice(lightIdx, darkIdx);
    const darkBlock = themeCss.slice(darkIdx);
    for (const token of REQUIRED) {
      expect(lightBlock).toContain(token);
      expect(darkBlock).toContain(token);
    }
  });

  it('uses AA-safe muted ink (not pale greys) in light and dark', () => {
    expect(themeCss).toContain('--cdl-ink-muted: #334155');
    expect(themeCss).toContain('--cdl-ink-muted: #cbd5e1');
    expect(themeCss).not.toMatch(/--cdl-ink-muted:\s*#9ca3af/);
    expect(themeCss).not.toMatch(/--cdl-ink-muted:\s*#94a3b8/);
  });

  it('theme-init resolves storage preference (not hard light only)', () => {
    expect(themeInit).toContain('caredroid-theme-preference');
    expect(themeInit).toContain('system');
    expect(themeInit).toContain('matchMedia');
    expect(themeInit).not.toMatch(/const STANDARD_THEME = 'light';\s*\n\s*document\.documentElement\.dataset\.theme = STANDARD_THEME/);
  });

  it('compat aliases medical/app text to CDL ink', () => {
    expect(compatCss).toContain('--medical-text-body: var(--cdl-ink)');
    expect(compatCss).toContain('--medical-text-muted: var(--cdl-ink-muted)');
    expect(compatCss).toContain('--app-text-primary: var(--cdl-ink)');
    expect(compatCss).toContain('--app-text-muted: var(--cdl-ink-muted)');
  });

  it('text-normalization applies to light and dark', () => {
    expect(textNorm).toContain("html[data-theme='dark']");
    expect(textNorm).toContain('--cdl-ink');
    expect(textNorm).toContain('--cdl-ink-muted');
  });
});
