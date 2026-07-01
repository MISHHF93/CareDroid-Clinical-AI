/**
 * PR1–PR5 calculator mobile layout contracts (320px usable).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  PR1_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
} from './clinicalToolIdContract';
import { CALCULATOR_INTERFACE_CLASS_BY_SLUG } from './calculatorHubManifest';
import { DESIGN_BREAKPOINTS_PX } from '../layout/designTokens';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsCss = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');
const mobilePrCss = readFileSync(join(__dirname, '../styles/calculators-mobile-pr.css'), 'utf8');
const mobileFirstCss = readFileSync(join(__dirname, '../styles/mobile-first-layout.css'), 'utf8');
const calculatorsJsx = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const pr4aJsx = readFileSync(join(__dirname, '../pages/tools/pr4aCalculators.tsx'), 'utf8');
const mentalJsx = readFileSync(join(__dirname, '../pages/tools/mentalHealthCalculators.tsx'), 'utf8');

/** Registry ids ? built-in form slugs for PR1–PR5 Tier-A forms */
export const PR1_PR5_TIER_A_FORM_SLUGS = Object.freeze([
  'qsofa',
  'news2',
  'child-pugh',
  'has-bled',
  'meld',
  'meld-na',
  'timi-ua-nstemi',
  'ascvd-risk',
  'ckd-staging',
  'stop-bang',
  'audit-c',
  'phq9',
  'gad7',
]);

const PR1_PR5_CHAT_HUB_REGISTRY_IDS = Object.freeze([
  ...PR3_TIER_B_CHAT_CALCULATOR_IDS,
]);

describe('PR1–PR5 inventory', () => {
  it('lists thirteen Tier-A form slugs for PR1, PR2, PR4A, PR5', () => {
    expect(PR1_PR5_TIER_A_FORM_SLUGS).toHaveLength(13);
    expect(PR1_CALCULATOR_REGISTRY_IDS).toHaveLength(4);
    expect(PR2_TIER_A_CALCULATOR_REGISTRY_IDS).toHaveLength(3);
    expect(PR4A_TIER_A_CALCULATOR_REGISTRY_IDS).toHaveLength(4);
    expect(PR5_TIER_A_CALCULATOR_REGISTRY_IDS).toHaveLength(2);
  });

  it.each(PR1_PR5_TIER_A_FORM_SLUGS)('%s has interface class in hub manifest', (slug) => {
    expect(CALCULATOR_INTERFACE_CLASS_BY_SLUG[slug]).toBeTruthy();
  });

  it('PR3 ships as chat-assisted hub tools', () => {
    expect(PR1_PR5_CHAT_HUB_REGISTRY_IDS.length).toBeGreaterThanOrEqual(4);
    expect(calculatorsJsx).toContain('calc-chat-assisted');
  });
});

describe('calculators-mobile-pr.css — phone layout', () => {
  it('is imported from Calculators.jsx', () => {
    expect(calculatorsJsx).toContain("import '../../styles/calculators-mobile-pr.css'");
  });

  it('collapses input grids to one column at mobile breakpoint', () => {
    expect(mobilePrCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.calc-input-grid--responsive[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
  });

  it('stacks result score rows and action buttons', () => {
    expect(mobilePrCss).toMatch(/\.calc-score-display-row[\s\S]*flex-direction:\s*column/);
    expect(mobilePrCss).toMatch(/\.calc-actions[\s\S]*flex-direction:\s*column/);
    expect(mobilePrCss).toMatch(/\.calc-reset-btn[\s\S]*width:\s*100%/);
  });

  it('wraps labels and keeps disclaimers within width', () => {
    expect(mobilePrCss).toMatch(/\.calc-input-label-text[\s\S]*overflow-wrap:\s*anywhere/);
    expect(mobilePrCss).toMatch(/\.calc-ds-lead[\s\S]*overflow-wrap:\s*anywhere/);
    expect(mobilePrCss).toMatch(/\.calc-result-safety-footer[\s\S]*overflow-wrap:\s*anywhere/);
    expect(mobilePrCss).toMatch(/\.calc-qsofa-disclaimer[\s\S]*max-width:\s*100%/);
  });

  it('defines 320px compaction rules', () => {
    expect(mobilePrCss).toMatch(/@media \(max-width: 320px\)/);
    expect(mobilePrCss).toMatch(/\.calc-reset-btn[\s\S]*font-size:\s*var\(--text-body\)/);
  });

  it('aligns mobile breakpoint with design token mobile max', () => {
    expect(DESIGN_BREAKPOINTS_PX.mobileMax).toBe(767);
    expect(mobilePrCss).toContain('max-width: 767px');
  });
});

describe('PR1–PR5 — split form + overflow (shared shell)', () => {
  it('uses mobile-first single-column calculator-interface by default', () => {
    expect(mobileFirstCss).toMatch(
      /\.calculator-interface[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
  });

  it('clips horizontal overflow on calculator surfaces', () => {
    expect(calculatorsCss).toMatch(/\.calculators-content[\s\S]*overflow-x:\s*clip/);
    expect(mobilePrCss).toMatch(/\.calculator-interface[\s\S]*overflow-x:\s*clip/);
  });
});

describe('PR1–PR5 — module hooks', () => {
  it.each(['qsofa', 'news2', 'child-pugh', 'has-bled', 'meld', 'timi-ua-nstemi'])(
    'Calculators.jsx implements %s with reset and disclaimers',
    (slug) => {
      expect(calculatorsJsx).toContain(`calculator-interface--${slug === 'timi-ua-nstemi' ? 'timi' : slug === 'meld-na' ? 'meld' : slug}`);
      expect(calculatorsJsx).toMatch(/aria-label="Reset /);
      expect(calculatorsJsx).toContain('calc-reset-btn');
    }
  );

  it.each(['ascvd-risk', 'ckd-staging', 'stop-bang', 'audit-c'])('pr4a exposes %s form shell', (slug) => {
    expect(pr4aJsx).toContain(`calculator-interface--${slug}`);
    expect(pr4aJsx).toContain('calc-reset-btn');
    expect(pr4aJsx).toContain('CalcDecisionSupportLead');
  });

  it.each(['phq9', 'gad7'])('mental health exposes %s form shell', (slug) => {
    expect(mentalJsx).toContain(`calculator-interface--${slug}`);
    expect(mentalJsx).toContain('calc-input-label-text');
    expect(mentalJsx).toContain('calc-reset-btn');
  });
});
