import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { UserProvider } from '../contexts/UserContext';
import { NotificationShellProvider } from '../contexts/NotificationShellContext';
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
          <button type="button" onClick={() => document.dispatchEvent(new Event('open-notification-center'))}>
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
});