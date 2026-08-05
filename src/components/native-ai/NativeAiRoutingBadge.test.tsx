import { render, screen } from '@testing-library/react';
import NativeAiRoutingBadge from './NativeAiRoutingBadge';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../services/nativeAiCore', () => ({
  buildNativeAiPatientSnapshot: vi.fn(),
  formatRoutingLabel: () => 'Cardiac-Vascular',
}));

import { buildNativeAiPatientSnapshot } from '../../services/nativeAiCore';

const patient: Patient = {
  id: 'p1',
  mrn: 'ED-1',
  firstName: 'Sam',
  lastName: 'Lee',
  dob: '1980-01-01',
  age: 45,
  sex: 'M',
  arrivalTime: '2026-06-24T08:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Triage,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

function mockSnapshot(sourceState: 'live' | 'demo' | 'simulated' | 'shadow') {
  vi.mocked(buildNativeAiPatientSnapshot).mockReturnValue({
    sourceState,
    routing: {
      runId: 'run-1',
      patientId: 'p1',
      routedAt: '2026-06-24T08:00:00.000Z',
      chiefComplaint: 'Chest pain',
      primaryDomain: 'cardiac_vascular',
      specialistDomains: ['cardiac_vascular'],
      confidence: 0.7,
      keySignals: ['Complaint: chest pain'],
      routerModelVersion: '1.0.0',
      sourceState,
      disclaimer: 'General emergency routing — staff confirmation required.',
    },
  } as any);
}

describe('NativeAiRoutingBadge', () => {
  it('P0.4: labels a live-sourceState routing decision Manual, since the router is keyword scoring, not a trained model', () => {
    mockSnapshot('live');
    render(<NativeAiRoutingBadge patient={patient} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/Panel-of-experts routing engine/i);
  });

  it('labels a demo-sourceState routing decision Demo', () => {
    mockSnapshot('demo');
    render(<NativeAiRoutingBadge patient={patient} />);
    expect(screen.getByTestId('ai-truth-label-chip')).toHaveTextContent('Demo');
  });
});
