import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CHECKLISTS,
  buildChecklistCompletionNote,
  findChecklistById,
  findMatchingChecklists,
  parseChecklistCompletionNote,
} from '../config/criticalChecklists';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import CriticalChecklist from './CriticalChecklist';

const originalState = useEmergencyStore.getState();

const basePatient: Patient = {
  id: 'critical-checklist-patient',
  mrn: 'ED-C10-001',
  firstName: 'Casey',
  lastName: 'Morgan',
  dob: '1972-01-01',
  age: 54,
  sex: 'F',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'STEMI with chest pressure',
  complaintCategory: 'Cardiac',
  state: PatientState.Arrival,
  priority: Priority.P1,
  vitals: [],
  flags: [PatientFlag.EMSArrival],
  assignedStaffId: 's1',
  notes: [],
  timeline: [],
  source: 'EMS',
};

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('critical checklist config', () => {
  it('matches critical complaints to configured checklists', () => {
    expect(
      findMatchingChecklists('EMS prearrival STEMI, hypotensive').map((checklist) => checklist.id),
    ).toEqual(['stemi']);
    expect(
      findMatchingChecklists('Major trauma alert after MVC').map((checklist) => checklist.id),
    ).toEqual(['major-trauma']);
    expect(
      findMatchingChecklists('Anaphylaxis after bee sting').map((checklist) => checklist.id),
    ).toEqual(['anaphylaxis']);
  });

  it('builds and parses human-readable completion notes', () => {
    const note = buildChecklistCompletionNote({
      checklistId: 'stemi',
      itemId: 'activate-cath-lab',
      checkedBy: 's1',
      checkedAt: '2026-06-13T12:05:00.000Z',
      itemText: 'Activate cath lab (if applicable)',
    });

    expect(note).toBe(
      'Critical Checklist [stemi] [activate-cath-lab]: completed at 2026-06-13T12:05:00.000Z by s1 - Activate cath lab (if applicable)',
    );
    expect(parseChecklistCompletionNote(note)).toEqual({
      checklistId: 'stemi',
      itemId: 'activate-cath-lab',
      checkedBy: 's1',
      checkedAt: '2026-06-13T12:05:00.000Z',
      itemText: 'Activate cath lab (if applicable)',
    });
  });
});

describe('CriticalChecklist', () => {
  it('restores checked state and progress from patient notes', () => {
    const checklist = findChecklistById('stemi') || CHECKLISTS[0];
    const patient: Patient = {
      ...basePatient,
      notes: [
        {
          id: 'note-existing-check',
          text: buildChecklistCompletionNote({
            checklistId: checklist.id,
            itemId: 'activate-cath-lab',
            checkedBy: 's1',
            checkedAt: '2026-06-13T12:05:00.000Z',
            itemText: 'Activate cath lab (if applicable)',
          }),
        },
      ],
    };

    render(
      <CriticalChecklist
        patient={patient}
        checklist={checklist}
        open
        onClose={() => undefined}
        currentStaffId="s1"
      />,
    );

    expect(screen.queryByText('1/5 items checked')).not.toBeNull();
    expect((screen.getByLabelText(/Activate cath lab/i) as HTMLInputElement).checked).toBe(true);
  });

  it('saves checked items as parseable patient notes', async () => {
    const user = userEvent.setup();
    const checklist = findChecklistById('stemi') || CHECKLISTS[0];
    useEmergencyStore.setState({ ...originalState, patients: [basePatient] }, true);

    render(
      <CriticalChecklist
        patient={basePatient}
        checklist={checklist}
        open
        onClose={() => undefined}
        currentStaffId="s1"
        currentStaffName="Dr. Test"
      />,
    );

    await user.click(screen.getByLabelText(/Prepare ECG machine/i));

    const savedPatient = useEmergencyStore
      .getState()
      .patients.find((patient) => patient.id === basePatient.id);
    const savedText = savedPatient?.notes.at(-1)?.text;

    expect(savedText).toMatch(
      /^Critical Checklist \[stemi] \[prepare-ecg]: completed at .+ by Dr\. Test - /,
    );
    expect(parseChecklistCompletionNote(savedText)).toMatchObject({
      checklistId: 'stemi',
      itemId: 'prepare-ecg',
      checkedBy: 'Dr. Test',
      itemText: 'Prepare ECG machine and cardiac monitor',
    });
    expect(screen.queryByText('1/5 items checked')).not.toBeNull();
  });

  it('HEAL-347.86: readOnly disables every checklist item and never writes a note, even if clicked', async () => {
    const user = userEvent.setup();
    const checklist = findChecklistById('stemi') || CHECKLISTS[0];
    useEmergencyStore.setState({ ...originalState, patients: [basePatient] }, true);

    render(
      <CriticalChecklist
        patient={basePatient}
        checklist={checklist}
        open
        onClose={() => undefined}
        currentStaffId="s1"
        currentStaffName="Dr. Test"
        readOnly
      />,
    );

    const checkbox = screen.getByLabelText(/Prepare ECG machine/i) as HTMLInputElement;
    expect(checkbox).toBeDisabled();

    await user.click(checkbox);

    const savedPatient = useEmergencyStore
      .getState()
      .patients.find((patient) => patient.id === basePatient.id);
    expect(savedPatient?.notes).toHaveLength(0);
    expect(checkbox.checked).toBe(false);
  });

  it('HEAL-261: closes on Escape', async () => {
    const user = userEvent.setup();
    const checklist = findChecklistById('stemi') || CHECKLISTS[0];
    const onClose = vi.fn();

    render(
      <CriticalChecklist
        patient={basePatient}
        checklist={checklist}
        open
        onClose={onClose}
        currentStaffId="s1"
      />,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('HEAL-261: closes on backdrop click', async () => {
    const user = userEvent.setup();
    const checklist = findChecklistById('stemi') || CHECKLISTS[0];
    const onClose = vi.fn();

    render(
      <CriticalChecklist
        patient={basePatient}
        checklist={checklist}
        open
        onClose={onClose}
        currentStaffId="s1"
      />,
    );

    await user.click(screen.getByLabelText('Close checklist backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('HEAL-262: checked and unchecked rows each pin an explicit, contrast-matched text color instead of inheriting a theme variable', () => {
    const checklist = findChecklistById('stemi') || CHECKLISTS[0];
    const patient: Patient = {
      ...basePatient,
      notes: [
        {
          id: 'note-existing-check',
          text: buildChecklistCompletionNote({
            checklistId: checklist.id,
            itemId: 'activate-cath-lab',
            checkedBy: 's1',
            checkedAt: '2026-06-13T12:05:00.000Z',
            itemText: 'Activate cath lab (if applicable)',
          }),
        },
      ],
    };

    render(
      <CriticalChecklist
        patient={patient}
        checklist={checklist}
        open
        onClose={() => undefined}
        currentStaffId="s1"
      />,
    );

    const checkedText = screen.getByText('Activate cath lab (if applicable)');
    expect(checkedText).toHaveStyle({ color: '#f0fdf4' });

    const uncheckedText = screen.getByText('Prepare ECG machine and cardiac monitor');
    expect(uncheckedText).toHaveStyle({ color: '#111827' });
  });

  it('HEAL-261: moves focus into the dialog on open', () => {
    const checklist = findChecklistById('stemi') || CHECKLISTS[0];

    render(
      <CriticalChecklist
        patient={basePatient}
        checklist={checklist}
        open
        onClose={() => undefined}
        currentStaffId="s1"
      />,
    );

    expect(screen.getByRole('dialog')).toHaveFocus();
  });
});
