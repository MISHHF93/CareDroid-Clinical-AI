import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { UserProvider } from '../contexts/UserContext';
import { getVisibleNavigation } from '../config/unified-navigation.config';
import { useEmergencyStore } from '../store/emergencyStore';
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
  it('renders only the requested Emergency OS pages for admin users', () => {
    renderSidebar('admin');

    for (const label of [
      'Emergency Whiteboard',
      'EMS Pipeline',
      'Referrals',
      'Capacity',
      'Clinical Tools',
      'Shift Summary',
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy();
    }

    expect(screen.queryByRole('link', { name: 'AI Governance' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Patients' })).toBeNull();
  });

  it('renders only read-only visible pages and marks the active route', () => {
    renderSidebar('read_only_viewer', '/emergency/capacity');

    expect(screen.getByRole('link', { name: 'Capacity' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Emergency Whiteboard' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'AI Governance' })).toBeNull();
  });

  it('hides feature-gated navigation items when their feature is disabled', () => {
    const previousFlags = useEmergencyStore.getState().flags;
    const previousOverrides = useEmergencyStore.getState().overrides;
    useEmergencyStore.setState({
      flags: { ...previousFlags, ems_pipeline: false },
      overrides: { ...previousOverrides, ems_pipeline: false },
    });

    try {
      renderSidebar('admin');

      expect(screen.queryByRole('link', { name: 'EMS Pipeline' })).toBeNull();
      expect(screen.getByRole('link', { name: 'Emergency Whiteboard' })).toBeTruthy();
    } finally {
      useEmergencyStore.setState({
        flags: previousFlags,
        overrides: previousOverrides,
      });
    }
  });
});
