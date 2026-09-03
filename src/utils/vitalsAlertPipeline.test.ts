import { describe, expect, it } from 'vitest';
import { evaluateVitalsAlerts, formatActiveVitalsForCopilot } from './vitalsAlertPipeline';

describe('vitalsAlertPipeline', () => {
  it('classifies critical, warning, and watch vitals', () => {
    expect(evaluateVitalsAlerts({ spo2: 85 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'critical', vital: 'SpO2' })]),
    );
    expect(evaluateVitalsAlerts({ hr: 130 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'warning', vital: 'HR' })]),
    );
    expect(evaluateVitalsAlerts({ spo2: 95 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'watch', vital: 'SpO2' })]),
    );
  });

  it('flags an extremely high SBP as critical, not silently unflagged (HEAL-237)', () => {
    // Symmetric to the existing HR critical check (< 40 || > 150) -- SBP's
    // critical branch previously only covered the low end, so a
    // hypertensive-emergency reading or a fat-finger typo (e.g. "1800"
    // for "180") produced zero alert no matter how extreme.
    expect(evaluateVitalsAlerts({ bpSystolic: 220 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'critical', vital: 'SBP' })]),
    );
    expect(evaluateVitalsAlerts({ bpSystolic: 1800 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'critical', vital: 'SBP' })]),
    );
  });

  it('detects GCS drops of two or more points', () => {
    expect(evaluateVitalsAlerts({ gcs: 12 }, { gcs: 15 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'critical',
          vital: 'GCS',
          reason: expect.stringMatching(/deteriorating neuro/i),
        }),
      ]),
    );
  });

  it('formats active critical and warning vitals for Copilot', () => {
    const lines = formatActiveVitalsForCopilot([
      {
        firstName: 'Test',
        lastName: 'Patient',
        roomId: 'Bed 4',
        vitalsAlerts: [
          {
            status: 'active',
            severity: 'critical',
            vital: 'SpO2',
            value: 86,
            unit: '%',
          },
        ],
      },
    ]);

    expect(lines[0]).toMatch(/ALERT: Test Patient Bed 4 has critical vitals: SpO2 86%/);
  });
});
