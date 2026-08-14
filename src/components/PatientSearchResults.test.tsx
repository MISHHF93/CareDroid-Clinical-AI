import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Patient } from '../types/emergency';
import type { PatientSearchResult } from '../utils/patientSearch';
import PatientSearchResults from './PatientSearchResults';

// Regression guard (HEAL-203): this component previously rendered full
// patient PHI (name, MRN, DOB, phone, health card, chief complaint via
// formatPatientSearchHint) in the global header search dropdown for every
// role, with no permission check at all -- including roles explicitly
// documented as having zero PHI access (e.g. it_admin). canViewPatients
// defaults to false (fail closed) since this component has exactly one
// caller, Header.tsx, which must now pass it explicitly.

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'ED-42',
    firstName: 'Riley',
    lastName: 'Thompson',
    chiefComplaint: 'Chest pain',
    ...overrides,
  } as Patient;
}

function noop() {}

function renderResults(overrides: Partial<React.ComponentProps<typeof PatientSearchResults>> = {}) {
  const results: PatientSearchResult<Patient>[] = [
    { patient: patient(), score: 1, matchKind: 'exact-name' },
  ];
  return render(
    <PatientSearchResults
      query="Riley"
      results={results}
      onFindPatient={noop}
      onStartIntake={noop}
      onViewEncounter={noop}
      onCreateEncounter={noop}
      {...overrides}
    />,
  );
}

describe('PatientSearchResults PHI gate', () => {
  it('hides the Patients section and all PHI text when canViewPatients is false (default)', () => {
    renderResults();
    expect(screen.queryByText('Riley Thompson')).toBeNull();
    expect(screen.queryByText(/ED-42/)).toBeNull();
    expect(screen.queryByText(/Chest pain/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Patients' })).toBeNull();
  });

  it('shows the Patients section and match details when canViewPatients is true', () => {
    renderResults({ canViewPatients: true });
    expect(screen.getByText('Riley Thompson')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Patients' })).toBeInTheDocument();
  });

  it('falls back to the no-results empty state when patients are the only match and hidden', () => {
    renderResults();
    // With canViewPatients false and no operational hits, hasAnyResults must
    // be false too -- otherwise the empty state incorrectly disappears while
    // showing nothing.
    expect(screen.getByText(/no operational matches/i)).toBeInTheDocument();
  });
});
