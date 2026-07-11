import { describe, expect, it } from 'vitest';
import {
  ED_SCENARIO_DEMO_MODES,
  buildEdScenarioFixture,
  buildEmergencyScenarioModuleEnvelope,
  buildRootEmergencyScenarioState,
} from './edScenarioFixtures';
import { FIRST_CUSTOMER_DEMO_MODE } from './firstCustomerDemoMode';

const REQUESTED_SCENARIO_IDS = [
  'normal-day',
  'high-volume-day',
  'ems-surge',
  'boarding-crisis',
  'reassessment-backlog',
  'capacity-red',
  'multiple-high-risk-waiting',
  FIRST_CUSTOMER_DEMO_MODE.id,
  'unknown-patient-intake',
  'provincial-data-conflict',
];

describe('ED scenario fixtures', () => {
  it('defines the requested scenario catalog', () => {
    expect(ED_SCENARIO_DEMO_MODES.map((scenario) => scenario.id)).toEqual(
      expect.arrayContaining(REQUESTED_SCENARIO_IDS)
    );
  });

  it('populates every active CareDroid surface for each scenario', () => {
    REQUESTED_SCENARIO_IDS.forEach((id) => {
      const fixture = buildEdScenarioFixture(id, { now: new Date('2026-06-13T09:00:00-04:00') });

      expect(fixture.patients.length).toBeGreaterThan(0);
      expect(fixture.rooms.length).toBeGreaterThan(0);
      expect(fixture.queues.length).toBeGreaterThan(0);
      expect(fixture.emsArrivals.length).toBeGreaterThan(0);
      expect(fixture.capacity.score).toBeGreaterThanOrEqual(0);
      expect(fixture.capacity.band).toMatch(/Green|Yellow|Orange|Red/);
      expect(fixture.boarding).toEqual(expect.objectContaining({ patients: expect.any(Array) }));
      expect(fixture.reassessment).toEqual(expect.objectContaining({ patients: expect.any(Array) }));
      expect(fixture.analytics.operationalCommand.dailyVolume.length).toBe(7);
      expect(fixture.analytics.operationalCommand.hourlyArrivals.length).toBe(24);
      expect(fixture.copilotContext).toEqual(
        expect.objectContaining({
          scenarioId: id,
          patientCount: fixture.patients.length,
          capacity: fixture.capacity,
        })
      );
    });
  });

  it('exposes module envelopes consumed by CareDroid hooks', () => {
    const capacityEnvelope = buildEmergencyScenarioModuleEnvelope('capacity', 'capacity-red');
    const queuesEnvelope = buildEmergencyScenarioModuleEnvelope('queues', 'capacity-red');
    const copilotEnvelope = buildEmergencyScenarioModuleEnvelope('copilot', 'capacity-red');

    expect(capacityEnvelope.source).toBe('scenario-fixture');
    expect(capacityEnvelope.data.capacity.band).toBe('Red');
    expect(queuesEnvelope.data.queues.some((queue) => queue.label === 'Reassessment')).toBe(true);
    expect(copilotEnvelope.data.promptContext.scenarioLabel).toBe('Capacity red');
  });

  it('loads First Customer Demo Mode across walkthrough surfaces', () => {
    const fixture = buildEdScenarioFixture(FIRST_CUSTOMER_DEMO_MODE.id, {
      now: new Date('2026-06-13T09:00:00-04:00'),
    });
    const whiteboard = buildEmergencyScenarioModuleEnvelope('whiteboard', FIRST_CUSTOMER_DEMO_MODE.id);
    const queues = buildEmergencyScenarioModuleEnvelope('queues', FIRST_CUSTOMER_DEMO_MODE.id);
    const copilot = buildEmergencyScenarioModuleEnvelope('copilot', FIRST_CUSTOMER_DEMO_MODE.id);
    const analytics = buildEmergencyScenarioModuleEnvelope('analytics', FIRST_CUSTOMER_DEMO_MODE.id);
    const rootState = buildRootEmergencyScenarioState(FIRST_CUSTOMER_DEMO_MODE.id);

    expect((fixture as unknown as { patientVolumePerDay: number }).patientVolumePerDay).toBe(100);
    expect(fixture.patients).toHaveLength(18);
    expect(fixture.patients.filter((patient) => patient.state === 'Waiting').length).toBeGreaterThanOrEqual(4);
    expect(
      fixture.patients.filter(
        (patient) =>
          patient.state === 'Waiting' &&
          (patient.priority === 'P1' || patient.priority === 'P2' || patient.flags.includes('HighRisk'))
      ).length
    ).toBeGreaterThanOrEqual(2);
    expect(fixture.reassessment.patients.length).toBeGreaterThanOrEqual(3);
    expect(fixture.boarding.patients.length).toBeGreaterThanOrEqual(3);
    expect(fixture.emsArrivals.filter((arrival) => arrival.status === 'Inbound').length).toBeGreaterThanOrEqual(2);
    expect(fixture.capacity.band).toMatch(/Orange|Red/);

    expect(whiteboard.data.patients).toHaveLength(18);
    expect(queues.data.queues.some((queue) => queue.label === 'High-risk waiting patients')).toBe(true);
    expect(copilot.data.promptContext).toEqual(
      expect.objectContaining({
        patientCount: 18,
        emsInboundCount: expect.any(Number),
        safetyBoundary: expect.stringMatching(/Walkthrough data only/i),
      })
    );
    expect(analytics.data.operationalCommand.dailyVolume.at(-1).count).toBe(100);
    expect(rootState.patients).toHaveLength(100);
    expect(rootState.emergencySettings!.demoMode).toEqual(
      expect.objectContaining({
        active: true,
        id: FIRST_CUSTOMER_DEMO_MODE.id,
        patientVolumePerDay: 100,
      })
    );
  });

  it('models unknown intake and provincial conflict explicitly', () => {
    const unknown = buildEdScenarioFixture('unknown-patient-intake');
    const conflict = buildEdScenarioFixture('provincial-data-conflict');

    expect(unknown.unknownIntake).toEqual(
      expect.objectContaining({ active: true, temporaryMrn: expect.stringMatching(/^TEMP-/) })
    );
    expect(unknown.patients.some((patient) => patient.flags.includes('EMSArrival'))).toBe(true);
    expect(conflict.provincialHealth.connectorStatus).toBe('conflict-review');
    expect(conflict.provincialHealth.records.some((record) => record.conflict)).toBe(true);
    expect(conflict.copilotContext.dataConflictCount).toBeGreaterThan(0);
  });
});
