import { describe, it, expect } from 'vitest';
import {
  computeNews2Breakdown,
  interpretNews2Risk,
  scoreConsciousness,
  scorePulse,
  scoreRespiratoryRate,
  scoreSpo2Scale1,
  scoreSpo2Scale2,
  scoreSupplementalOxygen,
  scoreSystolicBp,
  scoreTemperature,
  sumNews2Score,
  validateNews2Inputs,
} from './news2Calculator';
import {
  NEWS2_SCALE2_SPO2_EDGE,
  NEWS2_SCALE_SWITCH_FIXTURE,
  NEWS2_VALID_BASE_INPUTS,
} from '../data/testHelpers/pr1TestFixtures';

describe('news2Calculator', () => {
  it('scores respiratory rate per RCP bands', () => {
    expect(scoreRespiratoryRate(7)).toBe(3);
    expect(scoreRespiratoryRate(10)).toBe(1);
    expect(scoreRespiratoryRate(16)).toBe(0);
    expect(scoreRespiratoryRate(22)).toBe(2);
    expect(scoreRespiratoryRate(28)).toBe(3);
  });

  it('scores SpO2 Scale 1', () => {
    expect(scoreSpo2Scale1(90)).toBe(3);
    expect(scoreSpo2Scale1(92)).toBe(2);
    expect(scoreSpo2Scale1(94)).toBe(1);
    expect(scoreSpo2Scale1(98)).toBe(0);
  });

  it('scores SpO2 Scale 2 with air vs oxygen for high saturations', () => {
    expect(scoreSpo2Scale2(90, false)).toBe(0);
    expect(scoreSpo2Scale2(96, false)).toBe(0);
    expect(scoreSpo2Scale2(96, true)).toBe(2);
    expect(scoreSpo2Scale2(98, true)).toBe(3);
    expect(scoreSpo2Scale2(82, true)).toBe(3);
  });

  it('scores supplemental oxygen row', () => {
    expect(scoreSupplementalOxygen(false)).toBe(0);
    expect(scoreSupplementalOxygen(true)).toBe(2);
  });

  it('scores systolic BP, pulse, temperature', () => {
    expect(scoreSystolicBp(88)).toBe(3);
    expect(scoreSystolicBp(120)).toBe(0);
    expect(scoreSystolicBp(225)).toBe(3);
    expect(scorePulse(38)).toBe(3);
    expect(scorePulse(75)).toBe(0);
    expect(scorePulse(125)).toBe(2);
    expect(scoreTemperature(34.5)).toBe(3);
    expect(scoreTemperature(37.0)).toBe(0);
    expect(scoreTemperature(39.5)).toBe(2);
  });

  it('computes aggregate NEWS2 for stable vitals on Scale 1 air', () => {
    const b = computeNews2Breakdown({
      respiratoryRate: 16,
      spo2: 98,
      spo2Scale: '1',
      supplementalOxygen: false,
      systolicBp: 120,
      pulse: 72,
      newConfusion: false,
      temperature: 36.8,
    });
    expect(b.respiratoryRate).toBe(0);
    expect(b.spo2).toBe(0);
    expect(b.supplementalOxygen).toBe(0);
    expect(b.consciousness).toBe(0);
    expect(sumNews2Score(b)).toBe(0);
    const interp = interpretNews2Risk(0, b);
    expect(interp.riskBand).toBe('low');
  });

  it('detects single red score when aggregate below 5', () => {
    const b = computeNews2Breakdown({
      respiratoryRate: 6,
      spo2: 98,
      spo2Scale: '1',
      supplementalOxygen: false,
      systolicBp: 120,
      pulse: 72,
      newConfusion: false,
      temperature: 36.8,
    });
    expect(b.respiratoryRate).toBe(3);
    const total = sumNews2Score(b);
    expect(total).toBe(3);
    const interp = interpretNews2Risk(total, b);
    expect(interp.riskBand).toBe('low_medium_red');
    expect(interp.hasRed).toBe(true);
  });

  it('classifies medium and high aggregate bands', () => {
    const low = interpretNews2Risk(4, {
      respiratoryRate: 0,
      spo2: 0,
      supplementalOxygen: 0,
      systolicBp: 0,
      pulse: 0,
      consciousness: 0,
      temperature: 1,
    });
    expect(low.riskBand).toBe('low');

    const med = interpretNews2Risk(5, {
      respiratoryRate: 0,
      spo2: 0,
      supplementalOxygen: 2,
      systolicBp: 0,
      pulse: 0,
      consciousness: 0,
      temperature: 1,
    });
    expect(med.riskBand).toBe('medium');

    const high = interpretNews2Risk(7, {
      respiratoryRate: 0,
      spo2: 0,
      supplementalOxygen: 2,
      systolicBp: 0,
      pulse: 0,
      consciousness: 0,
      temperature: 2,
    });
    expect(high.riskBand).toBe('high');
  });

  it('validates required fields and ranges', () => {
    const bad = validateNews2Inputs({
      respiratoryRate: '',
      spo2: '95',
      spo2Scale: '1',
      supplementalOxygen: false,
      systolicBp: '120',
      pulse: '70',
      newConfusion: false,
      temperature: '37',
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);

    expect(
      validateNews2Inputs({ ...NEWS2_VALID_BASE_INPUTS, spo2Scale: '2', supplementalOxygen: true })
        .ok,
    ).toBe(true);
  });

  it('changes SpO₂ sub-score when switching between Scale 1 and Scale 2 at the same saturation', () => {
    const base = NEWS2_SCALE_SWITCH_FIXTURE;
    const b1 = computeNews2Breakdown({ ...base, spo2Scale: '1' });
    const b2 = computeNews2Breakdown({ ...base, spo2Scale: '2' });
    expect(b1.spo2ScaleUsed).toBe('1');
    expect(b2.spo2ScaleUsed).toBe('2');
    expect(b1.spo2).toBe(scoreSpo2Scale1(base.spo2));
    expect(b2.spo2).toBe(scoreSpo2Scale2(base.spo2, true));
    expect(b1.spo2).not.toBe(b2.spo2);
  });

  it('Scale 2 room air vs O₂ at SpO₂ 93% increases spo2 sub-score on oxygen', () => {
    const base = NEWS2_SCALE2_SPO2_EDGE;
    const roomAir = computeNews2Breakdown({ ...base, spo2Scale: '2', supplementalOxygen: false });
    const onO2 = computeNews2Breakdown({ ...base, spo2Scale: '2', supplementalOxygen: true });
    if (roomAir.spo2 == null) throw new Error('expected roomAir.spo2 to be defined');
    expect(onO2.spo2).toBeGreaterThan(roomAir.spo2);
  });

  it('interpretNews2Risk applies aggregate 5–6 as medium and ≥7 as high severity', () => {
    const noRed = {
      respiratoryRate: 2,
      spo2: 2,
      supplementalOxygen: 2,
      systolicBp: 0,
      pulse: 0,
      consciousness: 0,
      temperature: 0,
      spo2ScaleUsed: '1',
    };
    const at5 = interpretNews2Risk(5, noRed);
    expect(at5.riskBand).toBe('medium');
    expect(at5.severity).toBe('warning');

    const at6 = interpretNews2Risk(6, noRed);
    expect(at6.riskBand).toBe('medium');
    expect(at6.severity).toBe('warning');

    const at7 = interpretNews2Risk(7, {
      respiratoryRate: 3,
      spo2: 2,
      supplementalOxygen: 2,
      systolicBp: 0,
      pulse: 0,
      consciousness: 0,
      temperature: 0,
      spo2ScaleUsed: '1',
    });
    expect(at7.riskBand).toBe('high');
    expect(at7.severity).toBe('critical');
  });

  it('scoreConsciousness matches NEWS2 ACVPU row (3 vs 0)', () => {
    expect(scoreConsciousness(false)).toBe(0);
    expect(scoreConsciousness(true)).toBe(3);
  });

  it('sumNews2Score returns null when any component is null', () => {
    expect(
      sumNews2Score({
        respiratoryRate: null,
        spo2: 0,
        supplementalOxygen: 0,
        systolicBp: 0,
        pulse: 0,
        consciousness: 0,
        temperature: 0,
      }),
    ).toBeNull();
  });

  it('validateNews2Inputs flags each out-of-range field independently', () => {
    const rr = validateNews2Inputs({
      respiratoryRate: '61',
      spo2: '96',
      spo2Scale: '1',
      supplementalOxygen: false,
      systolicBp: '120',
      pulse: '72',
      newConfusion: false,
      temperature: '37',
    });
    expect(rr.ok).toBe(false);
    expect(rr.errors.some((e) => /respiratory/i.test(e))).toBe(true);

    const spo2Low = validateNews2Inputs({
      respiratoryRate: '16',
      spo2: '69',
      spo2Scale: '1',
      supplementalOxygen: false,
      systolicBp: '120',
      pulse: '72',
      newConfusion: false,
      temperature: '37',
    });
    expect(spo2Low.ok).toBe(false);
    expect(spo2Low.errors.some((e) => /spo/i.test(e))).toBe(true);

    const badScale = validateNews2Inputs({
      respiratoryRate: '16',
      spo2: '96',
      spo2Scale: '3',
      supplementalOxygen: false,
      systolicBp: '120',
      pulse: '72',
      newConfusion: false,
      temperature: '37',
    });
    expect(badScale.ok).toBe(false);
    expect(badScale.errors.some((e) => /scale/i.test(e))).toBe(true);
  });
});
