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

  it('hides Encounters/Referrals/EMS/Queue hits (also PHI-bearing) when canViewPatients is false (HEAL-206)', () => {
    const operationalGroups = {
      patient: [],
      encounter: [
        {
          id: 'enc-1',
          entityType: 'encounter' as const,
          label: 'ENC-1',
          hint: 'Riley Thompson · Assessment · Chest pain',
        },
      ],
      referral: [],
      ems: [],
      queue: [
        {
          id: 'queue-1',
          entityType: 'queue' as const,
          label: 'Waiting · Riley Thompson',
          hint: 'ED-42 · P2 · Chest pain',
        },
      ],
    };

    renderResults({ operationalGroups });
    expect(screen.queryByText('ENC-1')).toBeNull();
    expect(screen.queryByText(/Riley Thompson/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Encounters' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Queue items' })).toBeNull();
    expect(screen.getByText(/no operational matches/i)).toBeInTheDocument();

    renderResults({ operationalGroups, canViewPatients: true });
    expect(screen.getByText('ENC-1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Encounters' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Queue items' })).toBeInTheDocument();
  });
});

describe('PatientSearchResults footer query display (HEAL-342)', () => {
  it('truncates a very long, unbroken query in the "Register new patient" footer button', () => {
    const longQuery = 'a'.repeat(300);
    renderResults({
      query: longQuery,
      results: [],
      canCreatePatient: true,
      onStartNewIntake: noop,
    });

    const button = screen.getByText(/no match for/i).closest('button')!;
    expect(button.textContent).not.toContain(longQuery);
    expect(button.textContent!.length).toBeLessThan(longQuery.length);
  });

  it('shows a short query in full', () => {
    renderResults({
      query: 'zzq-no-match',
      results: [],
      canCreatePatient: true,
      onStartNewIntake: noop,
    });

    expect(screen.getByText(/zzq-no-match/)).toBeInTheDocument();
  });
});

describe('PatientSearchResults same-name warning (SAFER patient-identification)', () => {
  it('flags two results with the same display name so a same-name mix-up cannot go unnoticed', () => {
    const results: PatientSearchResult<Patient>[] = [
      { patient: patient({ id: 'p1', mrn: 'ED-1', firstName: 'John', lastName: 'Smith' }), score: 1, matchKind: 'exact-name' },
      { patient: patient({ id: 'p2', mrn: 'ED-2', firstName: 'John', lastName: 'Smith' }), score: 1, matchKind: 'exact-name' },
    ];
    render(
      <PatientSearchResults
        query="John Smith"
        results={results}
        canViewPatients
        onFindPatient={noop}
        onStartIntake={noop}
        onViewEncounter={noop}
        onCreateEncounter={noop}
      />,
    );

    const warnings = screen.getAllByText(/same name.*check MRN\/DOB/i);
    expect(warnings).toHaveLength(2);
  });

  it('does not warn when no two results share the same name', () => {
    const results: PatientSearchResult<Patient>[] = [
      { patient: patient({ id: 'p1', firstName: 'John', lastName: 'Smith' }), score: 1, matchKind: 'exact-name' },
      { patient: patient({ id: 'p2', firstName: 'Jane', lastName: 'Doe' }), score: 1, matchKind: 'exact-name' },
    ];
    render(
      <PatientSearchResults
        query="John"
        results={results}
        canViewPatients
        onFindPatient={noop}
        onStartIntake={noop}
        onViewEncounter={noop}
        onCreateEncounter={noop}
      />,
    );

    expect(screen.queryByText(/same name.*check MRN\/DOB/i)).toBeNull();
  });

  it('is case/whitespace-insensitive (still catches "John Smith" vs " john   smith ")', () => {
    const results: PatientSearchResult<Patient>[] = [
      { patient: patient({ id: 'p1', firstName: 'John', lastName: 'Smith' }), score: 1, matchKind: 'exact-name' },
      { patient: patient({ id: 'p2', firstName: '  john', lastName: 'smith  ' }), score: 1, matchKind: 'exact-name' },
    ];
    render(
      <PatientSearchResults
        query="John Smith"
        results={results}
        canViewPatients
        onFindPatient={noop}
        onStartIntake={noop}
        onViewEncounter={noop}
        onCreateEncounter={noop}
      />,
    );

    expect(screen.getAllByText(/same name.*check MRN\/DOB/i)).toHaveLength(2);
  });
});
