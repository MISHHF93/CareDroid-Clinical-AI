import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';

const emergencyRoleMock = vi.hoisted(() => {
  const { withEmergencyRoleMock } = require('../test/permissiveEmergencyRoleMock.ts');
  return withEmergencyRoleMock({ switchDemoRole: vi.fn() });
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

vi.mock('../hooks/usePatientTimelineContext', () => ({
  usePatientTimelineContext: () => ({ loading: false, error: '', context: {} }),
}));

vi.mock('../hooks/useEmergencyOs', () => ({
  useUpgradeHarnessPatientFlow: () => ({ data: { data: { signals: [] } } }),
}));

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    createSmartIntakePatient: vi.fn(async (patient: Patient) => ({ data: { patient } })),
  };
});

const originalState = useEmergencyStore.getState();

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'sticky-overlap-patient-1',
    mrn: 'ED-HEAL316-1',
    firstName: 'Robin',
    lastName: 'Castillo',
    dob: '1990-01-01',
    age: 36,
    sex: 'M',
    arrivalTime: '2026-08-17T12:00:00.000Z',
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'General',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function renderWithPatient(patient: Patient) {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients: [patient],
      selectedPatientId: patient.id,
      ui: { ...originalState.ui, selectedPatientId: patient.id },
    },
    true,
  );

  return render(
    <MemoryRouter>
      <PatientDetailPanel />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('PatientDetailPanel sticky header/footer overlap (HEAL-316)', () => {
  // `.patient-detail-panel__header` is `position: sticky; top: 0`. Before HEAL-316 it
  // wrapped everything down through the action row -- allergy/medication banners, EMS
  // handoff notes, What Happens Next, the saved-scores/recommended-tools strip, the
  // Copilot panel, the entire Latest Vitals section, AI triage assist, and the
  // Open-Checklist/Move-to-next-step row -- so once scrolled, this whole ~800px block
  // stayed pinned on top of (not above) whatever content had scrolled up underneath it.
  // Live verification (Playwright, elementFromPoint at the real "Submit Note" button's
  // screen coordinates, after opening the panel and scrolling it) confirmed a real click
  // there hit a Copilot quick-action button instead of Submit Note. jsdom doesn't compute
  // real layout/position, so a click-interception test isn't possible here -- this
  // instead asserts the underlying DOM-nesting fact HEAL-316 actually changed: the
  // "Latest Vitals" section (previously a `<header>` descendant) is no longer one.
  it('no longer nests the Latest Vitals section inside the sticky header', () => {
    renderWithPatient(makePatient());

    const vitalsHeading = screen.getByRole('heading', { name: /latest vitals/i });
    expect(vitalsHeading.closest('.patient-detail-panel__header')).toBeNull();
  });

  it('sticky header stays scoped to identity + badges (title, MRN, close button)', () => {
    renderWithPatient(makePatient());

    const header = document.querySelector('.patient-detail-panel__header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('.patient-detail-panel__title')).not.toBeNull();
    expect(header!.querySelector('.patient-detail-panel__close-btn')).not.toBeNull();
    expect(header!.querySelector('.patient-detail-panel__badge-row')).not.toBeNull();
    // The "Latest Vitals" heading text must not appear anywhere inside the header.
    expect(header!.textContent).not.toMatch(/latest vitals/i);
  });

  // `.patient-detail-panel__footer` is `position: sticky; bottom: 0` and used to also
  // wrap <WhoNextPanel /> (variable, unbounded height -- guidance text or an empty state)
  // above the compact action-button row, creating the same overlap risk as the header,
  // confirmed live via the same elementFromPoint method after the header fix surfaced it.
  it('no longer nests WhoNextPanel ("See next") content inside the sticky footer', () => {
    renderWithPatient(makePatient());

    const seeNextLabel = screen.getByText(/see next/i);
    expect(seeNextLabel.closest('.patient-detail-panel__footer')).toBeNull();
  });

  it('sticky footer stays scoped to just the compact action-button row', () => {
    renderWithPatient(makePatient());

    const footer = document.querySelector('.patient-detail-panel__footer');
    expect(footer).not.toBeNull();
    expect(footer!.querySelector('.patient-detail-panel__footer-actions')).not.toBeNull();
    expect(footer!.textContent).not.toMatch(/see next/i);
  });
});
