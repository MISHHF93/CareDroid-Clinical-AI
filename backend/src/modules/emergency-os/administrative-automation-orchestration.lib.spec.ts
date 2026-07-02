import { PatientState, Priority, type Patient } from '../../../../src/types/emergency';
import { buildBackendEnrichedAdministrativeAutomationSnapshot } from './administrative-automation-orchestration.lib';

describe('administrative-automation-orchestration.lib', () => {
  it('builds all automation categories with AI decision payloads', async () => {
    const patient = {
      id: 'p-backend',
      mrn: 'MRN-B1',
      firstName: 'Sam',
      lastName: 'Rivera',
      age: 52,
      sex: 'M',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Chest pain',
      vitals: [{ sbp: 88, hr: 118, spo2: 91, pain: 7, recordedAt: new Date().toISOString() }],
      flags: [],
      notes: [],
      timeline: [],
    } as Patient;

    const snapshot = await buildBackendEnrichedAdministrativeAutomationSnapshot({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      existingTasks: [],
      entitlementContext: {
        strictEntitlements: false,
        entitledAssetIds: ['agent-clinical', 'agent-operations'],
      },
    });

    const categories = new Set(snapshot.tasks.map((task) => task.category));
    expect(categories.has('patient_routing')).toBe(true);

    const routingTask = snapshot.tasks.find((task) => task.category === 'patient_routing');
    const aiDecision = routingTask?.proposedPayload.aiDecision as { requiresClinicianReview?: boolean } | undefined;
    expect(aiDecision).toBeTruthy();
    expect(aiDecision?.requiresClinicianReview).toBe(true);
  });

  it('filters routing tasks when strict entitlements exclude mapped operations asset', async () => {
    const patient = {
      id: 'p-filter',
      mrn: 'MRN-B2',
      firstName: 'Alex',
      lastName: 'Nguyen',
      age: 40,
      sex: 'F',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Abdominal pain',
      flags: [],
      notes: [],
      timeline: [],
    } as Patient;

    const snapshot = await buildBackendEnrichedAdministrativeAutomationSnapshot({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      existingTasks: [],
      entitlementContext: {
        strictEntitlements: true,
        entitledAssetIds: ['calculators'],
      },
    });

    expect(snapshot.tasks.some((task) => task.category === 'patient_routing')).toBe(false);
  });
});