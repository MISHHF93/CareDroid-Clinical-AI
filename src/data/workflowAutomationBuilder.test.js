import { describe, expect, it } from 'vitest';
import {
  AUTOMATION_STEP_TYPES,
  buildAutomationRule,
  buildAutomationRuleLibrary,
  summarizeAutomationBuilder,
  validateAutomationRule,
} from './workflowAutomationBuilder';

describe('workflowAutomationBuilder', () => {
  it('builds trigger condition action chains for required examples', () => {
    const rules = buildAutomationRuleLibrary();

    expect(rules.map((rule) => rule.summary)).toEqual([
      'High NEWS2 -> Patient is admitted -> Notify clinician',
      'Device offline -> Device has assigned owner -> Create maintenance ticket',
      'Abnormal potassium -> Critical result confirmed -> Open laboratory workflow',
    ]);
    expect(rules.every((rule) => rule.chain.map((step) => step.type).join('|') === 'trigger|condition|action')).toBe(true);
  });

  it('allows composing a custom rule from selected steps', () => {
    const rule = buildAutomationRule({
      triggerId: 'abnormal-potassium',
      conditionId: 'always',
      actionId: 'notify-clinician',
    });

    expect(rule.summary).toBe('Abnormal potassium -> Always run -> Notify clinician');
    expect(rule.chain[0].type).toBe(AUTOMATION_STEP_TYPES.TRIGGER);
    expect(validateAutomationRule(rule)).toEqual({ valid: true, missing: [] });
  });

  it('summarizes available builder options', () => {
    expect(summarizeAutomationBuilder()).toEqual({
      triggers: 3,
      conditions: 4,
      actions: 3,
      templates: 3,
    });
  });
});
