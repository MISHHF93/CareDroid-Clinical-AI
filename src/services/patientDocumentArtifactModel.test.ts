import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  applyArtifactReview,
  artifactsForPatientCard,
  countPendingReviewArtifacts,
  extractArtifactsFromPatient,
  extractDocumentArtifacts,
  mergePatientDocumentArtifacts,
  summarizeArtifactsForCopilot,
} from './patientDocumentArtifactModel';

describe('patientDocumentArtifactModel', () => {
  it('extracts allergy and medication artifacts from referral note text', () => {
    const rawText = [
      'Chief complaint: Chest pain',
      'Allergies: Penicillin — rash',
      'Medications: Warfarin 5mg daily',
      'Troponin ordered, result pending',
      'EMS reports chest pain onset 45 min ago',
    ].join('\n');

    const { artifacts, source } = extractDocumentArtifacts({
      patientId: 'p1',
      documentType: 'Referral Note',
      sourceType: 'referral_note',
      rawText,
    });

    expect(source.patientId).toBe('p1');
    expect(
      artifacts.some(
        (a) => a.artifactType === 'ALLERGY' && a.label.toLowerCase().includes('penicillin'),
      ),
    ).toBe(true);
    expect(artifacts.some((a) => a.artifactType === 'MEDICATION')).toBe(true);
    expect(artifacts.some((a) => a.artifactType === 'CHIEF_COMPLAINT')).toBe(true);
    expect(artifacts.some((a) => a.artifactType === 'LAB_RESULT')).toBe(true);
    expect(artifacts.some((a) => a.artifactType === 'COPILOT_TOOL_RECOMMENDATION')).toBe(true);
    // 2026-08-08: every artifact this module produces comes from a regex/
    // keyword parser (clinicalArtifactParser.ts, labeled()) -- zero LLM or
    // model calls anywhere. Locks in the fix for a real bug: safety
    // .isAiDerived previously defaulted to true and several call sites
    // (including the "Consider HEART score tool" copilot suggestion above)
    // hardcoded it true, regardless of the extraction mechanism.
    expect(artifacts.every((a) => a.safety.isAiDerived === false)).toBe(true);
    expect(artifacts.every((a) => a.provenance.responseSource === 'DETERMINISTIC_RULE')).toBe(true);
    // Deterministic extraction still needs staff sign-off before clinical
    // use -- requiresHumanReview is a separate, unaffected concept.
    expect(
      artifacts
        .filter((a) => a.reviewStatus === 'pending_human_review')
        .every((a) => a.safety.requiresHumanReview === true),
    ).toBe(true);
  });

  it('extracts workflow artifacts from patient record', () => {
    const patient: Patient = {
      id: 'p2',
      mrn: 'ED-2',
      firstName: 'Alex',
      lastName: 'Kim',
      dob: '1985-03-03',
      age: 41,
      sex: 'M',
      arrivalTime: '2026-06-24T10:00:00.000Z',
      chiefComplaint: 'Shortness of breath',
      complaintCategory: 'Respiratory',
      state: PatientState.Waiting,
      priority: Priority.P2,
      vitals: [],
      flags: [PatientFlag.ReassessmentDue, PatientFlag.SepsisAlert],
      notes: [],
      timeline: [],
      arrival: {
        arrivalMode: 'EMS',
        arrivalTimestamp: '2026-06-24T10:00:00.000Z',
        chiefComplaint: 'Shortness of breath',
        triageAcuity: { code: 'P2', system: 'PRIORITY', level: 2, status: 'confirmed' },
        waitingRoomStatus: 'waiting-for-clinician',
        registrationStatus: 'complete',
        queueDestination: 'whiteboard',
        triagePending: false,
      },
      emsArrival: {
        id: 'ems-1',
        unitId: 'u1',
        unitName: 'Medic 12',
        crewNames: ['J. Lee'],
        patientAge: 41,
        patientSex: 'M',
        chiefComplaint: 'SOB',
        eta: 0,
        severity: 'Critical',
        dispatchTime: '2026-06-24T09:50:00.000Z',
        estimatedArrivalTime: '2026-06-24T10:00:00.000Z',
        notes: 'EMS reports dyspnea onset 20 min ago',
        status: 'Arrived',
        prearrivalComplaint: 'SOB',
        priority: Priority.P2,
        handoffSummary: 'Dyspnea, SpO2 88% en route',
      },
    };

    const artifacts = extractArtifactsFromPatient(patient);
    expect(artifacts.some((a) => a.artifactType === 'EMS_HANDOFF')).toBe(true);
    expect(artifacts.some((a) => a.artifactType === 'REASSESSMENT_TRIGGER')).toBe(true);
    expect(artifacts.some((a) => a.artifactType === 'DETERIORATION_SIGNAL')).toBe(true);
    expect(artifacts.some((a) => a.artifactType === 'ARRIVAL_CONTEXT')).toBe(true);
    // 2026-08-08: REASSESSMENT_TRIGGER/DETERIORATION_SIGNAL previously
    // hardcoded isAiDerived: true even though both are produced by directly
    // reading an existing patient flag (hasPatientFlag) -- not AI at all.
    expect(artifacts.every((a) => a.safety.isAiDerived === false)).toBe(true);
    expect(artifacts.every((a) => a.provenance.responseSource === 'DETERMINISTIC_RULE')).toBe(true);
  });

  it('merges artifacts without duplicates and applies review', () => {
    const { artifacts: first } = extractDocumentArtifacts({
      patientId: 'p3',
      documentType: 'Allergy list',
      sourceType: 'scanned_note',
      rawText: 'Allergies: Penicillin — rash',
    });
    const { artifacts: second } = extractDocumentArtifacts({
      patientId: 'p3',
      documentType: 'Allergy list',
      sourceType: 'scanned_note',
      rawText: 'Allergies: Penicillin — rash',
    });

    const merged = mergePatientDocumentArtifacts(first, second);
    const allergyCount = merged.filter((a) => a.artifactType === 'ALLERGY').length;
    expect(allergyCount).toBe(1);

    const allergy = merged.find((a) => a.artifactType === 'ALLERGY');
    expect(allergy).toBeDefined();
    const reviewed = applyArtifactReview(allergy!, {
      reviewStatus: 'accepted',
      reviewer: 'Dr. Smith',
    });
    expect(reviewed.clinicalStatus).toBe('confirmed');
    expect(reviewed.reviewedBy).toBe('Dr. Smith');
    expect(reviewed.safety.requiresHumanReview).toBe(false);
  });

  it('summarizes artifacts for copilot context', () => {
    const { artifacts } = extractDocumentArtifacts({
      patientId: 'p4',
      documentType: 'Referral',
      sourceType: 'referral_note',
      rawText: 'Chief complaint: Chest pain. Medications: Warfarin.',
    });

    const summary = summarizeArtifactsForCopilot(artifacts);
    expect(summary.pendingReviewCount).toBeGreaterThan(0);
    expect(Array.isArray(summary.clinicalFacts)).toBe(true);
    expect(Array.isArray(summary.copilotSuggestions)).toBe(true);
  });

  it('filters patient-card visible artifacts', () => {
    const { artifacts } = extractDocumentArtifacts({
      patientId: 'p5',
      documentType: 'Note',
      sourceType: 'triage_note',
      rawText: 'Chief complaint: Abdominal pain',
    });

    const cardArtifacts = artifactsForPatientCard(artifacts);
    expect(cardArtifacts.length).toBeGreaterThan(0);
    expect(countPendingReviewArtifacts(cardArtifacts)).toBeGreaterThan(0);
  });
});
