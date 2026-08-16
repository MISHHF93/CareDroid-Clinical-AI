import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceptionPatientTaskSheet from './ReceptionPatientTaskSheet';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';

function basePatient(partial: Partial<Patient> = {}): Patient {
  return {
    id: 'p-1',
    mrn: 'ED-1001',
    firstName: 'Jordan',
    lastName: 'Lee',
    dob: '1988-04-02',
    age: 38,
    sex: 'Male',
    arrivalTime: '2026-07-22T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    source: 'WalkIn',
    ...partial,
  };
}

const defaultProps = {
  displayName: 'Jordan Lee',
  statusLabel: 'Waiting for triage',
  nextStepLabel: 'Triage assessment',
  ownerLabel: 'Triage nurse',
  waitMinutes: 12,
  isHighRisk: false,
  canEscalate: true,
  canSmartIntake: true,
  onClose: vi.fn(),
  onCompleteId: vi.fn(),
  onEscalate: vi.fn(),
  onHandoff: vi.fn(),
  onOpenFullRecord: vi.fn(),
};

describe('ReceptionPatientTaskSheet', () => {
  it('renders identity, next step, and meta fields', () => {
    render(<ReceptionPatientTaskSheet patient={basePatient()} {...defaultProps} />);

    expect(screen.getByText('Jordan Lee')).toBeInTheDocument();
    expect(screen.getByText('ED-1001')).toBeInTheDocument();
    expect(screen.getByText('Triage assessment')).toBeInTheDocument();
    expect(screen.getByText('Waiting for triage')).toBeInTheDocument();
    expect(screen.getByText('12m')).toBeInTheDocument();
    expect(screen.getByText('Triage nurse')).toBeInTheDocument();
  });

  it('shows the high-risk chip only when isHighRisk is true', () => {
    const { rerender } = render(
      <ReceptionPatientTaskSheet patient={basePatient()} {...defaultProps} isHighRisk={false} />,
    );
    expect(screen.queryByText('High risk')).not.toBeInTheDocument();

    rerender(<ReceptionPatientTaskSheet patient={basePatient()} {...defaultProps} isHighRisk />);
    expect(screen.getByText('High risk')).toBeInTheDocument();
  });

  it('renders up to two patient flags when present', () => {
    const patient = basePatient({ flags: [PatientFlag.LongWait, PatientFlag.EMSArrival] });
    render(<ReceptionPatientTaskSheet patient={patient} {...defaultProps} />);

    expect(screen.getByLabelText('Flags')).toBeInTheDocument();
    expect(screen.getByText(PatientFlag.LongWait)).toBeInTheDocument();
    expect(screen.getByText(PatientFlag.EMSArrival)).toBeInTheDocument();
  });

  it('labels the identity action "Complete identity" when registration is provisional', () => {
    const patient = basePatient({ registrationStatus: 'provisional' });
    render(<ReceptionPatientTaskSheet patient={patient} {...defaultProps} />);
    expect(screen.getByText('Complete identity')).toBeInTheDocument();
  });

  it('labels the identity action "Check identity" when registration is already complete', () => {
    const patient = basePatient({ registrationStatus: 'complete' });
    render(<ReceptionPatientTaskSheet patient={patient} {...defaultProps} />);
    expect(screen.getByText('Check identity')).toBeInTheDocument();
  });

  it('hides the escalate action when canEscalate is false', () => {
    render(<ReceptionPatientTaskSheet patient={basePatient()} {...defaultProps} canEscalate={false} />);
    expect(screen.queryByText('Escalate to nurse')).not.toBeInTheDocument();
  });

  it('fires the wired callbacks for close, escalate, handoff, and open-full-record', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      onClose: vi.fn(),
      onEscalate: vi.fn(),
      onHandoff: vi.fn(),
      onOpenFullRecord: vi.fn(),
    };
    render(<ReceptionPatientTaskSheet patient={basePatient()} {...props} />);

    await user.click(screen.getByLabelText('Close patient tasks'));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Escalate to nurse'));
    expect(props.onEscalate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Continue to triage'));
    expect(props.onHandoff).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Open full record'));
    expect(props.onOpenFullRecord).toHaveBeenCalledTimes(1);
  });

  it('HEAL-273: closes on Escape via its own handler, not just a host-page keydown special-case', () => {
    const onClose = vi.fn();
    render(<ReceptionPatientTaskSheet patient={basePatient()} {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
