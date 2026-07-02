import { afterEach, describe, expect, it, vi } from 'vitest';
import { setPlatformEntitlementContext } from '../data/assetEntitlements';
import { runAdministrativeAutomationTick } from './administrativeAutomationEngine';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';

vi.mock('../services/enrichAdministrativeAutomationsWithAi', () => ({
  enrichAdministrativeAutomationSnapshotWithAi: vi.fn(async (snapshot) => snapshot),
}));

describe('administrativeAutomationEngine entitlement filtering', () => {
  afterEach(() => {
    setPlatformEntitlementContext(null);
    useEmergencyStore.setState({
      patients: [],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      administrativeAutomationQueue: [],
    } as never);
  });

  it('drops routing tasks when strict entitlements exclude the mapped clinical agent', async () => {
    const patient = {
      id: 'p-reg',
      mrn: 'MRN-1',
      firstName: 'Alex',
      lastName: 'Kim',
      age: 44,
      sex: 'M',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Abdominal pain',
      flags: [],
      notes: [],
      timeline: [],
    } as Patient;

    useEmergencyStore.setState({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      administrativeAutomationQueue: [],
    } as never);

    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: ['calculators'],
      strictSaasEntitlements: true,
    });

    await runAdministrativeAutomationTick(new Date('2026-07-01T12:00:00.000Z'));

    const queue = useEmergencyStore.getState().administrativeAutomationQueue;
    expect(queue.some((task) => task.category === 'patient_routing')).toBe(false);
  });

  it('keeps routing tasks when mapped operations agent asset is entitled', async () => {
    const patient = {
      id: 'p-reg-2',
      mrn: 'MRN-2',
      firstName: 'Riley',
      lastName: 'Ng',
      age: 33,
      sex: 'F',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Headache',
      flags: [],
      notes: [],
      timeline: [],
    } as Patient;

    useEmergencyStore.setState({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      administrativeAutomationQueue: [],
    } as never);

    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: ['agent-operations'],
      strictSaasEntitlements: true,
    });

    await runAdministrativeAutomationTick(new Date('2026-07-01T12:00:00.000Z'));

    const queue = useEmergencyStore.getState().administrativeAutomationQueue;
    expect(queue.some((task) => task.automationId === 'emergency-queue-routing-assistant')).toBe(true);
  });
});