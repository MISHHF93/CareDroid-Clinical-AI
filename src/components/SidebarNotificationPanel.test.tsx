import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserProvider } from '../contexts/UserContext';
import { NotificationShellProvider } from '../contexts/NotificationShellContext';
import { useEmergencyStore } from '../store/emergencyStore';
import SidebarNotificationPanel from './SidebarNotificationPanel';

vi.mock('../hooks/useNotificationCenter', () => ({
  useNotificationCenter: () => ({
    productLabel: 'CareDroid',
    loading: false,
    refreshError: null,
    unreadAlertCount: 2,
    visibleNotificationAlerts: [
      {
        id: 'alert-1',
        title: 'Admission overload',
        message: 'Median wait exceeds target',
        createdAt: new Date().toISOString(),
        read: false,
        acknowledged: false,
        dismissed: false,
      },
    ],
    alertTriage: { counts: { critical: 1, high: 1 }, suppressed: [], all: [], visible: [] },
    alertsSurfaceMetrics: [],
    groupedOperationalAlerts: { byMetric: {} },
    showInformationalAlerts: false,
    setShowInformationalAlerts: vi.fn(),
    patientById: new Map(),
    navigateEmergencyRoute: vi.fn(),
    recordAlertRead: vi.fn(),
    recordAlertAcknowledged: vi.fn(),
    recordAlertDismissed: vi.fn(),
    openAlertRoute: () => ({
      key: 'open',
      label: 'Open module',
      disabled: true,
      disabledLabel: 'No target available',
    }),
    markAllNotificationsRead: vi.fn(),
  }),
}));

function renderPanel() {
  return render(
    <MemoryRouter>
      <UserProvider>
        <NotificationShellProvider>
          <button
            type="button"
            onClick={() => document.dispatchEvent(new Event('open-notification-center'))}
          >
            Open
          </button>
          <SidebarNotificationPanel />
        </NotificationShellProvider>
      </UserProvider>
    </MemoryRouter>,
  );
}

describe('SidebarNotificationPanel', () => {
  it('opens from the notification shell event and lists alerts', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog', { name: /alerts/i });
    expect(within(dialog).getByRole('heading', { name: /^alerts$/i })).toBeInTheDocument();
    expect(within(dialog).getByText('Admission overload')).toBeInTheDocument();
  });

  it('HEAL-271: closes on Escape, not just backdrop click', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: /alerts/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /alerts/i })).not.toBeInTheDocument();
  });

  describe('HEAL-313: mutual exclusivity with Copilot', () => {
    afterEach(() => {
      useEmergencyStore.getState().setCopilotOpen(false);
    });

    it('opening the notification panel closes an already-open Copilot', () => {
      useEmergencyStore.getState().setCopilotOpen(true);
      expect(useEmergencyStore.getState().copilotOpen).toBe(true);

      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));

      expect(screen.getByRole('dialog', { name: /alerts/i })).toBeInTheDocument();
      // Before HEAL-313, Copilot's open state (in the Zustand store) and this
      // panel's open state (in NotificationShellContext) were completely
      // uncoordinated -- opening one never affected the other, so both could
      // be open and interactive at once, with this panel's backdrop/content
      // blocking clicks on the page underneath.
      expect(useEmergencyStore.getState().copilotOpen).toBe(false);
    });

    it('opening Copilot while the notification panel is open closes the panel', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('dialog', { name: /alerts/i })).toBeInTheDocument();

      act(() => {
        useEmergencyStore.getState().setCopilotOpen(true);
      });

      expect(screen.queryByRole('dialog', { name: /alerts/i })).not.toBeInTheDocument();
      expect(useEmergencyStore.getState().copilotOpen).toBe(true);
    });
  });
});
