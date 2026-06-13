import { beforeEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from './emergencyStore';

describe('Emergency OS scenario store wiring', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useEmergencyStore.getState().setActiveScenario('normal-day');
  });

  it('switches the active store to EMS surge data', () => {
    useEmergencyStore.getState().setActiveScenario('ems-surge');

    const state = useEmergencyStore.getState();
    expect(state.activeScenarioId).toBe('ems-surge');
    expect(state.activeScenario.label).toBe('EMS surge');
    expect(state.patients.some((patient) => patient.priority === 'P1')).toBe(true);
    expect(state.emsArrivals.filter((arrival) => arrival.status === 'Inbound').length).toBeGreaterThan(1);
    expect(state.queues.some((queue) => queue.label === 'Reassessment' && queue.count > 0)).toBe(true);
    expect(state.scenarioData.copilotContext.emsInboundCount).toBeGreaterThan(1);
  });

  it('switches capacity and boarding context for capacity red', () => {
    useEmergencyStore.getState().setActiveScenario('capacity-red');

    const state = useEmergencyStore.getState();
    expect(state.capacity.band).toBe('Red');
    expect(state.capacity.boardingCount).toBeGreaterThan(0);
    expect(state.scenarioData.boarding.patients.length).toBeGreaterThan(0);
    expect(state.alerts.some((alert) => /capacity red/i.test(alert.title))).toBe(true);
  });

  it('persists the selected scenario id for reloads', () => {
    useEmergencyStore.getState().setActiveScenario('provincial-data-conflict');

    expect(window.localStorage.getItem('caredroid.edScenarioId')).toBe('provincial-data-conflict');
  });
});
