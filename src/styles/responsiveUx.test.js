/**
 * Responsive typography, spacing, and touch-target contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const responsiveUxCss = readFileSync(join(__dirname, 'responsive-ux.css'), 'utf8');
const mainJsx = readFileSync(join(__dirname, '../main.jsx'), 'utf8');
const buttonCss = readFileSync(join(__dirname, '../components/ui/button.css'), 'utf8');
const disclaimerCss = readFileSync(
  join(__dirname, '../components/clinical/ClinicalDecisionSupportDisclaimer.css'),
  'utf8'
);

describe('responsive-ux.css — global normalization', () => {
  it('is imported from main.jsx after design-tokens.css', () => {
    expect(mainJsx).toContain("import './styles/design-tokens.css'");
    expect(mainJsx).toContain("import './styles/responsive-ux.css'");
    expect(mainJsx).toContain("import './styles/mobile-first-layout.css'");
    const tokensPos = mainJsx.indexOf("import './styles/design-tokens.css'");
    const uxPos = mainJsx.indexOf("import './styles/responsive-ux.css'");
    expect(uxPos).toBeGreaterThan(tokensPos);
  });

  it('relies on design-tokens for fluid type scale', () => {
    const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
    expect(designTokensCss).toContain('--app-type-title:');
    expect(designTokensCss).toContain('clamp(');
    expect(responsiveUxCss).toContain('var(--app-type-title)');
  });

  it('prevents heading overflow in app scroll surfaces', () => {
    expect(responsiveUxCss).toMatch(/\.app-scroll-container h1[\s\S]*overflow-wrap:\s*anywhere/);
    expect(responsiveUxCss).toMatch(/overflow-wrap:\s*anywhere[\s\S]*word-break:\s*break-word/);
  });

  it('wraps long clinical tool names and catalog cells', () => {
    expect(responsiveUxCss).toContain('.catalog-tool-name-cell');
    expect(responsiveUxCss).toContain('.calculator-name');
    expect(responsiveUxCss).toMatch(/\.catalog-tool-name-cell[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('enforces mobile touch targets on primary buttons and form controls', () => {
    expect(responsiveUxCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*min-height:\s*var\(--app-min-touch-target/
    );
    expect(responsiveUxCss).toMatch(/\.calc-input-field[\s\S]*min-height:\s*var\(--app-min-touch-target/);
  });

  it('wraps badges and chips', () => {
    expect(responsiveUxCss).toMatch(/\[class\*='badge'\][\s\S]*overflow-wrap:\s*anywhere/);
    expect(responsiveUxCss).toMatch(/\.catalog-category-chips[\s\S]*flex-wrap:\s*wrap/);
  });

  it('keeps icon rows from overflowing', () => {
    expect(responsiveUxCss).toMatch(/\.calculator-panel-title[\s\S]*min-width:\s*0/);
    expect(responsiveUxCss).toMatch(/flex-shrink:\s*0/);
  });

  it('compacts callouts on mobile without removing them', () => {
    expect(responsiveUxCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.clinical-ds-disclaimer[\s\S]*--app-callout-padding-compact/
    );
    expect(responsiveUxCss).toMatch(/\.calc-interpretation-box[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('reduces card padding on small screens', () => {
    expect(responsiveUxCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*--app-card-padding-compact/
    );
  });
});

describe('responsive UX — component baselines', () => {
  it('clinical disclaimer wraps text in the icon row', () => {
    expect(disclaimerCss).toMatch(/\.clinical-ds-disclaimer__text[\s\S]*overflow-wrap:\s*anywhere/);
    expect(disclaimerCss).toMatch(/\.clinical-ds-disclaimer[\s\S]*align-items:\s*flex-start/);
  });

  it('shared btn component supports touch-friendly sizing', () => {
    expect(buttonCss).toContain('.btn-md');
  });
});
