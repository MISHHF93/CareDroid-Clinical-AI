import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  appendPatientWorkflowContext,
  resolveNextWorkflowRouteForPatient,
  resolvePatientWorkflowRoute,
} from './patientWorkflowNavigation';

function patient(patch: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-nav-1',
    mrn: 'MRN-1',
    firstName: 'Sam',
    lastName: 'Lee',
    dob: '1990-01-01',
    age: 36,
    sex: 'M',
    state: PatientState.Triage,
    priority: Priority.P3,
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'GI',
    flags: [],
    vitals: [],
    notes: [],
    timeline: [],
    ...patch,
  } as Patient;
}

describe('patientWorkflowNavigation', () => {
  it('appends patient and encounter context without clobbering existing query params', () => {
    expect(
      appendPatientWorkflowContext('/emergency/queues?queue=pretriage', {
        patientId: 'patient-nav-1',
        encounterId: 'enc-9',
      }),
    ).toBe('/emergency/queues?queue=pretriage&patient=patient-nav-1&encounter=enc-9');
  });

  it('resolves canonical workflow routes with patient context', () => {
    const route = resolvePatientWorkflowRoute(patient());
    expect(route).toContain('patient=patient-nav-1');
    expect(route).toContain('/emergency/queues');
  });

  it('resolves the next legal workflow route for advancement', () => {
    const nextRoute = resolveNextWorkflowRouteForPatient(patient());
    expect(nextRoute).toContain('patient=patient-nav-1');
    expect(nextRoute).toMatch(/queues|whiteboard/);
  });
});
