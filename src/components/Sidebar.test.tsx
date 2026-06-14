import { render, screen, waitFor, within } from '@testing-library/react';
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
    const desktopNav = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    );

    for (const [label, path] of [
      ['Whiteboard', '/emergency/whiteboard'],
      ['Patients', '/emergency/patients'],
      ['EMS', '/emergency/ems'],
      ['Intake', '/emergency/intake'],
      ['Queues', '/emergency/queues'],
      ['Reassess', '/emergency/reassessment'],
      ['Capacity', '/emergency/capacity'],
      ['Boarding', '/emergency/boarding'],
      ['Referrals', '/emergency/referrals'],
      ['Copilot', '/emergency/copilot'],
    ]) {
      const link = desktopNav.getByRole('link', { name: label });
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe(path);
      expect(link.getAttribute('title')).toBe(label);
    }

    for (const hiddenLabel of ['Analytics', 'Settings', 'Pulse', 'Provincial', 'Integrations']) {
      expect(desktopNav.queryByRole('link', { name: hiddenLabel })).toBeNull();
    }
    expect(desktopNav.queryByRole('link', { name: 'AI Governance' })).toBeNull();
  });

  it('renders only read-only visible pages and marks the active route', () => {
    renderSidebar('read_only_viewer', '/emergency/capacity');
    const desktopNav = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    );

    expect(desktopNav.getByRole('link', { name: 'Capacity' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(desktopNav.getByRole('link', { name: 'Whiteboard' })).toBeTruthy();
    expect(desktopNav.getByRole('link', { name: 'Patients' })).toBeTruthy();
    expect(desktopNav.getByRole('link', { name: 'Queues' })).toBeTruthy();
    expect(desktopNav.queryByRole('link', { name: 'Settings' })).toBeNull();
    expect(desktopNav.queryByRole('link', { name: 'AI Governance' })).toBeNull();
  });

  it('renders distinct icon keys for each pilot sidebar item', () => {
    renderSidebar('admin');
    const desktopNav = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    );
    const expectedIconKeyByLabel = new Map([
      ['Whiteboard', 'layout-dashboard'],
      ['Patients', 'emergency-patients'],
      ['EMS', 'ambulance'],
      ['Intake', 'intake'],
      ['Queues', 'queues'],
      ['Reassess', 'reassessment'],
      ['Capacity', 'capacity'],
      ['Boarding', 'boarding'],
      ['Referrals', 'referrals'],
      ['Copilot', 'ed-copilot'],
    ]);
    const iconKeys: string[] = [];

    for (const [label, iconKey] of expectedIconKeyByLabel) {
      const link = desktopNav.getByRole('link', { name: label });
      expect(link.getAttribute('data-icon-key')).toBe(iconKey);
      iconKeys.push(link.getAttribute('data-icon-key') || '');
    }

    expect(new Set(iconKeys).size).toBe(iconKeys.length);
  });

  it('hides feature-gated navigation items when their feature is disabled', async () => {
    const previousFlags = useEmergencyStore.getState().flags;
    const previousOverrides = useEmergencyStore.getState().overrides;
    useEmergencyStore.setState({
      flags: { ...previousFlags, ems_pipeline: false },
      overrides: { ...previousOverrides, ems_pipeline: false },
    });

    try {
      renderSidebar('admin');
      const desktopNav = within(
        screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
      );

      await waitFor(() => {
        expect(desktopNav.queryByRole('link', { name: 'EMS' })).toBeNull();
      });
      expect(desktopNav.getByRole('link', { name: 'Whiteboard' })).toBeTruthy();
    } finally {
      useEmergencyStore.setState({
        flags: previousFlags,
        overrides: previousOverrides,
      });
    }
  });
});
