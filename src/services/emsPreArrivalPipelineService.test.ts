import { describe, expect, it } from 'vitest';
import EmsPreArrivalPipelineService, {
  EMS_HANDOFF_STATUSES,
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
    const lastWorkflowStep = EmsPreArrivalPipelineService.getWorkflow().at(-1);
    if (!lastWorkflowStep) throw new Error('expected last workflow step to be defined');
    expect(lastWorkflowStep.id).toBe('arrival');
  });

  it('sorts incoming patients by risk and ETA with structured handoff context', () => {
    const patients = getIncomingPatients();

    expect(patients[0]).toEqual(
      expect.objectContaining({
        riskLevel: 'critical',
        etaMinutes: expect.any(Number),
        handoffStatus: expect.stringMatching(/Incoming|En Route|Arriving|Arrived/),
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
        riskIndicators: expect.arrayContaining([expect.any(String)]),
        handoffSummary: expect.stringMatching(/inbound/i),
        edHandoffSummary: expect.objectContaining({
          title: 'ED Handoff Summary',
          attachedToPatientJourney: true,
          journeyAttachment: expect.objectContaining({
            label: 'EMS handoff attached before arrival',
          }),
        }),
      }),
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
        statusCounts: expect.objectContaining({
          Incoming: expect.any(Number),
          'En Route': expect.any(Number),
          Arriving: expect.any(Number),
          Arrived: expect.any(Number),
        }),
        nextArrival: expect.objectContaining({
          etaMinutes: 4,
        }),
      }),
    );
    expect(metrics).toEqual(
      expect.objectContaining({
        incomingCount: 3,
        nextEtaMinutes: 4,
        handoffReadyCount: 3,
        whiteboardVisibleCount: 3,
        journeyAttachmentCount: 3,
      }),
    );
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: expect.stringMatching(/before arrival/i),
        }),
      ]),
    );
  });

  it('returns a dashboard payload that ED can use before arrival', () => {
    const dashboard = getPreArrivalDashboard();

    expect(dashboard).toEqual(
      expect.objectContaining({
        pipelineId: 'ems-handoff-pipeline',
        inputSchema: ['complaint', 'vitals', 'ETA', 'risk indicators'],
        statuses: EMS_HANDOFF_STATUSES,
        output: 'ED Handoff Summary',
        workflow: expect.any(Array),
        queue: expect.objectContaining({
          incomingPatients: expect.arrayContaining([
            expect.objectContaining({
              etaMinutes: expect.any(Number),
              handoffStatus: expect.any(String),
              riskScoreBundle: expect.any(Array),
              riskIndicators: expect.any(Array),
              handoffSummary: expect.any(String),
              edHandoffSummary: expect.objectContaining({
                title: 'ED Handoff Summary',
                attachedToPatientJourney: true,
              }),
            }),
          ]),
        }),
        edHandoffSummaries: expect.arrayContaining([
          expect.objectContaining({
            title: 'ED Handoff Summary',
            attachedToPatientJourney: true,
          }),
        ]),
        safetyStatement: expect.stringMatching(/pre-arrival context/i),
      }),
    );
  });
});
