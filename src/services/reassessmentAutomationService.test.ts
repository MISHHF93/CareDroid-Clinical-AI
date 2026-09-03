import { describe, expect, it } from 'vitest';
import ReassessmentAutomationService, {
  REASSESSMENT_INTELLIGENCE_THRESHOLDS,
} from './reassessmentAutomationService';

describe('ReassessmentAutomationService', () => {
  it('creates a Reassessment Queue from waiting duration, risk changes, abnormal vitals, and intervals', () => {
    const queue = ReassessmentAutomationService.getReassessmentQueue();

    expect(queue).toEqual(
      expect.objectContaining({
        id: 'ReassessmentQueue',
        label: 'Reassessment Queue',
        thresholds: REASSESSMENT_INTELLIGENCE_THRESHOLDS,
        preventionGoal: expect.stringMatching(/Prevent forgotten patients/i),
        items: expect.arrayContaining([
          expect.objectContaining({
            patientId: 'ED-1001',
            status: 'Needs Reassessment',
            thresholdSignals: expect.arrayContaining([
              expect.stringMatching(/waiting duration/i),
              expect.stringMatching(/risk score changed/i),
              expect.stringMatching(/abnormal vitals/i),
              expect.stringMatching(/reassessment interval/i),
            ]),
            alert: expect.objectContaining({
              label: 'Needs Reassessment',
              generatedFrom: 'Reassessment Intelligence',
            }),
          }),
        ]),
      }),
    );
  });

  it('generates alerts and metrics for patients exceeding thresholds', () => {
    const dashboard = ReassessmentAutomationService.getDashboard();

    expect(dashboard).toEqual(
      expect.objectContaining({
        engineId: 'reassessment-intelligence',
        title: 'Reassessment Intelligence',
        alerts: expect.arrayContaining([
          expect.objectContaining({
            label: 'Needs Reassessment',
            severity: expect.stringMatching(/critical|urgent/),
          }),
        ]),
        metrics: expect.objectContaining({
          total: expect.any(Number),
          abnormalVitals: expect.any(Number),
          riskScoreChanges: expect.any(Number),
          reassessmentIntervalsExceeded: expect.any(Number),
        }),
      }),
    );
  });
});
