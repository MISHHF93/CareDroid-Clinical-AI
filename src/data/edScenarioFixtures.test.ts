import { describe, expect, it } from 'vitest';
import {
  ED_SCENARIO_DEMO_MODES,
  buildEdScenarioFixture,
  buildEmergencyScenarioModuleEnvelope,
  buildRootEmergencyScenarioState,
  buildSrcEmergencyScenarioState,
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

  // emergencyStore.ts's very first store-creation call reads
  // buildSrcEmergencyScenarioState(...).emsUnits directly with no fallback
  // (the `|| SEED_EMS_UNITS` fallback that used to mask this was removed as
  // part of the fixture-consolidation cleanup, on the stated assumption that
  // this function "always populate[s] every one of these fields... never
  // undefined/null"). buildEdScenarioFixture DOES compute a real emsUnits
  // array (derived from emsArrivals), but this wrapper's own return object
  // never forwarded it -- only emsArrivals. That left store.emsUnits
  // permanently undefined from the moment the app boots, which crashed
  // careDroidCentralNode.ts's buildCareDroidCentralNodeSnapshot
  // (`source.emsUnits.filter(...)`) on first render, taking down
  // NotificationShellProvider and the whole app via the top-level
  // ErrorBoundary -- confirmed live via Playwright on every fresh
  // /emergency/reception load, 100% reproducible, before this fix.
  it('forwards a real emsUnits array from buildSrcEmergencyScenarioState (regression)', () => {
    REQUESTED_SCENARIO_IDS.forEach((id) => {
      const state = buildSrcEmergencyScenarioState(id);
      expect(Array.isArray(state.emsUnits)).toBe(true);
      expect(state.emsUnits.length).toBeGreaterThan(0);
    });
  });

  // Same regression class as above: emergencyStore.ts also reads
  // buildSrcEmergencyScenarioState(...).referrals and .activeShift with no
  // fallback. buildEdScenarioFixture never computed either field at all (not
  // even internally, unlike emsUnits), so both were undefined from boot.
  // referrals-undefined crashed careDroidCentralNode.ts's buildQueueHealth
  // (`source.referrals.filter(...)`) the moment the emsUnits crash above was
  // fixed; activeShift-undefined broke every escalation/shift-handoff store
  // action that reads state.activeShift.chargeStaffId (confirmed via
  // emergencyStore.workflowActions.test.ts failing 6 tests pre-fix). Default
  // shapes mirror buildRootEmergencyScenarioState's own equivalent fallback
  // a few dozen lines down in this same file.
  it('provides real referrals and activeShift defaults from buildSrcEmergencyScenarioState (regression)', () => {
    REQUESTED_SCENARIO_IDS.forEach((id) => {
      const state = buildSrcEmergencyScenarioState(id);
      expect(Array.isArray(state.referrals)).toBe(true);
      expect(state.activeShift).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          status: 'Active',
          chargeStaffId: expect.any(String),
          staffIds: expect.arrayContaining([expect.any(String)]),
        })
      );
      // ActiveShift (types/emergency.ts) declares `label`, not `name` -- a
      // real regression slipped this exact field-name mismatch in once
      // already (caught before commit); shiftSummaryData.ts and
      // emergencyStore.ts's own shift-summary builder both read
      // `.activeShift.label` and would silently render a blank shift name
      // with the wrong field.
      expect(typeof state.activeShift.label).toBe('string');
      expect(state.activeShift.label.length).toBeGreaterThan(0);
      expect((state.activeShift as any).name).toBeUndefined();
      expect(state.staff.some((member: any) => member.id === state.activeShift.chargeStaffId)).toBe(true);
    });
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
