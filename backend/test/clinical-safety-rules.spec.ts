import {
  checkSuggestedActionSafety,
  collectPriorityFloorReasons,
  detectAbnormalVitals,
  evaluatePriorityChange,
  getClinicalSafetyRules,
} from '../../lib/ai/clinicalSafetyRules';

describe('clinicalSafetyRules', () => {
  it('exposes canonical governance floors from lib/ai/config', () => {
    const rules = getClinicalSafetyRules();

    expect(rules.cannotLowerPriorityFor.dpsScores).toEqual([1, 2]);
    expect(rules.cannotLowerPriorityFor.conditions).toEqual(
      expect.arrayContaining(['stroke', 'sepsis', 'chest_pain']),
    );
    expect(rules.requiredDisclaimers.length).toBeGreaterThanOrEqual(3);
  });

  it('detects abnormal vitals against governance thresholds', () => {
    expect(detectAbnormalVitals({ hr: 130 })).toContain('hr > 120');
    expect(detectAbnormalVitals({ spO2: 90 })).toContain('o2 < 92');
    expect(detectAbnormalVitals({ bp: '85/50' })).toContain('bp < 90/60');
    expect(detectAbnormalVitals({ hr: 80, rr: 18, spO2: 98 })).toEqual([]);
  });

  it('blocks lowering priority for DPS 2 patients', () => {
    const evaluation = evaluatePriorityChange({ dpsScore: 2 }, 4);

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.floorReasons).toContain('DPS2');
    expect(evaluation.message).toMatch(/Cannot lower priority/i);
  });

  it('blocks lowering priority for protected conditions and abnormal vitals', () => {
    const sepsis = collectPriorityFloorReasons({
      dpsScore: 3,
      chiefComplaint: 'Fever and suspected sepsis',
      vitals: { rr: 28, spO2: 90 },
    });

    expect(sepsis).toEqual(expect.arrayContaining(['sepsis_protocol', 'abnormal_vitals']));
  });

  it('allows escalation without blocking', () => {
    const evaluation = evaluatePriorityChange(
      {
        dpsScore: 3,
        chiefComplaint: 'Chest pain',
        vitals: { hr: 130 },
      },
      2,
    );

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.requiresHumanReview).toBe(true);
  });

  it('enforces disclaimer requirement for clinical suggestions', () => {
    const result = checkSuggestedActionSafety({
      action: 'recommend',
      clinical: true,
    });

    expect(result.safe).toBe(false);
    expect(result.violation).toMatch(/disclaimer/i);
  });

  it('blocks lower_priority actions for critical acuity via governance helper', () => {
    const result = checkSuggestedActionSafety({
      action: 'lower_priority',
      patientDps: 2,
      requestedDps: 4,
    });

    expect(result).toEqual({
      safe: false,
      violation: 'Cannot lower priority: DPS2.',
      floorReasons: ['DPS2'],
    });
  });
});