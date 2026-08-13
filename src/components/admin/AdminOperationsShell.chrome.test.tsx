import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminOperationsShell from './AdminOperationsShell';
import { TeamManagement } from '../../pages/team/TeamManagement';
import { RouteChromeProvider, useRouteChrome } from '../../contexts/RouteChromeContext';

/**
 * HEAL-186: AdminOperationsShell (wraps every /admin/* route via <Outlet/>) rendered its own
 * static <h1>Operations console</h1> regardless of which child route was active, while
 * AppShell's ShellRouteTab ALSO renders a real shell-level <h1> for the specific route -- for a
 * page like TeamManagement (which also rendered its own <h1>Team Management</h1>), that meant 3
 * real <h1> elements for one screen. This proves the fix end-to-end: AdminOperationsShell +
 * TeamManagement + a real ShellRouteTab consumer together yield exactly one real <h1>, with the
 * page-specific title (not the shell's generic fallback).
 */
vi.mock('../../pages/team/TeamManagement.css', () => ({}));
vi.mock('../../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(() => false),
  UNSUPPORTED_CAPABILITY_MESSAGE: 'Team management unavailable in this environment.',
}));
vi.mock('../../services/apiClient', () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  getStoredAccessToken: vi.fn(() => 'token'),
}));

function ShellRouteTabStub({ fallbackTitle }: { fallbackTitle: string }) {
  const { chrome } = useRouteChrome();
  return <h1>{(chrome.title as string) ?? fallbackTitle}</h1>;
}

describe('AdminOperationsShell + child route chrome (HEAL-186)', () => {
  it('renders exactly one real <h1>, carrying the child route\'s own title, not the shell\'s static "Operations console" text', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/team']}>
        <RouteChromeProvider>
          <ShellRouteTabStub fallbackTitle="Operations console" />
          <Routes>
            <Route path="/admin" element={<AdminOperationsShell />}>
              <Route path="team" element={<TeamManagement />} />
            </Route>
          </Routes>
        </RouteChromeProvider>
      </MemoryRouter>,
    );

    const headings = await screen.findAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Team Management');
  });
});
