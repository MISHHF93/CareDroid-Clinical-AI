import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { UserProvider } from '../contexts/UserContext';
import { getVisibleNavigation } from '../config/unified-navigation.config';
import { Sidebar } from './Sidebar';

function renderSidebar(role: string, initialPath = '/emergency/whiteboard') {
  render(
    <UserProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar navigationItems={getVisibleNavigation(role)} />
      </MemoryRouter>
    </UserProvider>,
  );
}

describe('Sidebar unified navigation rendering', () => {
  it('renders all unified Emergency OS pages for admin users', () => {
    renderSidebar('admin');

    for (const label of [
      'Emergency Whiteboard',
      'EMS Intake',
      'Queues',
      'Reassessment',
      'Capacity',
      'Surge Management',
      'Safety Dashboard',
      'Virtual Care',
      'Wearable Monitor',
      'Patients',
      'ED Copilot',
      'AI Governance',
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('renders only read-only visible pages and marks the active route', () => {
    renderSidebar('read_only_viewer', '/emergency/analytics');

    expect(screen.getByRole('link', { name: 'Safety Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Emergency Whiteboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'AI Governance' })).not.toBeInTheDocument();
  });
});
