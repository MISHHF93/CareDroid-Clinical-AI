import { describe, expect, it, vi } from 'vitest';

vi.mock('./sidebar/SidebarChromeControls', () => ({
  default: () => null,
}));

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProvider } from '../contexts/UserContext';
import { getVisibleNavigation } from '../config/unified-navigation.config';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag } from '../types/emergency';
import { Sidebar } from './Sidebar';

function renderSidebar(role: string, initialPath = '/emergency/whiteboard') {
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar navigationItems={getVisibleNavigation(role)} />
      </MemoryRouter>
    </UserProvider>,
  );
}

describe('Sidebar unified navigation rendering', () => {
  it('renders only the requested CareDroid pages for admin users', () => {
    renderSidebar('admin');
    const desktopNav = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    );

    for (const [label, path] of [
      ['Reception', '/emergency/reception'],
      ['Whiteboard', '/emergency/whiteboard'],
      ['Patients', '/emergency/patients'],
      ['EMS', '/emergency/ems'],
      ['Queues', '/emergency/queues'],
      ['Reassessment', '/emergency/reassessment'],
      ['Flow & Capacity', '/emergency/capacity'],
      ['Referrals', '/emergency/referrals'],
      ['Medical Tools', '/emergency/tools'],
      ['Analytics', '/emergency/analytics'],
      ['Settings', '/emergency/settings'],
    ]) {
      if (path) {
        const link = desktopNav.getByRole('link', { name: label as string });
        expect(link).toBeTruthy();
        expect(link.getAttribute('href')).toBe(path);
        expect(link.getAttribute('title')).toBe(label);
      } else {
        const button = desktopNav.getByRole('button', { name: label as string });
        expect(button).toBeTruthy();
        expect(button.getAttribute('title')).toBe(label);
        expect(button.getAttribute('aria-pressed')).toBe('false');
      }
    }

    // Exactly one conversational AI control → docked CareDroid Copilot.
    const copilotButtons = desktopNav.getAllByRole('button', { name: 'Copilot' });
    expect(copilotButtons).toHaveLength(1);
    expect(copilotButtons[0].getAttribute('data-nav-id')).toBe('copilot');
    expect(copilotButtons[0].getAttribute('data-ai-node')).toBe('caredroid-copilot');
    expect(copilotButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('button', { name: /CareDroid Copilot/i })).toBeNull();
    expect(screen.queryByText('CareDroid Copilot')).toBeNull();

    for (const hiddenLabel of ['Cosmos', 'Fleet', 'AI Governance']) {
      expect(desktopNav.queryByRole('link', { name: hiddenLabel })).toBeNull();
    }

    // Account is the header UserAccountMenu, not a sidebar utility link.
    expect(desktopNav.queryByRole('link', { name: 'Account' })).toBeNull();
  });

  it('renders only read-only visible pages and marks the active route', () => {
    renderSidebar('read_only_viewer', '/emergency/analytics');
    const desktopNav = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    );

    expect(desktopNav.getByRole('link', { name: 'Analytics' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(desktopNav.getByRole('link', { name: 'Whiteboard' })).toBeTruthy();
    expect(desktopNav.queryByRole('link', { name: 'Patients' })).toBeNull();
    expect(desktopNav.queryByRole('link', { name: 'Settings' })).toBeNull();
    expect(desktopNav.queryByRole('link', { name: 'AI Governance' })).toBeNull();
  });

  it('marks Medical Tools active without also activating Whiteboard', () => {
    renderSidebar('admin', '/emergency/tools');
    const desktopNav = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    );

    expect(desktopNav.getByRole('link', { name: 'Medical Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(desktopNav.getByRole('link', { name: 'Whiteboard' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('renders distinct icon keys for each pilot sidebar item', () => {
    renderSidebar('admin');
    const desktopNav = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    );
    const expectedIconKeyByLabel = new Map([
      ['Reception', 'user-check'],
      ['Whiteboard', 'layout-dashboard'],
      ['Patients', 'emergency-patients'],
      ['EMS', 'ambulance'],
      ['Queues', 'queues'],
      ['Reassessment', 'reassessment'],
      ['Flow & Capacity', 'capacity'],
      ['Referrals', 'referrals'],
      ['Medical Tools', 'clinical-tools'],
      ['Analytics', 'emergency-analytics'],
      ['Settings', 'settings'],
    ]);
    const iconKeys: string[] = [];

    for (const [label, iconKey] of expectedIconKeyByLabel) {
      const item = desktopNav.getByRole('link', { name: label });
      expect(item.getAttribute('data-icon-key')).toBe(iconKey);
      iconKeys.push(item.getAttribute('data-icon-key') || '');
    }

    const copilot = desktopNav.getByRole('button', { name: 'Copilot' });
    expect(copilot.getAttribute('data-icon-key')).toBe('ed-copilot');
    iconKeys.push(copilot.getAttribute('data-icon-key') || '');

    expect(new Set(iconKeys).size).toBe(iconKeys.length);
  });

  it('renders store-derived alert and reassessment badges without explicit navigation props', () => {
    const previousPatients = useEmergencyStore.getState().patients;
    const previousAlerts = useEmergencyStore.getState().alerts;
    useEmergencyStore.setState({
      patients: previousPatients.map((patient, index) => ({
        ...patient,
        flags:
          index < 2
            ? Array.from(new Set([...patient.flags, PatientFlag.ReassessmentDue]))
            : patient.flags.filter((flag) => flag !== PatientFlag.ReassessmentDue),
      })),
      alerts: [
        {
          id: 'sidebar-capacity-alert',
          type: 'Capacity',
          severity: 'Warning',
          title: 'Capacity pressure rising',
          message: 'Capacity is above target.',
          createdAt: new Date().toISOString(),
          dismissed: false,
          source: 'capacity',
        },
      ],
    });

    try {
      renderSidebar('admin');
      const desktopNav = within(
        screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
      );

      expect(
        within(desktopNav.getByRole('link', { name: 'Reassessment' })).getByLabelText(
          '2 active alerts',
        ),
      ).toBeTruthy();
      expect(
        within(desktopNav.getByRole('link', { name: 'Whiteboard' })).queryByLabelText(/active alert/),
      ).toBeNull();
    } finally {
      useEmergencyStore.setState({
        patients: previousPatients,
        alerts: previousAlerts,
      });
    }
  });

  it('keeps feature-gated navigation items visible when their feature is disabled', async () => {
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
        expect(desktopNav.getByRole('link', { name: 'EMS' })).toHaveAttribute(
          'href',
          '/emergency/ems',
        );
      });
      expect(desktopNav.getByRole('link', { name: 'Whiteboard' })).toBeTruthy();
    } finally {
      useEmergencyStore.setState({
        flags: previousFlags,
        overrides: previousOverrides,
      });
    }
  });

  it('scrolls the active nav item into view on mount (fixes the Queues item clipping at the scroll boundary next to the utility footer)', () => {
    // sidebar__body scrolls independently of the fixed sidebar__footer below
    // it -- correct, deliberate layout -- but nothing scrolled the active
    // item into view when landing directly on a route (a fresh mount, same
    // as this test's render), so an item whose nav entry fell near the
    // bottom edge of the body's initial scroll position rendered with its
    // icon and label clipped off. Checked for two different active routes to
    // prove the effect keys off whichever page is actually active, not one
    // hardcoded element.
    const scrollIntoView = window.HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>;

    scrollIntoView.mockClear();
    const first = renderSidebar('admin', '/emergency/queues');
    const queuesLink = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    ).getByRole('link', { name: 'Queues' });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(queuesLink);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    first.unmount();

    scrollIntoView.mockClear();
    renderSidebar('admin', '/emergency/analytics');
    const analyticsLink = within(
      screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
    ).getByRole('link', { name: 'Analytics' });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(analyticsLink);
  });

  it('toggles the docked Copilot panel closed on a second click (HEAL-211)', () => {
    // The desktop nav item renders aria-pressed={copilotOpen} and active-state
    // styling -- both signal a real toggle per WAI-ARIA authoring practices --
    // but its onClick previously always called setCopilotOpen(true)
    // unconditionally, so a second click while already open was a silent
    // no-op and the panel had no way to close from this entry point.
    const previousCopilotOpen = useEmergencyStore.getState().copilotOpen;
    useEmergencyStore.setState({ copilotOpen: false });

    try {
      renderSidebar('charge_nurse');
      const desktopNav = within(
        screen.getByRole('navigation', { name: 'Emergency desktop navigation' }),
      );
      const copilotButton = desktopNav.getByRole('button', { name: 'Copilot' });

      expect(copilotButton.getAttribute('aria-pressed')).toBe('false');
      fireEvent.click(copilotButton);
      expect(useEmergencyStore.getState().copilotOpen).toBe(true);

      fireEvent.click(copilotButton);
      expect(useEmergencyStore.getState().copilotOpen).toBe(false);
    } finally {
      useEmergencyStore.setState({ copilotOpen: previousCopilotOpen });
    }
  });
});