/**
 * Design token system contracts — semantic spacing, typography, breakpoints, touch.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  DESIGN_BREAKPOINTS,
  DESIGN_BREAKPOINTS_PX,
  DESIGN_TOUCH_TARGETS,
  DESIGN_MEDIA_QUERIES,
} from '../layout/designTokens.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
const mainJsx = readFileSync(join(__dirname, '../main.jsx'), 'utf8');
const indexCss = readFileSync(join(__dirname, '../index.css'), 'utf8');
const responsiveUxCss = readFileSync(join(__dirname, 'responsive-ux.css'), 'utf8');
const calculatorsCss = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');

describe('design-tokens.css — semantic token layer', () => {
  it('is loaded from main.jsx after index.css', () => {
    const indexPos = mainJsx.indexOf("import './index.css'");
    const tokensPos = mainJsx.indexOf("import './styles/design-tokens.css'");
    expect(tokensPos).toBeGreaterThan(-1);
    expect(indexPos).toBeGreaterThan(-1);
    expect(tokensPos).toBeGreaterThan(indexPos);
  });

  it('defines spacing scale xs through xl', () => {
    expect(designTokensCss).toContain('--space-xs: var(--space-2)');
    expect(designTokensCss).toContain('--space-sm: var(--space-3)');
    expect(designTokensCss).toContain('--space-md: var(--space-4)');
    expect(designTokensCss).toContain('--space-lg: var(--space-6)');
    expect(designTokensCss).toContain('--space-xl: var(--space-8)');
  });

  it('defines typography heading, body, caption', () => {
    expect(designTokensCss).toContain('--text-heading: var(--text-heading-fluid)');
    expect(designTokensCss).toContain('--text-body: var(--text-body-fluid)');
    expect(designTokensCss).toContain('--text-caption: var(--text-caption-fluid)');
    expect(indexCss).toContain('--text-caption-fluid:');
  });

  it('defines breakpoint tiers mobile, tablet, desktop, wide', () => {
    expect(designTokensCss).toContain('--bp-tier-tablet: 768px');
    expect(designTokensCss).toContain('--bp-tier-desktop: 1280px');
    expect(designTokensCss).toContain('--bp-tier-wide: 1920px');
    expect(designTokensCss).toContain('--bp-phone-xl: 412px');
  });

  it('defines WCAG-aligned touch targets 44px and 48px', () => {
    expect(designTokensCss).toContain('--touch-target-min: 44px');
    expect(designTokensCss).toContain('--touch-target-comfortable: 48px');
    expect(designTokensCss).toContain('--app-min-touch-target: var(--touch-target-min)');
    expect(designTokensCss).toMatch(/\.touch-target[\s\S]*min-height:\s*var\(--touch-target-min\)/);
  });

  it('does not duplicate type tokens in responsive-ux :root', () => {
    expect(responsiveUxCss).not.toMatch(/^:root\s*\{[\s\S]*--app-type-title:/m);
  });
});

describe('designTokens.js — JS mirror', () => {
  it('maps semantic breakpoint tiers', () => {
    expect(DESIGN_BREAKPOINTS.mobile.max).toBe(767);
    expect(DESIGN_BREAKPOINTS.tablet.min).toBe(768);
    expect(DESIGN_BREAKPOINTS.desktop.min).toBe(1280);
    expect(DESIGN_BREAKPOINTS.wide.min).toBe(1920);
    expect(DESIGN_BREAKPOINTS_PX.splitFormMin).toBe(1024);
  });

  it('exposes touch target px for accessibility checks', () => {
    expect(DESIGN_TOUCH_TARGETS.minPx).toBe(44);
    expect(DESIGN_TOUCH_TARGETS.comfortablePx).toBe(48);
  });

  it('exports media query strings for programmatic use', () => {
    expect(DESIGN_MEDIA_QUERIES.desktop).toBe('(min-width: 1280px)');
    expect(DESIGN_MEDIA_QUERIES.touchEnforce).toContain('640px');
  });
});

describe('tool CSS — token adoption (no scattered 44px in calculators)', () => {
  it('Calculators.css uses touch-target token for primary controls', () => {
    expect(calculatorsCss).toContain('min-height: var(--touch-target-min)');
    expect(calculatorsCss).not.toMatch(/[^-]min-height:\s*44px/);
  });

  it('Calculators.css uses page padding token', () => {
    expect(calculatorsCss).toContain('padding: var(--app-page-padding-compact)');
  });
});
