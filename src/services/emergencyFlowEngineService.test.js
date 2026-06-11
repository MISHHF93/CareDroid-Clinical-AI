import { describe, expect, it } from 'vitest';
import EmergencyFlowEngineService, {
  EMERGENCY_FLOW_ENGINE_STAGES,
  getEmergencyFlowEngine,
} from './emergencyFlowEngineService';

describe('EmergencyFlowEngineService', () => {
  it('monitors the core Emergency flow stages', () => {
    const engine = getEmergencyFlowEngine();

    expect(engine).toEqual(
      expect.objectContaining({
        engineId: 'emergency-flow-engine',
        title: 'Emergency Flow Engine',
        route: '/workspace/emergency/flow',
        monitoredStages: EMERGENCY_FLOW_ENGINE_STAGES,
        detectionTypes: [
          'stalled patients',
          'delayed referrals',
          'delayed reassessments',
          'excessive wait times',
          'boarding pressure',
        ],
      })
    );
    expect(engine.monitoredStages.map((stage) => stage.label)).toEqual([
      'Arrival',
      'Triage',
      'Waiting',
      'Assessment',
      'Orders',
      'Results',
      'Disposition',
    ]);
  });

  it('detects flow problems and generates staff-facing next recommended actions', () => {
    const engine = EmergencyFlowEngineService.getFlowEngine();

    expect(engine.detections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'stalled patients' }),
        expect.objectContaining({ type: 'delayed referrals' }),
        expect.objectContaining({ type: 'delayed reassessments' }),
        expect.objectContaining({ type: 'excessive wait times' }),
        expect.objectContaining({ type: 'boarding pressure' }),
      ])
    );
    expect(engine.nextRecommendedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          action: expect.any(String),
          reason: expect.any(String),
          severity: expect.stringMatching(/critical|high|medium|watch/),
        }),
      ])
    );
    expect(engine.metrics).toEqual(
      expect.objectContaining({
        monitoredStages: 7,
        activeDetections: expect.any(Number),
        delayedReferrals: expect.any(Number),
        delayedReassessments: expect.any(Number),
        boardingPressure: expect.any(Number),
      })
    );
  });
});
