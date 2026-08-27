import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Patient } from '../../types/emergency';
import ReceptionPatientLookup from './ReceptionPatientLookup';

// Regression guard (SAFER patient-identification): this widget is the
// surface reception staff use to find an EXISTING patient BEFORE creating a
// new chart -- the highest-consequence place for a same-name mix-up in the
// whole app (pick the wrong "John Smith" here and you either open someone
// else's chart or spawn a needless duplicate registration). PatientSearchResults.tsx
// (the global nav/command-palette search) already carried this warning; this
// widget did not, even though its own doc comment says it exists
// specifically for this lookup-before-create moment. Mirrors
// PatientSearchResults.test.tsx's own same-name warning describe block.

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'ED-42',
    firstName: 'Riley',
    lastName: 'Thompson',
    dob: '1990-01-01',
    ...overrides,
  } as Patient;
}

function noop() {}

function typeQuery(query: string) {
  const input = screen.getByPlaceholderText(/search before creating a new chart/i);
  fireEvent.change(input, { target: { value: query } });
}

describe('ReceptionPatientLookup same-name warning (SAFER patient-identification)', () => {
  it('flags two results with the same display name so a same-name mix-up cannot go unnoticed', () => {
    const patients: Patient[] = [
      patient({ id: 'p1', mrn: 'ED-1', firstName: 'John', lastName: 'Smith' }),
      patient({ id: 'p2', mrn: 'ED-2', firstName: 'John', lastName: 'Smith' }),
    ];
    render(
      <ReceptionPatientLookup patients={patients} onSelectExisting={noop} onCreateNew={noop} />,
    );

    typeQuery('John Smith');

    const warnings = screen.getAllByText(/same name.*check MRN\/DOB/i);
    expect(warnings).toHaveLength(2);
  });

  it('does not warn when no two results share the same name', () => {
    const patients: Patient[] = [
      patient({ id: 'p1', firstName: 'John', lastName: 'Smith' }),
      patient({ id: 'p2', firstName: 'Jane', lastName: 'Doe' }),
    ];
    render(
      <ReceptionPatientLookup patients={patients} onSelectExisting={noop} onCreateNew={noop} />,
    );

    typeQuery('Smith');

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.queryByText(/same name.*check MRN\/DOB/i)).toBeNull();
  });

  it('is case/whitespace-insensitive (still catches "John Smith" vs " john   smith ")', () => {
    const patients: Patient[] = [
      patient({ id: 'p1', firstName: 'John', lastName: 'Smith' }),
      patient({ id: 'p2', firstName: '  john', lastName: 'smith  ' }),
    ];
    render(
      <ReceptionPatientLookup patients={patients} onSelectExisting={noop} onCreateNew={noop} />,
    );

    typeQuery('John Smith');

    expect(screen.getAllByText(/same name.*check MRN\/DOB/i)).toHaveLength(2);
  });

  it('never warns for a single, unambiguous match', () => {
    const patients: Patient[] = [patient({ id: 'p1', firstName: 'Riley', lastName: 'Thompson' })];
    render(
      <ReceptionPatientLookup patients={patients} onSelectExisting={noop} onCreateNew={noop} />,
    );

    typeQuery('Riley');

    expect(screen.getByText('Riley Thompson')).toBeInTheDocument();
    expect(screen.queryByText(/same name.*check MRN\/DOB/i)).toBeNull();
  });
});
