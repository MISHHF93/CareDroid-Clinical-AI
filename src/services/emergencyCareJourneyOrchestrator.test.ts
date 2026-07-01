import { beforeEach, describe, expect, it } from 'vitest';
import { createEmergencyCall } from './dispatchIntakeService';
import { cadDispatchUnit } from './cadIntegrationService';
import {
  getActiveTraces,
  getTraceByCallId,
  getJourneyMetrics,
} from './emergencySignalService';
import {
  onEmsUnitDispatched,
  onHospitalPreAlert,
  onEmergencyCallLogged,
  resolveLinkedCallIdForEmsArrival,
} from './emergencyCareJourneyOrchestrator';
import { useEmergencyStore } from '../store/emergencyStore';

describe('emergencyCareJourneyOrchestrator', () => {
  beforeEach(() => {
    useEmergencyStore.setState({ emsArrivals: [] });
    onEmergencyCallLogged(
      createEmergencyCall({
        chiefComplaint: 'Chest pain',
        address: '100 Main St',
        dispatcherId: 'dispatcher-1',
        dispatcherName: 'Dispatcher',
        patientConscious: true,
        patientBreathing: true,
      }),
    );
  });

  it('chains dispatch through EMS arrival and hospital pre-alert', () => {
    const call = createEmergencyCall({
      chiefComplaint: 'Stroke symptoms',
      address: '200 Oak Ave',
      dispatcherId: 'dispatcher-1',
      dispatcherName: 'Dispatcher',
    });

    const assignment = cadDispatchUnit({
      callId: call.id,
      dispatchedBy: 'dispatcher-1',
      priority: 'Delta',
      requiresALS: true,
    });
    expect('error' in assignment).toBe(false);
    if ('error' in assignment) return;

    const { emsArrival, trace } = onEmsUnitDispatched(call, assignment);
    expect(emsArrival.id).toBe(`ems-${call.id}`);
    expect(useEmergencyStore.getState().emsArrivals.some((entry) => entry.id === emsArrival.id)).toBe(true);

    const updated = onHospitalPreAlert(call.id, emsArrival.id);
    expect(updated?.currentStage).toBe('ed_readiness_activated');
    expect(trace?.signals.some((signal) => signal.stage === 'ems_dispatched')).toBe(true);
    expect(getActiveTraces().length).toBeGreaterThan(0);
    expect(getJourneyMetrics().activeJourneys).toBeGreaterThan(0);
  });

  it('resolves linked call id from CAD-created EMS arrivals', () => {
    const call = createEmergencyCall({
      chiefComplaint: 'Fall',
      address: '1 Clinic Rd',
      dispatcherId: 'dispatcher-1',
      dispatcherName: 'Dispatcher',
    });
    expect(resolveLinkedCallIdForEmsArrival({ id: `ems-${call.id}` } as any)).toBe(call.id);
    onEmergencyCallLogged(call);
    expect(getTraceByCallId(call.id)?.callId).toBe(call.id);
  });
});