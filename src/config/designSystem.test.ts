import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DESIGN_DENSITY_PRESETS,
  DESIGN_SYSTEM_CSS_ENTRY,
  SEMANTIC_COLOR_ROLES,
  THEME_CONFIG,
} from './designSystem';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designSystemCss = readFileSync(
  join(__dirname, '../styles/design-system.css'),
  'utf8',
);
const bridgeCss = readFileSync(
  join(__dirname, '../styles/design-system-bridge.css'),
  'utf8',
);

describe('designSystem barrel', () => {
  it('exposes a single CSS entry and consolidated token sources', () => {
    expect(DESIGN_SYSTEM_CSS_ENTRY).toBe('src/styles/design-system.css');
    expect(THEME_CONFIG.cssEntry).toBe(DESIGN_SYSTEM_CSS_ENTRY);
    expect(THEME_CONFIG.cssTokenSources).toContain('src/styles/primitives.css');
    expect(THEME_CONFIG.cssTokenSources).toContain('src/styles/design-system-bridge.css');
  });

  it('maps semantic color roles to CSS custom properties', () => {
    expect(SEMANTIC_COLOR_ROLES.critical.bg).toBe('var(--semantic-critical-bg)');
    expect(SEMANTIC_COLOR_ROLES.information.border).toBe('var(--semantic-information-border)');
  });

  it('defines role-focused density presets', () => {
    expect(DESIGN_DENSITY_PRESETS.compact.pageClass).toBe('density-compact');
    expect(DESIGN_DENSITY_PRESETS.standard.gap).toContain('--density-standard-gap');
  });

  it('loads bridge and primitives in design-system.css before normalization', () => {
    expect(designSystemCss).toContain("@import './primitives.css';");
    expect(designSystemCss).toContain("@import './design-system-bridge.css';");
    expect(bridgeCss).toContain('--cd-bg-base: var(--app-bg');
    expect(bridgeCss).toContain('--density-compact-gap');
  });
});