import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProfileToolPreferences from './ProfileToolPreferences';
import {
  mockToolPreferencesValue,
  mockUserValue,
  mockWorkspaceValue,
} from '../../test/testRenderUtils';
import { getUserFacingToolRegistryProjection } from '../../data/toolInventory';

vi.mock('../../components/ui/card', () => ({
  default: ({ children }) => <section>{children}</section>,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: {
      role: 'physician',
      specialty: 'hospital medicine',
      department: 'inpatient',
    },
    preferences: {},
    activeWorkspace: { id: 'all', name: 'All Tools' },
    workspaceState: { activeWorkspaceId: 'all', effectivePermissions: [] },
  }),
}));

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockWorkspaceValue,
}));

describe('ProfileToolPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceValue.workspaces = [{ id: 'all', name: 'All Tools', toolIds: [] }];
    mockWorkspaceValue.activeWorkspaceId = 'all';
    mockToolPreferencesValue.favorites = [] as any[];
    mockToolPreferencesValue.pinned = [] as any[];
    mockToolPreferencesValue.recentTools = [] as any[];
    mockToolPreferencesValue.hiddenTools = [] as any[];
    mockToolPreferencesValue.profileSettings: any = {};
  });

  it('allows hidden tools to be restored from profile settings', () => {
    const hiddenTool = getUserFacingToolRegistryProjection().find((tool) => tool.category === 'Calculator');
    mockToolPreferencesValue.hiddenTools = [hiddenTool.id];

    render(<ProfileToolPreferences />);

    const row = screen.getByText(hiddenTool.name).closest('.profile-identity-row');
    expect(row).toHaveTextContent(/hidden/i);
    fireEvent.click(screen.getAllByRole('button', { name: /show tool/i })[0]);
    expect(mockToolPreferencesValue.toggleHidden).toHaveBeenCalledWith(hiddenTool.id);
  });

  it('saves role, specialty, workspace, and compact view choices', () => {
    render(<ProfileToolPreferences />);

    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'cardiologist' } });
    fireEvent.change(screen.getByLabelText(/specialty/i), { target: { value: 'cardiology' } });
    fireEvent.change(screen.getByLabelText(/default workspace/i), { target: { value: 'all' } });
    fireEvent.click(screen.getByLabelText(/compact tool view/i));

    expect(mockToolPreferencesValue.updateProfileSettings).toHaveBeenCalledWith({ role: 'cardiologist' });
    expect(mockToolPreferencesValue.updateProfileSettings).toHaveBeenCalledWith({ specialty: 'cardiology' });
    expect(mockToolPreferencesValue.updateProfileSettings).toHaveBeenCalledWith({ defaultWorkspace: 'all' });
    expect(mockToolPreferencesValue.updateProfileSettings).toHaveBeenCalledWith({ compactToolView: true });
  });
});
