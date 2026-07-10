/**
 * PR5 clinical safety, UX, and accessibility contracts (PHQ-9, GAD-7).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { computePhq9Result, interpretPhq9Score } from '../utils/phq9Calculator';
import { computeGad7Result, interpretGad7Score } from '../utils/gad7Calculator';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mentalHealthUiSource = readFileSync(
  join(__dirname, '../pages/tools/mentalHealthCalculators.tsx'),
  'utf8'
);
const calculatorPrimitivesSource = readFileSync(
  join(__dirname, '../pages/tools/calculatorPrimitives.tsx'),
  'utf8'
);

const MEDICATION_PATTERN = /\b(prescribe|start antidepressant|ssri|snri|benzodiazepine|mg\/day)\b/i;
const DEPRESSION_DIAGNOSIS_PATTERN = /\b(diagnosed with depression|has major depressive disorder|confirmed depression)\b/i;
const ANXIETY_DIAGNOSIS_PATTERN =
  /\b(diagnosed with generalized anxiety|has generalized anxiety disorder|confirmed anxiety disorder)\b/i;

function sliceExportedComponent(source, componentName) {
  const start = source.indexOf(`export function ${componentName}`);
  if (start < 0) {
    throw new Error(`${componentName} not found in mentalHealthCalculators.jsx`);
  }
  const next = source.indexOf('\nexport function ', start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

const phq9Ui = sliceExportedComponent(mentalHealthUiSource, 'Phq9Calculator');
const gad7Ui = sliceExportedComponent(mentalHealthUiSource, 'Gad7Calculator');

describe('PR5 NLU — chat seed safety', () => {
  it('phq9 chat seed avoids diagnostic certainty and treatment directives', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === 'phq9');
    expect(nlu?.chatSeed).toBeTruthy();
    expect(nlu.chatSeed).not.toMatch(DEPRESSION_DIAGNOSIS_PATTERN);
    expect(nlu.chatSeed).not.toMatch(MEDICATION_PATTERN);
    expect(`${nlu.description} ${nlu.chatSeed}`).toMatch(/screen|does not diagnose/i);
    expect(nlu.chatSeed).toMatch(/STEP 0/i);
    expect(nlu.chatSeed).toMatch(/question 9/i);
    expect(nlu.chatSeed).toMatch(/988/i);
  });

  it('gad7 chat seed avoids diagnostic certainty and treatment directives', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === 'gad7');
    expect(nlu?.chatSeed).toBeTruthy();
    expect(nlu.chatSeed).not.toMatch(ANXIETY_DIAGNOSIS_PATTERN);
    expect(nlu.chatSeed).not.toMatch(MEDICATION_PATTERN);
    expect(`${nlu.description} ${nlu.chatSeed}`).toMatch(/screen|does not diagnose/i);
    expect(nlu.chatSeed).toMatch(/STEP 0/i);
    expect(nlu.chatSeed).toMatch(/988/i);
    expect(nlu.chatSeed).toMatch(/suicidal thoughts|self-harm/i);
  });
});

describe('PR5 UX & clinical safety — PHQ-9 interpretation copy', () => {
  it('interpretation avoids depression diagnosis and medication advice', () => {
    const interp = interpretPhq9Score(14, 0);
    const combined = `${interp.interpretation} ${interp.screeningDisclaimer} ${interp.pathwayDisclaimer}`;
    expect(combined).not.toMatch(DEPRESSION_DIAGNOSIS_PATTERN);
    expect(combined).not.toMatch(MEDICATION_PATTERN);
    expect(combined).toMatch(/does not diagnose/i);
    expect(interp.clinicianReviewDisclaimer).toMatch(/clinician/i);
  });

  it('elevates question 9 with urgent safety messaging', () => {
    const interp = interpretPhq9Score(3, 2);
    expect(interp.question9Elevated).toBe(true);
    expect(interp.severity).toBe('critical');
    expect(interp.question9SafetyAlert.message).toMatch(/urgent safety assessment/i);
    expect(interp.label).toMatch(/Question 9 elevated/i);
    expect(interp.interpretation).toMatch(/prioritize safety assessment/i);
  });

  it('warns on high total when question 9 is zero', () => {
    const interp = interpretPhq9Score(18, 0);
    expect(interp.highSymptomEscalation.warranted).toBe(true);
    expect(interp.highSymptomEscalation.message).toMatch(/does not rule out suicide risk/i);
  });

  it('computePhq9Result returns safety fields when q9 positive', () => {
    const out = computePhq9Result({
      q1: 0,
      q2: 0,
      q3: 0,
      q4: 0,
      q5: 0,
      q6: 0,
      q7: 0,
      q8: 0,
      q9: 1,
    });
    expect(out.ok).toBe(true);
    expect(out.question9Elevated).toBe(true);
  });
});

describe('PR5 accessibility & UX — Phq9Calculator UI contracts', () => {
  it('uses decision support lead, Q9 alerts, interpretation region, and safety footer', () => {
    // CalcInterpretationRegion (incl. the <h3 id={headingId}> heading) is imported from
    // calculatorPrimitives, not redeclared locally — assert the shared source instead.
    expect(calculatorPrimitivesSource).toContain('<h3 id={headingId}');
    expect(phq9Ui).toContain('phq9-validation-summary');
    expect(phq9Ui).toContain('calc-breakdown-list');
    expect(phq9Ui).toContain('CalcDecisionSupportLead');
    expect(phq9Ui).toContain('CalcInterpretationRegion');
    expect(phq9Ui).toContain('CalcResultSafetyFooter');
    expect(phq9Ui).toMatch(/Screening only/i);
    expect(phq9Ui).toMatch(/not diagnose depression/i);
    expect(phq9Ui).toMatch(/not recommend medications/i);
    expect(phq9Ui).toContain('role="alert"');
    expect(phq9Ui).toContain('calc-phq9-q9-inline-warning');
    expect(phq9Ui).toContain('calc-phq9-q9-result-warning');
    expect(phq9Ui).toMatch(/aria-label="Calculate PHQ-9/i);
    expect(phq9Ui).toMatch(/aria-label="Reset PHQ-9/i);
  });
});

describe('PR5 UX & clinical safety — GAD-7 interpretation copy', () => {
  it('interpretation avoids anxiety disorder diagnosis and medication advice', () => {
    const interp = interpretGad7Score(12);
    const combined = `${interp.interpretation} ${interp.screeningDisclaimer} ${interp.safetyDisclaimer}`;
    expect(combined).not.toMatch(ANXIETY_DIAGNOSIS_PATTERN);
    expect(combined).not.toMatch(MEDICATION_PATTERN);
    expect(combined).toMatch(/does not diagnose/i);
    expect(interp.clinicianReviewDisclaimer).toMatch(/clinician/i);
  });

  it('severe GAD-7 scores include acute distress safety alert', () => {
    const interp = interpretGad7Score(16);
    expect(interp.acuteDistressSafetyAlert.elevated).toBe(true);
    expect(interp.acuteDistressSafetyAlert.message).toMatch(/988/i);
    expect(interp.interpretation).toMatch(/suicidal thoughts/i);
  });

  it('computeGad7Result returns severity for a complete form', () => {
    const out = computeGad7Result({
      q1: 2,
      q2: 2,
      q3: 1,
      q4: 1,
      q5: 0,
      q6: 0,
      q7: 0,
    });
    expect(out.ok).toBe(true);
    expect(out.totalScore).toBe(6);
    expect(out.severityCategory).toBe('mild');
  });
});

describe('PR5 accessibility & UX — Gad7Calculator UI contracts', () => {
  it('uses decision support lead, interpretation region, and safety footer', () => {
    // CalcInterpretationRegion (incl. the <h3 id={headingId}> heading) is imported from
    // calculatorPrimitives, not redeclared locally — assert the shared source instead.
    expect(calculatorPrimitivesSource).toContain('<h3 id={headingId}');
    expect(gad7Ui).toContain('gad7-validation-summary');
    expect(gad7Ui).toContain('CalcDecisionSupportLead');
    expect(gad7Ui).toContain('CalcInterpretationRegion');
    expect(gad7Ui).toContain('CalcResultSafetyFooter');
    expect(gad7Ui).toMatch(/Screening only/i);
    expect(gad7Ui).toMatch(/diagnose generalized anxiety disorder/i);
    expect(gad7Ui).toMatch(/not recommend/i);
    expect(gad7Ui).toMatch(/aria-label="Calculate GAD-7/i);
    expect(gad7Ui).toMatch(/aria-label="Reset GAD-7/i);
    expect(gad7Ui).toContain('calc-gad7-severe-warning');
    expect(gad7Ui).toMatch(/suicide-risk protocols/i);
  });
});
