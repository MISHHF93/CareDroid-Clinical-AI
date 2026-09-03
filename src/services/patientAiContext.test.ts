import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildCopilotPatientArtifactContext,
  scopeCopilotPatientArtifactContextForRole,
} from './patientAiContext';

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
          text: 'Pain worsening after meals',
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

  it('includes native AI routing and specialist inference context', () => {
    const patient: Patient = {
      id: 'p-ai',
      mrn: 'ED-AI',
      firstName: 'Alex',
      lastName: 'Kim',
      dob: '1960-01-01',
      age: 66,
      sex: 'M',
      arrivalTime: '2026-06-24T08:00:00.000Z',
      chiefComplaint: 'Chest pain radiating to left arm',
      complaintCategory: 'Cardiac',
      state: PatientState.Triage,
      priority: Priority.P3,
      vitals: [{ hr: 104, sbp: 88, spo2: 95, recordedAt: '2026-06-24T08:05:00.000Z' }],
      flags: [],
      notes: [],
      timeline: [],
    };

    const context = buildCopilotPatientArtifactContext(patient, null) as any;
    expect(context?.nativeAi?.routing?.specialists).toContain('cardiac_vascular');
    expect(context?.nativeAi?.specialistInferences?.length).toBeGreaterThan(0);
    expect(context?.nativeAi?.admissionMl).toBeTruthy();
  });

  it('includes document artifact summary when patient has artifacts', () => {
    const patient: Patient = {
      id: 'p-doc',
      mrn: 'ED-DOC',
      firstName: 'Riley',
      lastName: 'Ng',
      dob: '1978-02-02',
      age: 48,
      sex: 'M',
      arrivalTime: '2026-06-24T08:00:00.000Z',
      chiefComplaint: 'Chest pain',
      complaintCategory: 'Cardiac',
      state: PatientState.Assessment,
      priority: Priority.P2,
      vitals: [],
      flags: [],
      notes: [],
      timeline: [],
      documentArtifacts: [
        {
          id: 'a1',
          patientId: 'p-doc',
          patientCardId: 'p-doc',
          artifactType: 'ALLERGY',
          clinicalStatus: 'suggested',
          reviewStatus: 'pending_human_review',
          label: 'Penicillin allergy',
          value: { substance: 'penicillin' },
          confidence: 0.86,
          provenance: {
            sourceType: 'referral_note',
            sourceSystem: 'uploaded_document',
            extractedBy: 'CareDroid Copilot',
            modelVersion: 'document-extractor-v1',
            extractedAt: '2026-06-24T12:00:00.000Z',
          },
          safety: {
            isAiDerived: true,
            requiresHumanReview: true,
            mayAffectClinicalWorkflow: true,
          },
          visibility: { showOnPatientCard: true, showOnWhiteboard: false, showInCopilot: true },
          sourceState: 'extracted',
          createdAt: '2026-06-24T12:00:00.000Z',
          updatedAt: '2026-06-24T12:00:00.000Z',
        },
      ],
    };

    const context = buildCopilotPatientArtifactContext(patient, null);
    expect(context?.documentArtifacts).toBeTruthy();
    expect(
      (context?.documentArtifacts as { pendingReviewCount?: number })?.pendingReviewCount,
    ).toBe(1);
  });
});

describe('scopeCopilotPatientArtifactContextForRole', () => {
  const patient: Patient = {
    id: 'p-scope',
    mrn: 'ED-SCOPE',
    firstName: 'Jamie',
    lastName: 'Rivera',
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
        text: 'Pain worsening after meals',
        createdAt: '2026-06-24T08:12:00.000Z',
        authorStaffId: 's1',
      },
    ],
    timeline: [],
  };

  it('passes the context through unchanged for roles with clinical documentation permission', () => {
    const context = buildCopilotPatientArtifactContext(patient, null);
    const scoped = scopeCopilotPatientArtifactContextForRole(context, true);
    expect(scoped).toBe(context);
  });

  it('strips clinical-judgment fields but keeps identity/complaint/state for non-clinical roles', () => {
    const context = buildCopilotPatientArtifactContext(patient, null);
    const scoped = scopeCopilotPatientArtifactContextForRole(context, false) as Record<
      string,
      unknown
    >;

    expect(scoped.vitals).toBeNull();
    expect(scoped.recentNotes).toEqual([]);
    expect(scoped.savedScores).toBeNull();
    expect(scoped.nativeAi).toBeNull();

    expect(scoped.patientId).toBe('p-scope');
    expect(scoped.mrn).toBe('ED-SCOPE');
    expect(scoped.demographics).toEqual({ age: 35, sex: 'F', dob: '1990-01-01' });
    expect(scoped.chiefComplaint).toBe('Abdominal pain');
    expect(scoped.state).toBe(PatientState.Assessment);
  });

  it('returns null when there is no context to scope', () => {
    expect(scopeCopilotPatientArtifactContextForRole(null, false)).toBeNull();
  });
});
