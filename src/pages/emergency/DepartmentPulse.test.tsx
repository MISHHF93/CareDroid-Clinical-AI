import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DepartmentPulse from './pulse';
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
      useEmergencyStore.setState(
        {
          ...originalState,
          selectedPatientId: null,
          lastPulseView: Date.now() - 47 * 60_000,
        },
        true
      );
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

    expect(screen.getByText(/You were away/i)).toBeInTheDocument();
    expect(screen.getByText('Active patients')).toBeInTheDocument();
    expect(screen.getByText('Capacity score')).toBeInTheDocument();
    expect(screen.getByText('High risk')).toBeInTheDocument();
    expect(screen.getAllByText('Reassessment due').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EMS inbound').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Attention list/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Queue snapshot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Staff snapshot/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Live\. Updated/i)).toBeInTheDocument();
    expect(document.querySelector('.emergency-pulse__stat-strip')).toBeTruthy();
  });

  it('renders when browser storage is blocked', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    render(
      <MemoryRouter>
        <DepartmentPulse />
      </MemoryRouter>
    );

    expect(screen.getByText('Active patients')).toBeInTheDocument();
    expect(screen.getByText('Capacity score')).toBeInTheDocument();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
