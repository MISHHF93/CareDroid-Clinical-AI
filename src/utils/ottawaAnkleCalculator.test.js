import { describe, it, expect } from 'vitest';
import {
  applyOttawaAnkleFootRules,
  evaluateOttawaAnkleRule,
  evaluateOttawaFootRule,
  interpretOttawaAnkleFootRules,
  ottawaApplicabilityWarnings,
  ottawaRulesApplicable,
} from './ottawaAnkleCalculator';

describe('ottawaAnkleCalculator', () => {
  const negativeExam = {
    painMalleolarZone: true,
    tendernessLateralMalleolus: false,
    tendernessMedialMalleolus: false,
    painMidfootZone: true,
    tendernessNavicular: false,
    tendernessFifthMetatarsalBase: false,
    unableToBearWeightBothTimes: false,
  };

  it('indicates ankle radiograph when malleolar pain and lateral tenderness', () => {
    const ankle = evaluateOttawaAnkleRule({
      ...negativeExam,
      tendernessLateralMalleolus: true,
    });
    expect(ankle.ankleRadiographIndicated).toBe(true);
  });

  it('does not indicate ankle radiograph without malleolar zone pain', () => {
    const ankle = evaluateOttawaAnkleRule({
      ...negativeExam,
      painMalleolarZone: false,
      tendernessLateralMalleolus: true,
    });
    expect(ankle.ankleRadiographIndicated).toBe(false);
  });

  it('indicates foot radiograph when midfoot pain and navicular tenderness', () => {
    const foot = evaluateOttawaFootRule({
      ...negativeExam,
      tendernessNavicular: true,
    });
    expect(foot.footRadiographIndicated).toBe(true);
  });

  it('uses shared weight-bearing criterion for ankle and foot', () => {
    const exam = { ...negativeExam, unableToBearWeightBothTimes: true };
    expect(evaluateOttawaAnkleRule(exam).ankleRadiographIndicated).toBe(true);
    expect(evaluateOttawaFootRule(exam).footRadiographIndicated).toBe(true);
  });

  it('flags hard-stop applicability warnings', () => {
    const warnings = ottawaApplicabilityWarnings({
      neurovascularCompromise: true,
      openFractureOrGrossDeformity: true,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(ottawaRulesApplicable(true)).toBe(false);
  });

  it('interpretation avoids fracture clearance language', () => {
    const result = applyOttawaAnkleFootRules(negativeExam);
    const interp = interpretOttawaAnkleFootRules(result);
    expect(interp.ankleRadiographIndicated).toBe(false);
    expect(interp.safetyDisclaimer).toMatch(/acute ankle\/foot injury only/i);
    expect(interp.interpretation).not.toMatch(/no fracture|fracture ruled out/i);
  });
});
