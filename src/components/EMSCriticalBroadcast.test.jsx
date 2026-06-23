import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EMSCriticalBroadcast from './EMSCriticalBroadcast';
import { useEmergencyStore } from '../../store/emergencyStore';
import { Priority } from '../types/emergency';

const emergencyRoleMock = vi.hoisted(() => ({
  role: 'charge_nurse',
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
      true
    );
    useEmergencyStore.getState().addEMSArrival(respiratoryFailureArrival());
  });
}

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
});

describe('EMSCriticalBroadcast', () => {
  it('minimizes and reopens the respiratory failure checklist', async () => {
    const user = userEvent.setup();
    seedCriticalArrival();

    render(<EMSCriticalBroadcast />);

    const checklist = screen.getByRole('complementary', {
      name: /Respiratory Failure Preparation Checklist/i,
    });
    await user.click(within(checklist).getByRole('button', { name: /minimize/i }));

    expect(
      screen.queryByRole('complementary', { name: /Respiratory Failure Preparation Checklist/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reopen prep/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reopen prep/i }));

    expect(
      screen.getByRole('complementary', { name: /Respiratory Failure Preparation Checklist/i })
    ).toBeInTheDocument();
  });

  it('marks prep complete and removes the fixed checklist lane', async () => {
    const user = userEvent.setup();
    seedCriticalArrival();

    render(<EMSCriticalBroadcast />);

    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole('button', { name: /mark prep complete/i }));

    expect(
      screen.queryByRole('complementary', { name: /Respiratory Failure Preparation Checklist/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Prep complete by/i)).toBeInTheDocument();
    expect(
      useEmergencyStore
        .getState()
        .emsArrivals.find((arrival) => arrival.id === 'ems-respiratory-failure-test')?.criticalChecklist
    ).toMatchObject({
      completedByStaffName: expect.any(String),
      completedAt: expect.any(String),
    });
  });
});
