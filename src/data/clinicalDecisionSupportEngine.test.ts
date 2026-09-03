import { describe, expect, it } from 'vitest';
import { buildClinicalDecisionSupportPlan } from './clinicalDecisionSupportEngine';

const calculatorInventory = Object.freeze([
  {
    id: 'heart-score',
    name: 'HEART Score',
    path: '/tools/calculators/heart-score',
    category: 'Calculator',
  },
  {
    id: 'timi-ua-nstemi',
    name: 'TIMI UA/NSTEMI',
    path: '/tools/calculators/timi-ua-nstemi',
    category: 'Calculator',
  },
  { id: 'qsofa', name: 'qSOFA', path: '/tools/calculators/qsofa', category: 'Calculator' },
  { id: 'news2', name: 'NEWS2', path: '/tools/calculators/news2', category: 'Calculator' },
  { id: 'nihss', name: 'NIHSS', path: '/tools/calculators/nihss', category: 'Calculator' },
  { id: 'wells-pe', name: 'Wells PE', path: '/tools/calculators/wells-pe', category: 'Calculator' },
]);

describe('clinicalDecisionSupportEngine', () => {
  it('risk stratifies chest pain and recommends calculators, labs, imaging, and escalation', () => {
    const plan = buildClinicalDecisionSupportPlan({
      symptoms: 'Chest pain with diaphoresis, nausea, and shortness of breath',
      patientContext: { age: '70', vitals: 'tachycardia', history: 'diabetes' },
      profile: { role: 'emergency physician', specialty: 'emergency medicine' },
      activeWorkspaceId: 'diagnostic',
      calculatorInventory,
    });

    expect(plan.riskLevel).toBe('high');
    expect(plan.signals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining(['acs', 'respiratory']),
    );
    expect(plan.calculatorRecommendations.map((calculator) => calculator.id)).toEqual(
      expect.arrayContaining(['heart-score', 'timi-ua-nstemi', 'wells-pe']),
    );
    expect(plan.labRecommendations.join(' ')).toMatch(/troponin/i);
    expect(plan.imagingRecommendations.join(' ')).toMatch(/ecg|chest x-ray/i);
    expect(plan.escalationSuggestions.join(' ')).toMatch(/unstable|escalate/i);
  });

  it('explains profile, workspace, patient context, inventory, and limitations', () => {
    const plan = buildClinicalDecisionSupportPlan({
      symptoms: 'Aphasia and weakness with last known well unclear',
      patientContext: { age: '68', vitals: 'altered mental status' },
      profile: { role: 'medical student', specialty: 'medical education' },
      activeWorkspaceId: 'calculator',
      calculatorInventory,
    });

    expect(plan.riskLevel).toBe('critical');
    expect(plan.calculatorRecommendations.map((calculator) => calculator.id)).toContain('nihss');
    expect(plan.explainability.profileContext).toMatch(/structured differential/i);
    expect(plan.explainability.workspaceContext).toMatch(/calculator/i);
    expect(plan.explainability.patientContext.join(' ')).toMatch(/age >= 65/i);
    expect(plan.explainability.inventoryContext).toMatch(/calculator recommendations/i);
    expect(plan.explainability.limitations).toContain('Does not diagnose or order care.');
  });
});
