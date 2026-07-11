import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SidebarChromeControls from './SidebarChromeControls';

vi.mock('../../contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({
    configDegraded: false,
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: () => ({
    chrome: {
      showSessionDevSegments: false,
    },
  }),
}));

vi.mock('../../contexts/HelpHubContext', () => ({
  dispatchOpenHelpHub: vi.fn(),
}));

describe('SidebarChromeControls', () => {
  it('does not render a second Copilot / Chat strip (AI entry is sidebar nav only)', () => {
    render(<SidebarChromeControls />);

    expect(screen.queryByText('CareDroid Copilot')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Chat$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Copilot panels/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guide/i })).toBeInTheDocument();
  });
});
