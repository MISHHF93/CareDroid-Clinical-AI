import { describe, it, expect } from 'vitest';
import {
  applyCanadianCSpineRule,
  ccrApplicabilityWarnings,
  evaluateCcrHighRisk,
  evaluateCcrLowRisk,
  interpretCanadianCSpine,
} from './canadianCSpineCalculator';

describe('canadianCSpineCalculator', () => {
  const noHigh = {
    age65OrOlder: false,
    dangerousMechanism: false,
    paresthesiasInExtremities: false,
  };

  const allLow = {
    simpleRearEndMvc: true,
    sittingInEd: true,
    ambulatoryAtAnyTime: true,
    delayedNeckPainOnset: true,
    noMidlineCervicalTenderness: true,
    noDistractingPainfulInjury: true,
  };

  it('indicates imaging when any high-risk factor is present', () => {
    const high = evaluateCcrHighRisk({ ...noHigh, age65OrOlder: true });
    expect(high.anyHighRisk).toBe(true);
    const result = applyCanadianCSpineRule({
      highRisk: high,
      lowRisk: evaluateCcrLowRisk(allLow),
      activeRotationLeft45: true,
      activeRotationRight45: true,
    });
    expect(result.imagingIndicatedByRule).toBe(true);
    expect(result.branch).toBe('high-risk');
  });

  it('indicates imaging when low-risk criteria are not all met', () => {
    const result = applyCanadianCSpineRule({
      highRisk: evaluateCcrHighRisk(noHigh),
      lowRisk: evaluateCcrLowRisk({ ...allLow, noMidlineCervicalTenderness: false }),
      activeRotationLeft45: true,
      activeRotationRight45: true,
    });
    expect(result.imagingIndicatedByRule).toBe(true);
    expect(result.branch).toBe('not-all-low-risk');
  });

  it('does not indicate imaging when all low-risk and ROM 45° bilateral', () => {
    const result = applyCanadianCSpineRule({
      highRisk: evaluateCcrHighRisk(noHigh),
      lowRisk: evaluateCcrLowRisk(allLow),
      activeRotationLeft45: true,
      activeRotationRight45: true,
    });
    expect(result.imagingIndicatedByRule).toBe(false);
    expect(result.branch).toBe('rom-pass');
  });

  it('indicates imaging when ROM fails despite low-risk', () => {
    const result = applyCanadianCSpineRule({
      highRisk: evaluateCcrHighRisk(noHigh),
      lowRisk: evaluateCcrLowRisk(allLow),
      activeRotationLeft45: true,
      activeRotationRight45: false,
    });
    expect(result.imagingIndicatedByRule).toBe(true);
    expect(result.branch).toBe('rom-fail');
  });

  it('flags applicability limits', () => {
    const warnings = ccrApplicabilityWarnings({
      gcs15AndStable: false,
      unreliableExamOrIntoxication: true,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('interpretation avoids clearance language and delays', () => {
    const result = applyCanadianCSpineRule({
      highRisk: evaluateCcrHighRisk(noHigh),
      lowRisk: evaluateCcrLowRisk(allLow),
      activeRotationLeft45: true,
      activeRotationRight45: true,
    });
    const interp = interpretCanadianCSpine(result);
    expect(interp.safetyDisclaimer).toMatch(/does not clear the cervical spine/i);
    expect(interp.pathwayDisclaimer).toMatch(/Do not delay primary trauma survey/i);
    expect(interp.interpretation).not.toMatch(/c-spine cleared|definitely no fracture/i);
  });
});
