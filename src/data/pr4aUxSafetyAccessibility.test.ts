/**
 * PR4A clinical safety, UX, and accessibility contracts.
 * UI: pr4aCalculators.jsx (AscvdRisk, CkdStaging, StopBang, AuditC).
 * Logic: src/utils/*Calculator.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { interpretAscvdTenYearRisk, computeAscvdPceResult } from '../utils/ascvdPceCalculator';
import { interpretCkdStaging, computeCkdStagingResult, combineCkdPrognosticRisk, classifyGfrCategory, classifyAlbuminuria } from '../utils/ckdStagingCalculator';
import { interpretStopBangScore, computeStopBangResult } from '../utils/stopBangCalculator';
import { interpretAuditCScore, computeAuditCResult } from '../utils/auditCCalculator';
import {
  clinicalIntentTools,
} from './clinicalIntentToolCatalog';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pr4aCalculatorsSource = readFileSync(join(__dirname, '../pages/tools/pr4aCalculators.tsx'), 'utf8');

const CERTAINTY_PATTERN =
  /\b(confirmed diagnosis|definitely has|diagnosis established|rules out ckd|ruled out|excluded osa|has alcohol use disorder)\b/i;

const TREATMENT_PATTERN =
  /\b(start statin|prescribe|give aspirin|cpap dose|recommend dialysis|start heparin|mg\/kg|initiate detox)\b/i;

const PR4A_REGISTRY_IDS = ['ascvd-risk', 'ckd-staging', 'stop-bang', 'audit-c'];

function sliceCalculatorComponent(source, componentName) {
  const marker = `export function ${componentName}`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`${componentName} not found in pr4aCalculators.jsx`);
  }
  const next = source.indexOf('\nexport function ', start + marker.length);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

const ascvdUi = sliceCalculatorComponent(pr4aCalculatorsSource, 'AscvdRiskCalculator');
const ckdUi = sliceCalculatorComponent(pr4aCalculatorsSource, 'CkdStagingCalculator');
const stopBangUi = sliceCalculatorComponent(pr4aCalculatorsSource, 'StopBangCalculator');
const auditCUi = sliceCalculatorComponent(pr4aCalculatorsSource, 'AuditCCalculator');

describe('PR4A NLU — chat seeds avoid diagnostic certainty and treatment directives', () => {
  it.each(PR4A_REGISTRY_IDS)('%s chat seed is decision-support scoped', (toolId) => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === toolId);
    expect(nlu?.chatSeed).toBeTruthy();
    if (!nlu) throw new Error(`expected clinicalIntentTools to contain ${toolId}`);
    expect(nlu.chatSeed).not.toMatch(CERTAINTY_PATTERN);
    expect(nlu.chatSeed).not.toMatch(TREATMENT_PATTERN);
    expect(`${nlu.description} ${nlu.chatSeed}`).toMatch(
      /decision support|screening|does not diagnose|do not diagnose|does not recommend|primary prevention|risk estimate|stag/i
    );
  });
});

describe('PR4A UX & clinical safety — interpretation copy', () => {
  it('ASCVD interpretation avoids therapy mandates and diagnostic certainty', () => {
    const i = interpretAscvdTenYearRisk(12.5);
    if (!i) throw new Error('expected interpretAscvdTenYearRisk to return an interpretation');
    expect(i.safetyDisclaimer).toMatch(/do not diagnose/i);
    expect(i.pathwayDisclaimer).toMatch(/does not recommend specific medications/i);
    expect(i.preventionDiscussion).not.toMatch(TREATMENT_PATTERN);
    expect(i.interpretation).not.toMatch(CERTAINTY_PATTERN);
  });

  it('CKD staging interpretation avoids establishing chronicity or therapy', () => {
    const gfr = classifyGfrCategory(45);
    const alb = classifyAlbuminuria(120);
    if (!gfr) throw new Error('expected classifyGfrCategory to classify 45');
    if (!alb) throw new Error('expected classifyAlbuminuria to classify 120');
    const risk = combineCkdPrognosticRisk(gfr.category, alb.category);
    const i = interpretCkdStaging(45, gfr, alb, risk);
    expect(i.stagingDiscussion).toMatch(/≥3 months/i);
    expect(i.safetyDisclaimer).toMatch(/does not diagnose acute kidney injury/i);
    expect(i.pathwayDisclaimer).toMatch(/does not recommend specific therapies/i);
    expect(i.combinedStageLabel).toMatch(/G×A category/i);
    expect(i.combinedStageLabel).not.toMatch(/\bdiagnos/i);
    expect(i.interpretation).not.toMatch(TREATMENT_PATTERN);
  });

  it('STOP-Bang interpretation avoids OSA diagnosis and treatment orders', () => {
    const i = interpretStopBangScore(6);
    if (!i) throw new Error('expected interpretStopBangScore to return an interpretation');
    expect(i.screeningDisclaimer).toMatch(/Screening tool only/i);
    expect(i.safetyDisclaimer).toMatch(/does not diagnose OSA/i);
    expect(i.pathwayDisclaimer).toMatch(/does not recommend CPAP/i);
    expect(i.osaRiskDiscussion).not.toMatch(TREATMENT_PATTERN);
    expect(i.interpretation).not.toMatch(/\bhas obstructive sleep apnea\b/i);
  });

  it('AUDIT-C interpretation avoids AUD diagnosis and withdrawal management', () => {
    const i = interpretAuditCScore(5);
    if (!i) throw new Error('expected interpretAuditCScore to return an interpretation');
    expect(i.screeningDisclaimer).toMatch(/^Screening only\./i);
    expect(i.screeningDisclaimer).toMatch(/does not diagnose alcohol use disorder/i);
    expect(i.pathwayDisclaimer).toMatch(/does not recommend specific medications/i);
    expect(i.interpretation).not.toMatch(/\bdetox\b/i);
    expect(i.screeningDiscussion).not.toMatch(TREATMENT_PATTERN);
  });
});

describe('PR4A UX & clinical safety — input validation', () => {
  it('ASCVD rejects out-of-range age and invalid lipids', () => {
    const out = computeAscvdPceResult({
      ageYears: 25,
      sex: 'male',
      race: 'white',
      totalCholesterol: 200,
      hdlCholesterol: 50,
      cholesterolUnit: 'mg_dl',
      systolicBpMmHg: 120,
    });
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected computeAscvdPceResult to fail validation');
    expect(out.errors.join(' ')).toMatch(/40.*79/i);
  });

  it('CKD staging rejects implausible creatinine and negative ACR', () => {
    const out = computeCkdStagingResult({
      ageYears: 55,
      sex: 'female',
      serumCreatinine: -1,
      creatinineUnit: 'mg_dl',
      urineAcr: 30,
      acrUnit: 'mg_g',
    });
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected computeCkdStagingResult to fail validation');
    expect(out.errors.length).toBeGreaterThan(0);
  });

  it('AUDIT-C requires all three questions', () => {
    const out = computeAuditCResult({
      drinkingFrequency: 'monthly_or_less',
      drinksPerDay: '',
      bingeFrequency: '',
    });
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected computeAuditCResult to fail validation');
    expect(out.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('STOP-Bang accepts zero-positive score', () => {
    const out = computeStopBangResult({
      snoring: false,
      tiredness: false,
      observedApnea: false,
      hypertension: false,
      bmiOver35: false,
      ageOver50: false,
      largeNeckCircumference: false,
      maleSex: false,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected computeStopBangResult to succeed');
    expect(out.totalScore).toBe(0);
  });
});

describe('PR4A accessibility & UX — reset and validation affordances', () => {
  it.each([
    ['AscvdRiskCalculator', 'ascvd-age', true],
    ['CkdStagingCalculator', 'ckd-age', true],
    ['StopBangCalculator', 'stop-bang-snoring', false],
    ['AuditCCalculator', 'audit-c-drinkingFrequency', true],
  ])('%s clears result on reset and restores focus to %s', (component, focusId, clearsValidation) => {
    const slice = sliceCalculatorComponent(pr4aCalculatorsSource, component);
    expect(slice).toContain('setResult(null)');
    if (clearsValidation) {
      expect(slice).toContain('setValidationErrors([])');
    }
    expect(slice).toContain(focusId);
    expect(slice).toMatch(/aria-label="Reset/i);
  });

  it.each([
    ['AscvdRiskCalculator', 'fieldClass'],
    ['CkdStagingCalculator', 'fieldClass'],
    ['AuditCCalculator', 'fieldClass'],
  ])('%s applies invalid field styling when validation fails', (component, helper) => {
    const slice = sliceCalculatorComponent(pr4aCalculatorsSource, component);
    expect(slice).toContain(helper);
    expect(slice).toMatch(/fieldClass\(['"]calc-(input|select)-field/);
    expect(slice).toContain('role="alert"');
  });
});

describe('PR4A accessibility & UX — pr4aCalculators.jsx contracts', () => {
  it('ASCVD form uses labels, validation alert, interpretation region, and safety footer', () => {
    expect(ascvdUi).toContain('CalcDecisionSupportLead');
    expect(ascvdUi).toContain('aria-labelledby={formTitleId}');
    expect(ascvdUi).toContain('role="alert"');
    expect(ascvdUi).toContain('CalcInterpretationRegion');
    expect(ascvdUi).toContain('CalcResultSafetyFooter');
    expect(ascvdUi).toMatch(/aria-label="Calculate ASCVD/i);
    expect(ascvdUi).toMatch(/aria-label="Reset ASCVD/i);
    expect(ascvdUi).toContain('Does not recommend statins');
    expect(ascvdUi).toContain('Use as decision-support for clinician-patient discussions.');
    expect(ascvdUi).toContain('CalcRiskStatusBadge');
    expect(ascvdUi).toContain('aria-labelledby={ascvdScoreLabelId}');
    expect(ascvdUi).toContain('Risk interpretation (decision support)');
  });

  it('CKD staging form exposes prognostic risk badge and KDIGO disclaimers', () => {
    expect(ckdUi).toContain('Use as decision-support for clinician-patient discussions.');
    expect(ckdUi).toContain('gfrCategoryLabel');
    expect(ckdUi).toContain('albuminuriaCategoryLabel');
    expect(ckdUi).toContain('CalcDecisionSupportLead');
    expect(ckdUi).toContain('calc-ckd-prognostic-badge');
    expect(ckdUi).toContain('role="status"');
    expect(ckdUi).toContain('CalcInterpretationRegion');
    expect(ckdUi).toContain('CalcResultSafetyFooter');
    expect(ckdUi).toMatch(/aria-label="Calculate CKD/i);
    expect(ckdUi).toContain('Does not recommend dialysis');
    expect(ckdUi).toMatch(/≥3 months/i);
    expect(ckdUi).toContain('aria-labelledby={ckdScoreLabelId}');
    expect(ckdUi).toContain('Staging interpretation (decision support)');
  });

  it('STOP-Bang uses checkbox labels, screening lead, and risk emphasis', () => {
    expect(stopBangUi).toContain('CalcDecisionSupportLead');
    expect(stopBangUi).toContain('Screening tool only.');
    expect(stopBangUi).toMatch(/Screening tool only/i);
    expect(stopBangUi).toContain('htmlFor={id}');
    expect(stopBangUi).toContain('aria-describedby');
    expect(stopBangUi).toContain('CalcInterpretationRegion');
    expect(stopBangUi).toContain('CalcResultSafetyFooter');
    expect(stopBangUi).toMatch(/recommend CPAP, surgery/i);
    expect(stopBangUi).toMatch(/osaRiskCategory !== 'low'/);
    expect(stopBangUi).toContain('CalcRiskStatusBadge');
    expect(stopBangUi).toContain('Screening interpretation (decision support)');
  });

  it('AUDIT-C uses labeled selects, screening disclaimer, and reset', () => {
    expect(auditCUi).toContain('CalcDecisionSupportLead');
    expect(auditCUi).toMatch(/Screening only/i);
    expect(auditCUi).toContain('does not diagnose alcohol use disorder');
    expect(auditCUi).toContain('calc-select-field');
    expect(auditCUi).toContain('htmlFor={id}');
    expect(auditCUi).toContain('aria-required="true"');
    expect(auditCUi).toContain('CalcInterpretationRegion');
    expect(auditCUi).toContain('CalcResultSafetyFooter');
    expect(auditCUi).toMatch(/aria-label="Reset AUDIT-C/i);
    expect(auditCUi).toMatch(/sex-specific/i);
    expect(auditCUi).toContain('CalcRiskStatusBadge');
    expect(auditCUi).toContain('Screening interpretation (decision support)');
  });
});

describe('PR4A accessibility & UX — Calculators.css contracts', () => {
  const calculatorsCss = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');

  it('styles PR4A risk badges with distinct severity tones', () => {
    expect(calculatorsCss).toContain('.calc-pr4a-risk-badge--low');
    expect(calculatorsCss).toContain('.calc-pr4a-risk-badge--very_high');
    expect(calculatorsCss).toContain('.calc-pr4a-risk-badge--borderline');
    expect(calculatorsCss).toContain('.calc-interpretation-box--risk-emphasis');
  });

  it('scopes PR4A calculator disclaimer compaction selectors', () => {
    expect(calculatorsCss).toContain('.calculator-interface--ascvd-risk .calc-timi-disclaimer');
    expect(calculatorsCss).toContain('.calculator-interface--ckd-staging .calc-timi-disclaimer');
    expect(calculatorsCss).toContain('.calculator-interface--stop-bang .calc-timi-disclaimer');
    expect(calculatorsCss).toContain('.calculator-interface--audit-c .calc-timi-disclaimer');
  });
});
