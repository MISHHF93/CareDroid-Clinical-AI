/**
 * PR2 Tier-A calculator UX, accessibility, and clinical-safety contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
} from './clinicalToolIdContract';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const calculatorsCss = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');

const PR2_TIER_A_COMPONENTS = Object.freeze({
  meld: 'MeldCalculator',
  'meld-na': 'MeldCalculator',
  'timi-ua-nstemi': 'TimiUaNstemiCalculator',
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

describe('PR2 Tier-A calculators — shared accessibility affordances', () => {
  it.each([...PR2_TIER_A_CALCULATOR_REGISTRY_IDS])('%s uses PR1 result chrome and reset labels', (id) => {
    const component = PR2_TIER_A_COMPONENTS[id];
    const ui = sliceCalculatorComponent(calculatorsSource, component);
    expect(ui).toContain('CalcDecisionSupportLead');
    expect(ui).toContain('CalcResultSafetyFooter');
    expect(ui).toContain('CalcInterpretationRegion');
    expect(ui).toContain('CalcResultsPanel');
    expect(ui).toContain('scrollCalcResultsIntoView');
    expect(ui).toContain('resultsRef = useRef');
    if (id === 'meld' || id === 'meld-na') {
      expect(ui).toMatch(/aria-label=\{`Reset .+ form`\}/);
    } else {
      expect(ui).toMatch(/aria-label="Reset TIMI form"/);
    }
  });

  it('MELD calculator marks invalid numeric fields with calcFieldClass', () => {
    const ui = sliceCalculatorComponent(calculatorsSource, 'MeldCalculator');
    expect(ui).toContain('calcFieldClass(');
    expect(ui).toContain('biliInvalid');
    expect(ui).toContain('role="alert"');
    expect(ui).toContain('calc-validation-errors');
    expect(ui).toContain('clearValidationIfPresent');
    expect(ui).toContain('meldNaSecondaryScoreLabelId');
  });

  it('maps each PR2 Tier-A calculator to a distinct results panel id', () => {
    expect(calculatorsSource).toContain("'calc-results-meld'");
    expect(calculatorsSource).toContain("'calc-results-meld-na'");
    expect(calculatorsSource).toContain('id="calc-results-timi"');
  });

  it('TIMI fieldset does not nest role=group inside fieldset', () => {
    const ui = sliceCalculatorComponent(calculatorsSource, 'TimiUaNstemiCalculator');
    expect(ui).toContain('<fieldset');
    expect(ui).not.toMatch(/calc-timi-criteria[^]*role="group"/s);
  });

  it('styles invalid fields and risk-emphasis interpretation panels', () => {
    expect(calculatorsCss).toContain('.calc-input-field--invalid');
    expect(calculatorsCss).toContain('.calc-interpretation-box--risk-emphasis');
    expect(calculatorsCss).toContain('.calc-meld-disclaimer');
    expect(calculatorsCss).toContain('.calc-timi-disclaimer');
    expect(calculatorsCss).toContain('.calculator-results:focus-visible');
  });
});

describe('PR2 Tier-B chat-assisted — hub accessibility', () => {
  it('exposes Wells PE and PERC in PE hub group with safety lead', () => {
    const pe = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'pe');
    expect(pe?.toolIds).toEqual(expect.arrayContaining([...PR2_TIER_B_CHAT_CALCULATOR_IDS]));
    expect(pe?.lead).toMatch(/do not rule in or rule out/i);
  });

  it('chat-assisted cards use aria-label and describedby', () => {
    expect(calculatorsSource).toContain('chatAssistedLaunchAriaLabel');
    expect(calculatorsSource).toContain('aria-describedby={`calc-chat-assisted-desc-${tool.toolId}`}');
    expect(calculatorsSource).toContain('calc-chat-assisted-lead');
  });
});
