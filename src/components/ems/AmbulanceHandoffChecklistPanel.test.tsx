import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AmbulanceHandoffChecklistPanel from './AmbulanceHandoffChecklistPanel';
import { Priority } from '../../types/emergency';

// HEAL-266: identityStatus/complaintSummary/patientDestination controls had
// no accessible name (only a visual <dt>, never wired via label/aria-label)
// -- a screen-reader user tabbing through this live ambulance-handoff form
// heard only "combobox" / "edit text" with no indication of what each
// field represented.

const baseArrival = {
  id: 'ems-handoff-1',
  unitId: 'Medic 4',
  unitName: 'Medic 4',
  crewNames: ['C. Park'],
  patientAge: 62,
  patientSex: 'M' as const,
  chiefComplaint: 'Chest pain',
  prearrivalComplaint: 'Chest pain radiating to jaw',
  eta: 0,
  severity: 'Critical' as const,
  dispatchTime: '2026-06-20T11:30:00.000Z',
  estimatedArrivalTime: '2026-06-20T11:45:00.000Z',
  notes: 'Crew gave aspirin 325mg and nitro x1 en route.',
  handoffSummary: 'STEMI concern. 12-lead transmitted.',
  status: 'Handoff' as const,
  priority: Priority.P1,
  patientId: 'patient-ems-1',
  arrivedAt: '2026-06-20T11:45:00.000Z',
  vitals: { hr: 98, sbp: 142, dbp: 88, spo2: 94, recordedAt: '2026-06-20T11:40:00.000Z' },
};

describe('AmbulanceHandoffChecklistPanel accessible labels (HEAL-266)', () => {
  it('gives the identity, complaint summary, and destination controls accessible names', () => {
    render(<AmbulanceHandoffChecklistPanel arrival={baseArrival} canEdit />);

    expect(screen.getByLabelText('Patient identity')).toBeInTheDocument();
    expect(screen.getByLabelText('Complaint summary')).toBeInTheDocument();
    expect(screen.getByLabelText('Patient destination')).toBeInTheDocument();
  });
});
