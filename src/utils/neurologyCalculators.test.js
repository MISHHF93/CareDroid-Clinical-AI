import { describe, expect, it } from 'vitest';
import {
  NEUROLOGY_SAFETY_DISCLAIMER,
  computeFourScore,
  computeHuntHessScale,
  computeIchScore,
  computeModifiedRankinScale,
  computeNihssSummaryView,
  computePediatricGcs,
} from './neurologyCalculators';

describe('neurologyCalculators', () => {
  it('computes core neurology scales with urgent-care disclaimers', () => {
    const huntHess = computeHuntHessScale({ grade: '3' });
    expect(huntHess.score).toBe(3);
    expect(huntHess.disclaimer).toBe(NEUROLOGY_SAFETY_DISCLAIMER);

    const ich = computeIchScore({
      age: 82,
      gcs: 10,
      volumeMl: 35,
      intraventricularHemorrhage: 'yes',
      infratentorialOrigin: 'no',
    });
    expect(ich.score).toBe(4);
    expect(ich.components).toMatchObject({ gcsPoints: 1, volumePoints: 1, ivhPoints: 1, agePoints: 1 });

    const four = computeFourScore({ eye: '4', motor: '4', brainstem: '4', respiration: '4' });
    expect(four.score).toBe(16);
    expect(four.label).toMatch(/16/);
  });

  it('computes disability, NIHSS summary, and pediatric GCS without treatment recommendations', () => {
    expect(computeModifiedRankinScale({ score: '4' }).severity).toBe('critical');

    const nihss = computeNihssSummaryView({
      loc: '1',
      locQuestions: '1',
      locCommands: '0',
      gaze: '1',
      visual: '1',
      facial: '1',
      motorArmLeft: '2',
      motorArmRight: '0',
      motorLegLeft: '2',
      motorLegRight: '0',
      limbAtaxia: '1',
      sensory: '1',
      language: '1',
      dysarthria: '1',
      extinction: '0',
    });
    expect(nihss.score).toBe(13);
    expect(nihss.disclaimer).toMatch(/do not delay emergency stroke activation/i);
    expect(nihss.interpretation).not.toMatch(/recommend thrombolysis|recommend thrombectomy/i);

    const pediatricGcs = computePediatricGcs({ eye: '4', verbal: '5', motor: '6' });
    expect(pediatricGcs.score).toBe(15);
    expect(pediatricGcs.disclaimer).toMatch(/seizure care|airway support/i);
  });

  it('rejects incomplete or implausible inputs', () => {
    expect(computeFourScore({ eye: '4', motor: '', brainstem: '4', respiration: '4' }).ok).toBe(false);
    expect(
      computeIchScore({
        age: 140,
        gcs: 2,
        volumeMl: -1,
        intraventricularHemorrhage: '',
        infratentorialOrigin: 'no',
      }).errors.length
    ).toBeGreaterThan(0);
  });
});

