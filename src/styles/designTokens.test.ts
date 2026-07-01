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
  DESIGN_SPACING,
  DESIGN_TYPOGRAPHY,
  DESIGN_TOUCH_TARGETS,
  DESIGN_MEDIA_QUERIES,
  DESIGN_RADII,
  DESIGN_ELEVATION,
  DESIGN_CARD_PADDING,
} from '../layout/designTokens';
import {
  SIDEBAR_WIDTH_COLLAPSED_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
} from '../layout/breakpoints';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
const mainJsx = readFileSync(join(__dirname, '../main.tsx'), 'utf8');
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
    expect(designTokensCss).toContain('--space-xs: var(--space-1)');
    expect(designTokensCss).toContain('--space-sm: var(--space-2)');
    expect(designTokensCss).toContain('--space-md: var(--space-3)');
    expect(designTokensCss).toContain('--space-lg: var(--space-4)');
    expect(designTokensCss).toContain('--space-xl: var(--space-6)');
    expect(designTokensCss).toContain('--space-2xl:');
    expect(designTokensCss).toContain('--app-space-xs: var(--space-1)');
    expect(designTokensCss).toContain('--app-space-2xl: var(--space-2xl)');
    expect(designTokensCss).toContain('--compact-page-gap:');
    expect(designTokensCss).toContain('--compact-card-padding:');
  });

  it('defines typography display through mono', () => {
    expect(designTokensCss).toContain('--app-type-display: var(--text-display-fluid)');
    expect(designTokensCss).toContain('--text-heading: var(--text-heading-fluid)');
    expect(designTokensCss).toContain('--text-subheading:');
    expect(designTokensCss).toContain('--text-body: var(--text-body-fluid)');
    expect(designTokensCss).toContain('--text-small:');
    expect(designTokensCss).toContain('--text-caption: var(--text-caption-fluid)');
    expect(designTokensCss).toContain('--text-mono: var(--font-13)');
    expect(designTokensCss).toContain('--app-type-label: var(--text-small)');
    expect(designTokensCss).toContain('--app-type-helper: var(--text-caption)');
    expect(indexCss).toContain('--text-caption-fluid:');
    expect(indexCss).toContain('--font-11: 11px');
    expect(indexCss).toContain('--font-24: 24px');
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

  it('keeps sidebar width CSS tokens aligned with JS layout mirrors', () => {
    expect(designTokensCss).toContain(`--sidebar-width-expanded: ${SIDEBAR_WIDTH_EXPANDED_PX}px`);
    expect(designTokensCss).toContain(`--sidebar-width-collapsed: ${SIDEBAR_WIDTH_COLLAPSED_PX}px`);
  });

  it('defines semantic radii and elevation aliases', () => {
    expect(designTokensCss).toContain('--app-radius-2xl: var(--radius-2xl)');
    expect(DESIGN_RADII['2xl']).toBe('var(--app-radius-2xl)');
    expect(DESIGN_ELEVATION.card).toBe('var(--app-elevation-card)');
  });

  it('defines app-wide card and state primitives for pages', () => {
    for (const token of [
      '--app-card-padding-standard',
      '--app-card-padding-dashboard',
      '--app-card-padding-tool',
      '--app-card-padding-calculator',
      '--app-card-padding-alert',
    ]) {
      expect(designTokensCss).toContain(token);
    }
    for (const primitive of ['.cd-page', '.cd-card--dashboard', '.cd-card--tool', '.cd-card--calculator', '.cd-empty', '.cd-loading', '.cd-error']) {
      expect(designTokensCss).toContain(primitive);
    }
    expect(DESIGN_CARD_PADDING.calculator).toBe('var(--app-card-padding-calculator)');
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

  it('exposes complete typography and spacing mirrors', () => {
    expect(DESIGN_SPACING['2xl']).toBe('var(--space-2xl)');
    expect(DESIGN_SPACING.appXs).toBe('var(--app-space-xs)');
    expect(DESIGN_TYPOGRAPHY.display).toBe('var(--app-type-display)');
    expect(DESIGN_TYPOGRAPHY.subheading).toBe('var(--text-subheading)');
    expect(DESIGN_TYPOGRAPHY.label).toBe('var(--app-type-label)');
    expect(DESIGN_TYPOGRAPHY.helper).toBe('var(--app-type-helper)');
    expect(DESIGN_TYPOGRAPHY.mono).toBe('var(--text-mono)');
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
