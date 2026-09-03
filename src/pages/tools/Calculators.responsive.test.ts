/**
 * Tier-A calculator responsive layout contracts (CSS + JSX class hooks).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  PR1_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
} from '../../data/clinicalToolIdContract';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsCss = readFileSync(join(__dirname, 'Calculators.css'), 'utf8');
const mobileFirstCss = readFileSync(
  join(__dirname, '../../styles/mobile-first-layout.css'),
  'utf8',
);
const mobilePrCss = readFileSync(join(__dirname, '../../styles/calculators-mobile-pr.css'), 'utf8');
const calculatorsJsx = readFileSync(join(__dirname, 'Calculators.tsx'), 'utf8');
const calculatorPrimitivesJsx = readFileSync(join(__dirname, 'calculatorPrimitives.tsx'), 'utf8');
const pr4aJsx = readFileSync(join(__dirname, 'pr4aCalculators.tsx'), 'utf8');
const mentalJsx = readFileSync(join(__dirname, 'mentalHealthCalculators.tsx'), 'utf8');

/** User-scoped Tier A calculators (forms in Calculators / PR4A / mental health modules). */
export const TIER_A_FORM_CALCULATOR_IDS = Object.freeze([
  ...PR1_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
]);

const TIER_A_INTERFACE_MODIFIERS = Object.freeze([
  'qsofa',
  'news2',
  'child-pugh',
  'has-bled',
  'meld',
  'timi',
  'ascvd-risk',
  'ckd-staging',
  'stop-bang',
  'audit-c',
  'phq9',
  'gad7',
]);

describe('Tier-A calculator inventory', () => {
  it('lists thirteen scoped Tier-A form calculators', () => {
    expect(TIER_A_FORM_CALCULATOR_IDS).toHaveLength(13);
    expect(TIER_A_FORM_CALCULATOR_IDS).toContain('meld-na');
    expect(TIER_A_FORM_CALCULATOR_IDS).toContain('timi-ua-nstemi');
  });
});

describe('Calculators.jsx — Tier-A interface hooks', () => {
  it.each(
    TIER_A_INTERFACE_MODIFIERS.filter((id) =>
      ['qsofa', 'news2', 'child-pugh', 'has-bled', 'meld', 'timi'].includes(id),
    ),
  )('declares calculator-interface--%s', (slug) => {
    expect(calculatorsJsx).toContain(`calculator-interface--${slug}`);
  });

  it('declares calculator-interface--meld-na when MELD-Na mode is active', () => {
    expect(calculatorsJsx).toContain('calculator-interface--meld-na');
  });

  it('uses responsive input grids for multi-field PR1/PR2 forms', () => {
    expect(calculatorsJsx).toContain('calc-input-grid calc-input-grid--responsive');
  });
});

describe('PR4A & mental health calculator modules', () => {
  it.each(['ascvd-risk', 'ckd-staging', 'stop-bang', 'audit-c'])(
    'pr4aCalculators exposes calculator-interface--%s',
    (slug) => {
      expect(pr4aJsx).toContain(`calculator-interface--${slug}`);
    },
  );

  it.each(['phq9', 'gad7'])('mentalHealthCalculators exposes calculator-interface--%s', (slug) => {
    expect(mentalJsx).toContain(`calculator-interface--${slug}`);
  });

  it('uses calc-input-label-text for long PHQ/GAD item labels', () => {
    expect(mentalJsx).toContain('calc-input-label-text');
  });
});

describe('Calculators.css — responsive layout', () => {
  it('defaults calculator interface to one column (mobile-first)', () => {
    expect(mobileFirstCss).toMatch(
      /\.calculator-interface[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
    expect(mobileFirstCss).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*\.calculator-interface[\s\S]*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\)/,
    );
    expect(calculatorsCss).not.toMatch(
      /\.calculator-interface\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/,
    );
  });

  it('collapses calc-input-grid to one column on mobile', () => {
    expect(calculatorsCss).toMatch(
      /\.calc-input-grid--responsive[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\)/,
    );
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-input-grid--responsive[\s\S]*grid-template-columns:\s*1fr/,
    );
  });

  it('stacks action buttons and enforces touch targets on mobile', () => {
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-actions[\s\S]*flex-direction:\s*column/,
    );
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-calculate-btn[\s\S]*min-height:\s*var\(--touch-target-min\)/,
    );
  });

  it('prevents horizontal overflow on inputs and result panels', () => {
    expect(calculatorsCss).toMatch(/\.calculators-content[\s\S]*overflow-x:\s*clip/);
    expect(calculatorsCss).toMatch(/\.calculator-interface[\s\S]*overflow-x:\s*clip/);
    expect(calculatorsCss).toMatch(/\.calculator-inputs[\s\S]*overflow-x:\s*clip/);
    expect(calculatorsCss).toMatch(/\.calc-input-field[\s\S]*max-width:\s*100%/);
    expect(calculatorsCss).toMatch(/\.calc-score-display[\s\S]*max-width:\s*100%/);
    expect(calculatorsCss).toMatch(/\.calc-interpretation-box[\s\S]*max-width:\s*100%/);
  });

  it('defines 320px Tier-A layout compaction', () => {
    expect(calculatorsCss).toMatch(/@media \(max-width: 320px\)/);
  });

  it('wraps long labels and breakdown text', () => {
    expect(calculatorsCss).toMatch(/\.calc-input-label-text[\s\S]*overflow-wrap:\s*anywhere/);
    expect(calculatorsCss).toMatch(/\.calc-breakdown-label[\s\S]*overflow-wrap:\s*anywhere/);
    expect(calculatorsCss).toMatch(/\.calc-interpretation-text[\s\S]*word-break:\s*break-word/);
  });

  it('styles TIMI criteria rows for narrow viewports', () => {
    expect(calculatorsCss).toContain('.calc-timi-row');
    expect(calculatorsCss).toMatch(/\.calc-timi-legend[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('stacks unit rows and full-width selects on mobile', () => {
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-input-row--with-unit[\s\S]*flex-direction:\s*column/,
    );
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-select-field[\s\S]*min-height:\s*var\(--touch-target-min\)/,
    );
  });

  it('uses fluid score typography', () => {
    expect(calculatorsCss).toMatch(/\.calc-score-value[\s\S]*clamp\(/);
  });
});

describe('Calculators.css — responsive typography & touch', () => {
  it('wraps panel titles and calculator card names', () => {
    expect(calculatorsCss).toMatch(/\.calculator-panel-title-text[\s\S]*overflow-wrap:\s*anywhere/);
    expect(calculatorsCss).toMatch(/\.calculator-name[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('enforces minimum touch height on primary form controls', () => {
    expect(calculatorsCss).toMatch(
      /\.calc-input-field[\s\S]*min-height:\s*var\(--touch-target-min\)/,
    );
    expect(calculatorsCss).toMatch(
      /\.calc-calculate-btn[\s\S]*min-height:\s*var\(--touch-target-min\)/,
    );
  });

  it('compacts callouts on mobile without removing them', () => {
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-qsofa-disclaimer[\s\S]*font-size:\s*12px/,
    );
  });

  it('declares calculator-panel-title-text in calculator modules', () => {
    expect(calculatorPrimitivesJsx).toContain('calculator-panel-title-text');
    // pr4a/mentalHealth import CalcPanelTitle from calculatorPrimitives rather than
    // redeclaring it locally — assert the shared import instead of the class literal.
    expect(pr4aJsx).toMatch(/CalcPanelTitle[\s\S]*from '\.\/calculatorPrimitives'/);
    expect(mentalJsx).toMatch(/CalcPanelTitle[\s\S]*from '\.\/calculatorPrimitives'/);
  });
});

describe('PR1–PR5 mobile stylesheet', () => {
  it('loads calculators-mobile-pr.css from Calculators.jsx', () => {
    expect(calculatorsJsx).toContain("import '../../styles/calculators-mobile-pr.css'");
  });

  it('keeps reset buttons full-width on phones', () => {
    expect(mobilePrCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.calc-reset-btn[\s\S]*width:\s*100%/,
    );
  });

  it('resizes warnings and result badges on narrow viewports', () => {
    expect(mobilePrCss).toMatch(/\.calc-gad7-severe-warning[\s\S]*max-width:\s*100%/);
    expect(mobilePrCss).toMatch(/\.calc-pr4a-risk-badge[\s\S]*max-width:\s*100%/);
  });

  it('prevents TIMI-style fieldsets and selects from overflowing phones', () => {
    expect(mobilePrCss).toMatch(
      /\.calc-pr1-form,[\s\S]*\.calc-timi-fieldset[\s\S]*min-inline-size:\s*0/,
    );
    expect(mobilePrCss).toMatch(
      /\.calc-timi-fieldset,[\s\S]*\.calc-meld-fieldset[\s\S]*width:\s*100%/,
    );
    expect(mobilePrCss).toMatch(/\.calc-timi-row select[\s\S]*max-width:\s*100%/);
  });
});
