import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';
import { fetchMyAuditLogs, fetchPhiAccessLogs } from '../services/auditApi';
import { createMockUserValue } from '../test/testRenderUtils';

const mocks = vi.hoisted(() => ({
  user: {
    fullName: 'Test Student',
    email: 'student@example.com',
    role: 'student',
  },
  hasPermission: vi.fn(() => false),
}));

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () =>
      createMockUserValue({
        user: mocks.user,
        hasPermission: mocks.hasPermission,
      }),
  };
});

vi.mock('../services/auditApi', () => ({
  fetchMyAuditLogs: vi.fn(),
  fetchPhiAccessLogs: vi.fn(),
}));

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );
}

describe('Profile activity audit visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = {
      fullName: 'Test Student',
      email: 'student@example.com',
      role: 'student',
    };
    mocks.hasPermission.mockReturnValue(false);
    fetchMyAuditLogs.mockResolvedValue({
      ok: true,
      total: 1,
      logs: [
        {
          id: 'log-1',
          action: 'LOGIN',
          resource: 'auth/login',
          timestamp: '2026-05-21T12:00:00.000Z',
          phiAccessed: false,
        },
      ],
    });
    fetchPhiAccessLogs.mockResolvedValue({ ok: true, total: 0, logs: [] });
  });

  it('shows personal activity and restricted PHI empty state for normal users', async () => {
    renderProfile();

    expect(screen.getByRole('heading', { name: /profile activity \/ my access logs/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
    expect(fetchMyAuditLogs).toHaveBeenCalledWith(5);
    expect(fetchPhiAccessLogs).not.toHaveBeenCalled();
    expect(screen.getByText(/does not include direct PHI access-log visibility/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request audit\/export/i })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(screen.queryByRole('link', { name: /audit logs/i })).not.toBeInTheDocument();
  });

  it('loads PHI access visibility only when the role allows audit access', async () => {
    mocks.user = {
      fullName: 'Test Physician',
      email: 'physician@example.com',
      role: 'physician',
    };
    mocks.hasPermission.mockReturnValue(true);
    fetchPhiAccessLogs.mockResolvedValue({
      ok: true,
      total: 2,
      logs: [
        {
          id: 'phi-1',
          action: 'PHI_ACCESS',
          resource: 'patient/chart',
          timestamp: '2026-05-21T12:30:00.000Z',
          phiAccessed: true,
        },
      ],
    });

    renderProfile();

    await waitFor(() => {
      expect(fetchPhiAccessLogs).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/2 PHI access events/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open protected audit logs/i })).toHaveAttribute(
      'href',
      '/audit-logs'
    );
    expect(screen.queryByRole('link', { name: /request audit\/export/i })).not.toBeInTheDocument();
  });
});
