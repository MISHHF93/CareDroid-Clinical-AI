/**
 * UX & accessibility contracts for PHQ-9, GAD-7, COPD GOLD, and Rome IV IBS.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  chatAssistedLaunchAriaLabelForTool,
  PR3_LAUNCH_ARIA_CONTEXT,
} from './chatAssistedHubGroups';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const chatHubGroupsSource = readFileSync(join(__dirname, './chatAssistedHubGroups.js'), 'utf8');
const mentalHealthUiSource = readFileSync(
  join(__dirname, '../pages/tools/mentalHealthCalculators.jsx'),
  'utf8'
);
const calculatorsCssSource = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');

function sliceExportedComponent(source, componentName) {
  const start = source.indexOf(`export function ${componentName}`);
  if (start < 0) {
    throw new Error(`${componentName} not found`);
  }
  const next = source.indexOf('\nexport function ', start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

const phq9Ui = sliceExportedComponent(mentalHealthUiSource, 'Phq9Calculator');
const gad7Ui = sliceExportedComponent(mentalHealthUiSource, 'Gad7Calculator');

describe('Mental health calculators — hub wiring', () => {
  it('imports Tier-A calculators and exposes chat-assisted data-calc-id', () => {
    expect(calculatorsSource).toContain("from './mentalHealthCalculators'");
    expect(calculatorsSource).toContain("case 'phq9':");
    expect(calculatorsSource).toContain("case 'gad7':");
    expect(calculatorsSource).toContain('data-calc-id={tool.toolId}');
  });
});

describe('PHQ-9 UX & accessibility', () => {
  it('supports keyboard form submit, labeled fields, validation summary, and focus management', () => {
    expect(phq9Ui).toContain('noValidate');
    expect(phq9Ui).toContain('type="submit"');
    expect(phq9Ui).toContain('htmlFor={id}');
    expect(phq9Ui).toContain('phq9-validation-summary');
    expect(phq9Ui).toContain('formDescribedByIds(formDisclaimerId, validationSummaryId, hasValidationErrors)');
    expect(phq9Ui).toContain('phq9-form-disclaimer');
    expect(phq9Ui).toContain('likertSelectClassName(hasValidationErrors');
    expect(mentalHealthUiSource).toContain('calc-select-field--invalid');
    expect(calculatorsCssSource).toContain('.calc-select-field--invalid');
    expect(phq9Ui).toContain('focusFirstEmptyLikertItem');
    expect(phq9Ui).toMatch(/getElementById\('phq9-q1'\)/);
    expect(phq9Ui).toContain('scrollResultsIntoView');
    expect(phq9Ui).toContain('tabIndex={-1}');
    expect(phq9Ui).toContain('role="status"');
    expect(mentalHealthUiSource).not.toContain('motion.div');
  });

  it('exposes interpretation and score semantics for assistive tech', () => {
    expect(mentalHealthUiSource).toContain('<h3 id={headingId}');
    expect(phq9Ui).toContain('CalcInterpretationRegion');
    expect(phq9Ui).toContain('headingId={interpretationHeadingId}');
    expect(phq9Ui).toContain('role="group"');
    expect(phq9Ui).toContain('calc-breakdown-list');
    expect(phq9Ui).toMatch(/aria-live=\{result\?\.question9Elevated \? 'assertive' : 'polite'\}/);
    expect(phq9Ui).toContain('fieldset');
    expect(phq9Ui).toContain('<legend');
  });
});

describe('GAD-7 UX & accessibility', () => {
  it('supports keyboard form submit, labeled fields, validation summary, and focus management', () => {
    expect(gad7Ui).toContain('noValidate');
    expect(gad7Ui).toContain('type="submit"');
    expect(gad7Ui).toContain('htmlFor={id}');
    expect(gad7Ui).toContain('gad7-validation-summary');
    expect(gad7Ui).toContain('formDescribedByIds(formDisclaimerId, validationSummaryId, hasValidationErrors)');
    expect(gad7Ui).toContain('gad7-form-disclaimer');
    expect(gad7Ui).toContain('likertSelectClassName(hasValidationErrors');
    expect(gad7Ui).toContain('focusFirstEmptyLikertItem');
    expect(gad7Ui).toMatch(/getElementById\('gad7-q1'\)/);
    expect(gad7Ui).toContain('scrollResultsIntoView');
    expect(gad7Ui).toContain('tabIndex={-1}');
    expect(gad7Ui).toContain('role="status"');
  });

  it('exposes severe and moderate escalation live regions and interpretation heading', () => {
    expect(gad7Ui).toContain('calc-gad7-severe-warning');
    expect(gad7Ui).toContain('calc-gad7-moderate-warning');
    expect(gad7Ui).toMatch(
      /aria-live=\{\s*result\?\.acuteDistressSafetyAlert\?\.elevated \|\| result\?\.moderateSymptomEscalation\?\.warranted/
    );
    expect(calculatorsCssSource).toContain('.calc-gad7-moderate-warning');
    expect(mentalHealthUiSource).toContain('<h3 id={headingId}');
    expect(gad7Ui).toContain('CalcInterpretationRegion');
  });
});

describe('Chat-assisted hub — COPD GOLD & Rome IV IBS', () => {
  it('uses native buttons with accessible names for Tier-B launches', () => {
    expect(calculatorsSource).toContain('chatAssistedLaunchAriaLabelForTool');
    expect(calculatorsSource).toContain('aria-describedby={`calc-chat-assisted-desc-${tool.toolId}`}');
    expect(calculatorsSource).toMatch(/data-calc-id=\{tool\.toolId\}/);
    expect(chatHubGroupsSource).toContain("'copd-gold'");
    expect(chatHubGroupsSource).toContain("'rome-iv-ibs'");
  });

  it('adds urgency context for COPD GOLD and Rome IV IBS launch buttons', () => {
    expect(PR3_LAUNCH_ARIA_CONTEXT['copd-gold']).toMatch(/respiratory distress/i);
    expect(PR3_LAUNCH_ARIA_CONTEXT['rome-iv-ibs']).toMatch(/alarm features/i);

    const copdLabel = chatAssistedLaunchAriaLabelForTool('copd-gold', 'COPD GOLD');
    const romeLabel = chatAssistedLaunchAriaLabelForTool('rome-iv-ibs', 'Rome IV IBS');
    expect(copdLabel).toContain('COPD GOLD');
    expect(copdLabel).toContain(PR3_LAUNCH_ARIA_CONTEXT['copd-gold']);
    expect(romeLabel).toContain('Rome IV IBS');
    expect(romeLabel).toContain(PR3_LAUNCH_ARIA_CONTEXT['rome-iv-ibs']);
  });
});
