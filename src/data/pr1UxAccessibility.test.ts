/**
 * PR1 Tier-A calculator UX, accessibility, and clinical-safety contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { PR1_CALCULATOR_REGISTRY_IDS } from './clinicalToolIdContract';
import { interpretQsofaScore } from '../utils/qsofaCalculator';
import { interpretNews2Risk } from '../utils/news2Calculator';
import { interpretChildPughClass } from '../utils/childPughCalculator';
import { interpretHasBled } from '../utils/hasBledCalculator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');
const calculatorsCss = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');
const calculatorPrimitivesSource = readFileSync(join(__dirname, '../pages/tools/calculatorPrimitives.tsx'), 'utf8');

const CERTAINTY_PATTERN =
  /\b(definitely has|confirmed diagnosis|diagnosis established|rules out|ruled out|diagnostic certainty)\b/i;

const TREATMENT_PATTERN =
  /\b(start anticoagulation|stop anticoagulation|prescribe|give heparin|initiate antibiotics|recommend dialysis)\b/i;

const PR1_COMPONENTS = Object.freeze({
  qsofa: 'QSOFACalculator',
  news2: 'NEWS2Calculator',
  'child-pugh': 'ChildPughCalculator',
  'has-bled': 'HasBledCalculator',
});

function sliceCalculatorComponent(source, componentName) {
  const marker = `const ${componentName}`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`${componentName} not found in Calculators.jsx`);
  }
  const next = source.indexOf('\nconst ', start + marker.length);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

describe('PR1 calculators — shared accessibility affordances', () => {
  it.each([...PR1_CALCULATOR_REGISTRY_IDS])('%s exposes decision-support lead and safety footer', (id) => {
    const ui = sliceCalculatorComponent(calculatorsSource, PR1_COMPONENTS[id]);
    expect(ui).toContain('CalcDecisionSupportLead');
    expect(ui).toContain('CalcResultSafetyFooter');
    expect(ui).toContain('CalcInterpretationRegion');
    expect(ui).toContain('CalcResultsPanel');
    expect(ui).toContain('scrollCalcResultsIntoView');
    expect(ui).toContain('resultsRef = useRef');
    expect(ui).toMatch(/aria-label="Reset .+ form"/);
  });

  it.each(['qsofa', 'news2', 'child-pugh'])('%s marks invalid numeric fields', (id) => {
    const ui = sliceCalculatorComponent(calculatorsSource, PR1_COMPONENTS[id]);
    expect(ui).toContain('calcFieldClass');
    expect(ui).toContain('aria-invalid');
  });

  it('maps each PR1 calculator to a distinct results panel id', () => {
    expect(calculatorsSource).toContain('id="calc-results-qsofa"');
    expect(calculatorsSource).toContain('id="calc-results-news2"');
    expect(calculatorsSource).toContain('id="calc-results-child-pugh"');
    expect(calculatorsSource).toContain('id="calc-results-has-bled"');
  });

  it('styles invalid fields and risk-emphasis interpretation panels', () => {
    expect(calculatorsCss).toContain('.calc-input-field--invalid');
    expect(calculatorsCss).toContain('.calc-interpretation-box--risk-emphasis');
    expect(calculatorsCss).toContain('.calc-interpretation-box.normal');
    expect(calculatorsCss).toContain('.calculator-results:focus-visible');
  });
});

describe('PR1 calculators — clinical safety copy', () => {
  it('qSOFA interpretation avoids diagnostic certainty', () => {
    const i = interpretQsofaScore(2);
    expect(i.interpretation).toMatch(/not diagnostic of sepsis/i);
    expect(i.interpretation).not.toMatch(CERTAINTY_PATTERN);
    expect(i.interpretation).not.toMatch(TREATMENT_PATTERN);
  });

  it('NEWS2 interpretation is escalation guidance, not therapy orders', () => {
    const i = interpretNews2Risk(7, { spo2ScaleUsed: 1 });
    expect(i.interpretation).toBeTruthy();
    expect(`${i.interpretation} ${i.escalationHint ?? ''}`).not.toMatch(TREATMENT_PATTERN);
    expect(`${i.interpretation} ${i.escalationHint ?? ''}`).not.toMatch(CERTAINTY_PATTERN);
  });

  it('Child-Pugh interpretation is prognostic, not prescriptive', () => {
    const i = interpretChildPughClass(10);
    expect(i).toBeTruthy();
    if (!i) throw new Error('expected interpretChildPughClass to return a result');
    expect(i.interpretation).not.toMatch(TREATMENT_PATTERN);
    expect(i.interpretation).not.toMatch(CERTAINTY_PATTERN);
  });

  it('HAS-BLED interpretation does not mandate anticoagulation changes', () => {
    const i = interpretHasBled(4);
    expect(i).toBeTruthy();
    if (!i) throw new Error('expected interpretHasBled to return a result');
    expect(`${i.interpretation} ${i.bleedingRiskNote ?? ''}`).not.toMatch(TREATMENT_PATTERN);
    expect(`${i.interpretation} ${i.bleedingRiskNote ?? ''}`).not.toMatch(CERTAINTY_PATTERN);
  });

  it('shared decision-support lead mentions no diagnostic certainty', () => {
    expect(calculatorPrimitivesSource).toContain('confer diagnostic certainty');
  });
});

describe('PR1 HAS-BLED — fieldset semantics', () => {
  it('does not duplicate role=group inside fieldset', () => {
    const ui = sliceCalculatorComponent(calculatorsSource, 'HasBledCalculator');
    expect(ui).toContain('<fieldset');
    expect(ui).not.toContain('role="group"');
  });

  it('keeps anticoagulation warning as alert', () => {
    const ui = sliceCalculatorComponent(calculatorsSource, 'HasBledCalculator');
    expect(ui).toContain('calc-has-bled-anticoag-warning');
    expect(ui).toContain('role="alert"');
  });
});
