import { describe, expect, it } from 'vitest';
import {
  classifyDtn,
  getTpaEligibilityResult,
  isStrokeComplaint,
  parseStrokeCodeNotes,
  TPA_EXCLUDE_CRITERIA,
  TPA_INCLUDE_CRITERIA,
} from './StrokeCodeProtocol';
import { PatientState, Priority, type Note, type Patient } from '../types/emergency';

function patientWithComplaint(chiefComplaint: string, complaintCategory = 'Neuro'): Patient {
  return {
    id: 'stroke-test-patient',
    mrn: 'ED-STROKE-1',
    firstName: 'Sam',
    lastName: 'Rivera',
    dob: '1960-01-01',
    age: 66,
    sex: 'F',
    arrivalTime: '2026-06-13T12:00:00.000Z',
    chiefComplaint,
    complaintCategory,
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
  };
}

describe('StrokeCodeProtocol helpers', () => {
  it('detects stroke complaints from complaint router and conservative fallback terms', () => {
    expect(isStrokeComplaint(patientWithComplaint('Facial droop and slurred speech'))).toBe(true);
    expect(isStrokeComplaint(patientWithComplaint('Possible CVA with aphasia', 'Other'))).toBe(
      true,
    );
    expect(
      isStrokeComplaint(patientWithComplaint('Diffuse fatigue without focal deficits', 'General')),
    ).toBe(false);
    expect(
      isStrokeComplaint(patientWithComplaint('Abdominal pain right lower quadrant', 'Abdominal')),
    ).toBe(false);
  });

  it('parses stroke activation and timeline notes from patient notes', () => {
    const notes: Note[] = [
      {
        id: 'note-1',
        text: 'Stroke Code activated at 2026-06-13T12:04:00.000Z by Dr. Nair',
        timestamp: '2026-06-13T12:04:00.000Z',
      },
      {
        id: 'note-2',
        text: 'Stroke Code CT Ord: completed at 2026-06-13T12:10:00.000Z by Dr. Nair',
        timestamp: '2026-06-13T12:10:00.000Z',
      },
      {
        id: 'note-3',
        body: 'Stroke Code tPA: completed at 2026-06-13T12:29:00.000Z by Dr. Nair',
        timestamp: '2026-06-13T12:29:00.000Z',
      },
    ];

    expect(parseStrokeCodeNotes(notes)).toEqual({
      activatedAt: '2026-06-13T12:04:00.000Z',
      activatedBy: 'Dr. Nair',
      steps: {
        'CT Ord': {
          completedAt: '2026-06-13T12:10:00.000Z',
          by: 'Dr. Nair',
        },
        tPA: {
          completedAt: '2026-06-13T12:29:00.000Z',
          by: 'Dr. Nair',
        },
      },
    });
  });

  it('classifies door-to-needle performance bands', () => {
    expect(classifyDtn(30)).toEqual({
      tone: 'green',
      message: '✓ Excellent — Canadian target met',
    });
    expect(classifyDtn(45)).toEqual({
      tone: 'yellow',
      message: '⚠ Within limit — target is ≤30min',
    });
    expect(classifyDtn(61)).toEqual({ tone: 'red', message: '✗ Exceeded — review process' });
  });

  it('summarizes tPA checklist eligibility without auto-deciding treatment', () => {
    const allIncludes = Object.fromEntries(
      TPA_INCLUDE_CRITERIA.map((criterion) => [criterion.id, true]),
    );
    expect(getTpaEligibilityResult(allIncludes, {})).toEqual({
      status: 'eligible',
      tone: 'green',
      message: 'tPA ELIGIBLE — Physician decision required',
    });

    expect(getTpaEligibilityResult(allIncludes, { [TPA_EXCLUDE_CRITERIA[0].id]: true })).toEqual({
      status: 'contraindicated',
      tone: 'red',
      message: `tPA CONTRAINDICATED — ${TPA_EXCLUDE_CRITERIA[0].label}`,
    });

    expect(getTpaEligibilityResult({ [TPA_INCLUDE_CRITERIA[0].id]: true }, {})).toEqual({
      status: 'incomplete',
      tone: 'yellow',
      message: 'ASSESSMENT INCOMPLETE',
    });
  });
});
