import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserProvider } from '../contexts/UserContext';
import { NotificationShellProvider } from '../contexts/NotificationShellContext';
import EMSCriticalBroadcast from './EMSCriticalBroadcast';
import { useEmergencyStore } from '../store/emergencyStore';
import { Priority } from '../types/emergency';

const emergencyRoleMock = vi.hoisted(() => ({
  role: 'charge_nurse',
  roleLabel: 'Charge Nurse',
  can: () => true,
  presentAction: () => ({
    state: 'A',
    visible: true,
    enabled: true,
    readOnly: false,
    permission: null,
  }),
}));

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
}));

vi.mock('../hooks/useNotificationCenter', () => ({
  useNotificationCenter: () => ({
    productLabel: 'CareDroid',
    loading: false,
    refreshError: null,
    unreadAlertCount: 0,
    visibleNotificationAlerts: [],
    alertTriage: { counts: { critical: 0, high: 0, medium: 0 }, suppressed: [], all: [], visible: [] },
    showInformationalAlerts: false,
    setShowInformationalAlerts: vi.fn(),
    patientById: new Map(),
    openAlertRoute: vi.fn(),
    recordAlertAcknowledged: vi.fn(),
    openPanel: vi.fn(),
  }),
}));

const originalState = useEmergencyStore.getState();

function respiratoryFailureArrival() {
  return {
    id: 'ems-respiratory-failure-test',
    unitId: 'ems-unit-resp-test',
    unitName: 'Medic 42',
    crewNames: ['Paramedic Test'],
    patientAge: 69,
    patientSex: 'Female',
    chiefComplaint: 'Respiratory failure',
    vitals: {
      recordedAt: '2026-06-12T09:00:00-04:00',
      hr: 124,
      bpSystolic: 96,
      bpDiastolic: 54,
      spo2: 82,
      temp: null,
      rr: 34,
      gcs: null,
      pain: null,
    },
    eta: 6,
    severity: 'Critical',
    dispatchTime: '2026-06-12T08:56:00-04:00',
    estimatedArrivalTime: new Date(Date.now() + 6 * 60_000).toISOString(),
    notes: 'Hypoxic respiratory failure, possible NIV or airway escalation.',
    status: 'Inbound',
    prearrivalComplaint: 'Respiratory failure with hypoxia',
    priority: Priority.P1,
  };
}

function seedCriticalArrival() {
  act(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        emsArrivals: [],
        selectedPatientId: null,
      },
      true,
    );
    useEmergencyStore.getState().addEMSArrival(respiratoryFailureArrival());
  });
}

function renderBroadcast() {
  return render(
    <MemoryRouter>
      <UserProvider>
        <NotificationShellProvider>
          <EMSCriticalBroadcast />
        </NotificationShellProvider>
      </UserProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
});

describe('EMSCriticalBroadcast', () => {
  it('uses the compact dock instead of a fullscreen overlay', () => {
    seedCriticalArrival();
    renderBroadcast();

    expect(screen.queryByText(/CRITICAL INCOMING/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Critical EMS inbound/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide prep/i })).toBeInTheDocument();
  });

  it('collapses and reopens the inline prep checklist', async () => {
    const user = userEvent.setup();
    seedCriticalArrival();
    renderBroadcast();

    await user.click(screen.getByRole('button', { name: /hide prep/i }));
    expect(screen.getByRole('button', { name: /show prep/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show prep/i }));
    expect(screen.getByRole('button', { name: /hide prep/i })).toBeInTheDocument();
  });

  it('marks prep complete without a fixed full-height lane', async () => {
    const user = userEvent.setup();
    seedCriticalArrival();
    renderBroadcast();

    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole('button', { name: /mark prep complete/i }));

    expect(screen.getByText(/Prep complete by/i)).toBeInTheDocument();
    expect(
      useEmergencyStore
        .getState()
        .emsArrivals.find((arrival) => arrival.id === 'ems-respiratory-failure-test')?.criticalChecklist,
    ).toMatchObject({
      completedByStaffName: expect.any(String),
      completedAt: expect.any(String),
    });
  });
});