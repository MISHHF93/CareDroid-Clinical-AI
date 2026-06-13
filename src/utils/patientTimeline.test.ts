import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import { buildPatientTimeline } from './patientTimeline';

function timelinePatient(): Patient {
  return {
    id: 'timeline-patient-1',
    mrn: 'ED-TL-1',
    firstName: 'Timeline',
    lastName: 'Patient',
    dob: '1974-01-01',
    age: 52,
    sex: 'Other',
    arrivalTime: '2026-06-13T08:00:00-04:00',
    triageTime: '2026-06-13T08:05:00-04:00',
    chiefComplaint: 'EMS pre-arrival with chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Discharge,
    priority: Priority.P2,
    vitals: [
      {
        hr: 118,
        sbp: 144,
        dbp: 92,
        spo2: 93,
        temp: 37.8,
        rr: 24,
        gcs: 15,
        pain: 7,
        recordedAt: '2026-06-13T08:10:00-04:00',
        recordedBy: 'staff-1',
      },
    ],
    flags: [
      PatientFlag.EMSArrival,
      PatientFlag.HighRisk,
      PatientFlag.ReassessmentDue,
      PatientFlag.PendingAdmission,
    ],
    assignedStaffId: 'staff-1',
    roomId: 'r3',
    notes: [],
    timeline: [
      {
        id: 'state-assessment',
        type: 'StateChange',
        from: PatientState.Triage,
        to: PatientState.Assessment,
        timestamp: '2026-06-13T08:30:00-04:00',
        staffId: 'staff-1',
        note: 'Moved to assessment.',
      },
      {
        id: 'state-admission',
        type: 'StateChange',
        from: PatientState.Disposition,
        to: PatientState.Admission,
        timestamp: '2026-06-13T09:00:00-04:00',
        staffId: 'staff-1',
        note: 'Moved to admission boarding.',
      },
      {
        id: 'state-discharge',
        type: 'DispositionUpdated',
        from: PatientState.Admission,
        to: PatientState.Discharge,
        timestamp: '2026-06-13T10:00:00-04:00',
        staffId: 'staff-1',
        note: 'Discharged home.',
      },
    ],
  };
}

describe('buildPatientTimeline', () => {
  it('normalizes every patient timeline category from patient, workflow, and module sources', () => {
    const patient = timelinePatient();
    const items = buildPatientTimeline(patient, {
      staff: [{ id: 'staff-1', name: 'Maya Thompson', role: 'RN', active: true }],
      workflowLogs: [
        {
          id: 'copilot-log',
          type: 'copilot_used',
          title: 'Copilot used',
          summary: 'Copilot summarized high-risk context for human review.',
          timestamp: '2026-06-13T08:20:00-04:00',
          patientId: patient.id,
          source: 'ed-copilot',
          severity: 'Warning',
          status: 'recorded',
          metadata: {},
        },
      ],
      emsArrivals: [{ patient: { id: patient.id }, handoffStatus: 'pre-arrival' }],
      referrals: [{ patient: { id: patient.id }, specialty: 'Cardiology', status: 'review-needed' }],
      boardingPatients: [{ id: patient.id }],
      provincialRecords: [{ patientId: patient.id, mrn: patient.mrn }],
    });

    expect(new Set(items.map((item) => item.category))).toEqual(
      new Set([
        'intake',
        'state-transition',
        'triage',
        'queue',
        'reassessment',
        'ems',
        'referral',
        'boarding',
        'discharge',
        'ai-copilot',
        'provincial-health',
      ]),
    );
  });
});
