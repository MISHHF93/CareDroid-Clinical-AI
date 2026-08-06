import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileWorkspaces from './ProfileWorkspaces';

const switchWorkspace = vi.fn();

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    activeWorkspace: {
      id: 'hospital-1',
      type: 'hospital',
      name: 'Hospital Operations Workspace',
      branding: { displayName: 'Hospital Operations' },
      settings: { enabledToolIds: ['calculators'], enabledModules: ['dashboard'] },
    },
    workspaces: [
      {
        id: 'personal-1',
        type: 'personal',
        name: 'Personal Clinical Workspace',
        branding: { displayName: 'Personal Clinical Workspace' },
        settings: { enabledToolIds: ['calculators'], enabledModules: ['dashboard', 'tools'] },
      },
      {
        id: 'hospital-1',
        type: 'hospital',
        name: 'Hospital Operations Workspace',
        branding: { displayName: 'Hospital Operations' },
        settings: { enabledToolIds: ['medical-iot'], enabledModules: ['dashboard', 'medical-iot'] },
      },
      {
        id: 'research',
        type: 'research',
        name: 'Research Workspace',
        branding: { displayName: 'Research Workspace' },
        settings: { enabledToolIds: ['literature-review'], enabledModules: ['research'] },
      },
    ],
    workspaceState: {
      activeWorkspaceId: 'hospital-1',
      effectivePermissions: ['ACCESS_DASHBOARD', 'ACCESS_MEDICAL_IOT'],
    },
    switchWorkspace,
    isLoading: false,
    error: '',
  }),
}));

describe('ProfileWorkspaces', () => {
  it('renders workspace switching and effective permissions', async () => {
    render(<MemoryRouter><ProfileWorkspaces /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /workspaces/i })).toBeInTheDocument();
    expect(screen.getAllByText('Hospital Operations').length).toBeGreaterThan(0);
    expect(screen.queryByText('Research Workspace')).not.toBeInTheDocument();
    expect(screen.getByText('ACCESS_MEDICAL_IOT')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/active workspace/i), {
      target: { value: 'personal-1' },
    });
    await waitFor(() => {
      expect(switchWorkspace).toHaveBeenCalledWith('personal-1');
    });
  });
});
