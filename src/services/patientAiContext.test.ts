import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { buildCopilotPatientArtifactContext } from './patientAiContext';

describe('buildCopilotPatientArtifactContext', () => {
  it('includes demographics and recent notes for copilot source data', () => {
    const patient: Patient = {
      id: 'p1',
      mrn: 'ED-1',
      firstName: 'Sam',
      lastName: 'Lee',
      dob: '1990-01-01',
      age: 35,
      sex: 'F',
      arrivalTime: '2026-06-24T08:00:00.000Z',
      chiefComplaint: 'Abdominal pain',
      complaintCategory: 'Abdominal',
      state: PatientState.Assessment,
      priority: Priority.P3,
      vitals: [{ hr: 92, sbp: 120, recordedAt: '2026-06-24T08:10:00.000Z' }],
      flags: [],
      notes: [
        {
          id: 'n1',
          content: 'Pain worsening after meals',
          createdAt: '2026-06-24T08:12:00.000Z',
          authorStaffId: 's1',
        },
      ],
      timeline: [],
    };

    const context = buildCopilotPatientArtifactContext(patient, null);
    expect(context?.demographics).toEqual({ age: 35, sex: 'F', dob: '1990-01-01' });
    expect(context?.recentNotes).toHaveLength(1);
    expect(context?.recentNotes?.[0]?.content).toContain('Pain worsening');
  });
});