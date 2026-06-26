import { describe, expect, it } from 'vitest';
import {
  computeCageResult,
  computeColumbiaSuicideSeverityWorkflow,
  computeEpworthSleepinessResult,
  computeMdqResult,
  computeMmseResult,
  computeMocaPlaceholderWorkflow,
  computePcl5Result,
} from './psychiatryScreeningCalculators';

describe('psychiatry screening calculators', () => {
  it('scores CAGE without diagnosing alcohol use disorder', () => {
    const result = computeCageResult({
      cutDown: 'yes',
      annoyed: 'yes',
      guilty: 'no',
      eyeOpener: 'no',
    });

    expect(result.ok).toBe(true);
    expect(result.score).toBe(2);
    expect(result.positive).toBe(true);
    expect(result.interpretation).toMatch(/does not diagnose alcohol use disorder/i);
  });

  it('scores MMSE domain entry and preserves cognitive safety wording', () => {
    const result = computeMmseResult({
      orientationTime: 4,
      orientationPlace: 4,
      registration: 3,
      attentionCalculation: 4,
      recall: 2,
      language: 7,
      visuospatial: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.score).toBe(25);
    expect(result.interpretation).toMatch(/does not diagnose dementia, delirium, or capacity/i);
  });

  it('blocks MoCA workflow when governed prerequisites are missing', () => {
    const result = computeMocaPlaceholderWorkflow({
      officialFormAvailable: 'no',
      trainedAdministrator: 'yes',
      accommodationsReviewed: 'yes',
      humanReviewPlan: 'yes',
    });

    expect(result.ok).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.interpretation).toMatch(/does not administer or score MoCA/i);
  });

  it('flags PCL-5 current safety concerns as crisis-sensitive', () => {
    const itemScores = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`q${index + 1}`, 1]));
    const result = computePcl5Result({
      eventCriterionReviewed: 'yes',
      currentSafetyConcern: 'yes',
      ...itemScores,
    });

    expect(result.ok).toBe(true);
    expect(result.crisisSensitive).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.safetyAlert).toMatch(/immediate safety assessment/i);
  });

  it('applies MDQ positive-screen criteria without diagnosing bipolar disorder', () => {
    const result = computeMdqResult({
      symptomCount: 7,
      samePeriod: 'yes',
      impairment: 'moderate',
      urgentSafetyConcern: 'no',
    });

    expect(result.ok).toBe(true);
    expect(result.positive).toBe(true);
    expect(result.interpretation).toMatch(/does not diagnose bipolar disorder/i);
  });

  it('flags Epworth safety-sensitive sleepiness for human review', () => {
    const itemScores = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`q${index + 1}`, index % 2]));
    const result = computeEpworthSleepinessResult({
      safetySensitiveActivity: 'yes',
      ...itemScores,
    });

    expect(result.ok).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.safetyAlert).toMatch(/safety-sensitive activity/i);
  });

  it('treats any Columbia workflow disclosure as immediate safety review', () => {
    const result = computeColumbiaSuicideSeverityWorkflow({
      ideation: 'yes',
      intentOrPlan: 'no',
      behavior: 'no',
      currentUnsafe: 'no',
      directHumanReview: 'yes',
    });

    expect(result.ok).toBe(true);
    expect(result.crisisSensitive).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.safetyAlert).toMatch(/988 Suicide & Crisis Lifeline/i);
  });
});
