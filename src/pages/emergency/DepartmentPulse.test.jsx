import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DepartmentPulse from './DepartmentPulse';
import { useEmergencyStore } from '../../../store/emergencyStore';

const originalState = useEmergencyStore.getState();
const lastViewKey = 'caredroid.ed.departmentPulse.lastView.v1';

describe('DepartmentPulse', () => {
  beforeEach(() => {
    localStorage.setItem(
      lastViewKey,
      JSON.stringify({
        viewedAt: new Date(Date.now() - 47 * 60_000).toISOString(),
        capacityRisk: 'Yellow',
        activePatientCount: originalState.patients.length,
      })
    );
    act(() => {
      useEmergencyStore.setState({ ...originalState, selectedPatientId: null }, true);
    });
  });

  afterEach(() => {
    localStorage.removeItem(lastViewKey);
    act(() => {
      useEmergencyStore.setState(originalState, true);
    });
  });

  it('renders high-density charge nurse department status', async () => {
    render(
      <MemoryRouter>
        <DepartmentPulse />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /You were away/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Active patients')).toBeInTheDocument();
    expect(screen.getByText('Capacity score')).toBeInTheDocument();
    expect(screen.getByText('High risk')).toBeInTheDocument();
    expect(screen.getAllByText('Reassessment due').length).toBeGreaterThan(0);
    expect(screen.getByText('EMS inbound')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Attention List/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Queue Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Staff Snapshot/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Live\. Updated/i)).toBeInTheDocument();
  });
});
