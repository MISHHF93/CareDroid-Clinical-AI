import { DeteriorationPredictionV3Service } from './deterioration-prediction-v3.service';

describe('DeteriorationPredictionV3Service (HEAL-253)', () => {
  const service = new DeteriorationPredictionV3Service();

  it('scores low SBP as a hypotension risk signal', () => {
    const prediction = service.predict({ vitals: { sbp: 80 } });
    expect(prediction.contributingSignals).toContain('hypotension');
  });

  it('scores an extremely high SBP as a hypertensive-crisis risk signal, not silently unflagged', () => {
    // Symmetric to the existing HR check (>120 || <45) -- SBP's check
    // previously only covered the low end, so a hypertensive-emergency
    // reading or a fat-finger typo (e.g. "1800" for "180") contributed
    // zero deterioration-risk signal no matter how extreme.
    const moderate = service.predict({ vitals: { sbp: 220 } });
    expect(moderate.contributingSignals).toContain('hypertensive-crisis');

    const extreme = service.predict({ vitals: { sbp: 1800 } });
    expect(extreme.contributingSignals).toContain('hypertensive-crisis');
  });

  it('does not flag a normal SBP as either extreme', () => {
    const prediction = service.predict({ vitals: { sbp: 120 } });
    expect(prediction.contributingSignals).not.toContain('hypotension');
    expect(prediction.contributingSignals).not.toContain('hypertensive-crisis');
  });
});
