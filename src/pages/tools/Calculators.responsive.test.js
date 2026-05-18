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
const calculatorsJsx = readFileSync(join(__dirname, 'Calculators.jsx'), 'utf8');
const pr4aJsx = readFileSync(join(__dirname, 'pr4aCalculators.jsx'), 'utf8');
const mentalJsx = readFileSync(join(__dirname, 'mentalHealthCalculators.jsx'), 'utf8');

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
  it.each(TIER_A_INTERFACE_MODIFIERS.filter((id) =>
    ['qsofa', 'news2', 'child-pugh', 'has-bled', 'meld', 'timi'].includes(id)
  ))('declares calculator-interface--%s', (slug) => {
    expect(calculatorsJsx).toContain(`calculator-interface--${slug}`);
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
    }
  );

  it.each(['phq9', 'gad7'])('mentalHealthCalculators exposes calculator-interface--%s', (slug) => {
    expect(mentalJsx).toContain(`calculator-interface--${slug}`);
  });

  it('uses calc-input-label-text for long PHQ/GAD item labels', () => {
    expect(mentalJsx).toContain('calc-input-label-text');
  });
});

describe('Calculators.css — responsive layout', () => {
  it('stacks two-column calculator interface below 1024px', () => {
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 1024px\)[\s\S]*\.calculator-interface[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
  });

  it('collapses calc-input-grid to one column on mobile', () => {
    expect(calculatorsCss).toMatch(
      /\.calc-input-grid--responsive[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\)/
    );
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-input-grid--responsive[\s\S]*grid-template-columns:\s*1fr/
    );
  });

  it('stacks action buttons and enforces touch targets on mobile', () => {
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-actions[\s\S]*flex-direction:\s*column/
    );
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-calculate-btn[\s\S]*min-height:\s*44px/
    );
  });

  it('prevents horizontal overflow on inputs and result panels', () => {
    expect(calculatorsCss).toMatch(/\.calculator-inputs[\s\S]*overflow-x:\s*clip/);
    expect(calculatorsCss).toMatch(/\.calc-input-field[\s\S]*max-width:\s*100%/);
    expect(calculatorsCss).toMatch(/\.calc-score-display[\s\S]*max-width:\s*100%/);
  });

  it('wraps long labels and breakdown text', () => {
    expect(calculatorsCss).toMatch(/\.calc-input-label-text[\s\S]*overflow-wrap:\s*anywhere/);
    expect(calculatorsCss).toMatch(/\.calc-breakdown-label[\s\S]*overflow-wrap:\s*anywhere/);
    expect(calculatorsCss).toMatch(/\.calc-interpretation-text[\s\S]*word-break:\s*break-word/);
  });

  it('stacks unit rows and full-width selects on mobile', () => {
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-input-row--with-unit[\s\S]*flex-direction:\s*column/
    );
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-select-field[\s\S]*min-height:\s*44px/
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
    expect(calculatorsCss).toMatch(/\.calc-input-field[\s\S]*min-height:\s*44px/);
    expect(calculatorsCss).toMatch(/\.calc-calculate-btn[\s\S]*min-height:\s*44px/);
  });

  it('compacts callouts on mobile without removing them', () => {
    expect(calculatorsCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.calc-qsofa-disclaimer[\s\S]*font-size:\s*12px/
    );
  });

  it('declares calculator-panel-title-text in calculator modules', () => {
    expect(calculatorsJsx).toContain('calculator-panel-title-text');
    expect(pr4aJsx).toContain('calculator-panel-title-text');
    expect(mentalJsx).toContain('calculator-panel-title-text');
  });
});
