import { describe, expect, it } from 'vitest';
import { Priority, PatientState, type Patient } from '../types/emergency';
import { buildTriageAssistEnvelope } from '../../lib/patient-orchestration';
import { enrichTriageAssistWithNativeAi } from './nativeAiTriageBridge';

function seedPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p-native-ai-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Patient',
    dob: '1954-01-01',
    age: 72,
    sex: 'M',
    arrivalTime: new Date().toISOString(),
    chiefComplaint: 'Chest pain radiating to left arm',
    complaintCategory: 'Cardiac',
    state: PatientState.Triage,
    priority: Priority.P4,
    vitals: [
      {
        hr: 110,
        sbp: 148,
        spo2: 96,
        timestamp: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
      },
    ],
    flags: [],
    notes: [],
    timeline: [],
    triagePending: true,
    ...overrides,
  };
}

describe('enrichTriageAssistWithNativeAi', () => {
  it('merges native AI rationale and escalates acuity when expert system is more urgent', () => {
    const patient = seedPatient();
    const envelope = buildTriageAssistEnvelope({
      complaintText: patient.chiefComplaint,
      complaintCategory: patient.complaintCategory,
      priority: Priority.P4,
    });

    const enriched = enrichTriageAssistWithNativeAi(envelope, patient);

    expect(enriched.rationale.some((line) => line.includes('Native AI expert system'))).toBe(true);
    expect(enriched.rationale.some((line) => line.includes('Panel-of-experts routing'))).toBe(true);
    expect(enriched.rationale.some((line) => line.includes('Cardiac-Vascular'))).toBe(true);
    expect(['P1', 'P2', 'P3']).toContain(enriched.suggestedPriority);
  });
});
