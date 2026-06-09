import { describe, expect, it } from 'vitest';
import EmsPreArrivalPipelineService, {
  EMS_PRE_ARRIVAL_WORKFLOW,
  getIncomingPatients,
  getPreArrivalDashboard,
  getPreArrivalMetrics,
  getPreArrivalQueue,
  getPreArrivalRecommendations,
} from './emsPreArrivalPipelineService';

describe('EmsPreArrivalPipelineService', () => {
  it('defines the EMS to ED pre-arrival workflow in order', () => {
    expect(EMS_PRE_ARRIVAL_WORKFLOW.map((step) => step.label)).toEqual([
      'EMS Assessment',
      'Complaint',
      'Vitals',
      'Risk Profile',
      'ED Notification',
      'Arrival',
    ]);
    expect(EmsPreArrivalPipelineService.getWorkflow().at(-1).id).toBe('arrival');
  });

  it('sorts incoming patients by risk and ETA with structured handoff context', () => {
    const patients = getIncomingPatients();

    expect(patients[0]).toEqual(
      expect.objectContaining({
        riskLevel: 'critical',
        etaMinutes: expect.any(Number),
        complaint: expect.any(String),
        vitals: expect.objectContaining({
          bloodPressure: expect.any(String),
          oxygenSaturation: expect.any(String),
        }),
        riskScoreBundle: expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            riskLevel: expect.any(String),
          }),
        ]),
        handoffSummary: expect.stringMatching(/inbound/i),
      })
    );
  });

  it('builds the pre-arrival queue, metrics, and recommendations', () => {
    const queue = getPreArrivalQueue();
    const metrics = getPreArrivalMetrics();
    const recommendations = getPreArrivalRecommendations();

    expect(queue).toEqual(
      expect.objectContaining({
        id: 'ems-pre-arrival-queue',
        count: 3,
        criticalCount: 2,
        nextArrival: expect.objectContaining({
          etaMinutes: 6,
        }),
      })
    );
    expect(metrics).toEqual(
      expect.objectContaining({
        incomingCount: 3,
        nextEtaMinutes: 6,
        handoffReadyCount: 3,
      })
    );
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: expect.stringMatching(/before arrival/i),
        }),
      ])
    );
  });

  it('returns a dashboard payload that ED can use before arrival', () => {
    const dashboard = getPreArrivalDashboard();

    expect(dashboard).toEqual(
      expect.objectContaining({
        workflow: expect.any(Array),
        queue: expect.objectContaining({
          incomingPatients: expect.arrayContaining([
            expect.objectContaining({
              etaMinutes: expect.any(Number),
              riskScoreBundle: expect.any(Array),
              handoffSummary: expect.any(String),
            }),
          ]),
        }),
        safetyStatement: expect.stringMatching(/pre-arrival context/i),
      })
    );
  });
});
