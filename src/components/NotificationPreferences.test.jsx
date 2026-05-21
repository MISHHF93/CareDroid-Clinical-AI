import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationPreferences from './NotificationPreferences';
import { NotificationService } from '../services/NotificationService';

vi.mock('./NotificationPreferences.css', () => ({}));

vi.mock('../services/NotificationService', () => ({
  NotificationService: {
    getPreferences: vi.fn(),
    getUnreadCount: vi.fn(),
    fetchNotificationHistory: vi.fn(),
    fetchDevices: vi.fn(),
    updatePreferences: vi.fn(),
    toggleAllNotifications: vi.fn(),
    markAllAsRead: vi.fn(),
    removeDevice: vi.fn(),
  },
}));

const backendPreferences = {
  preferences: {
    emergencyAlerts: true,
    medicationReminders: true,
    appointmentReminders: false,
    labResults: true,
    marketingCommunications: false,
    securityAlerts: true,
    systemUpdates: true,
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  },
};

function arrangeSuccessfulLoad() {
  NotificationService.getPreferences.mockResolvedValue(backendPreferences);
  NotificationService.getUnreadCount.mockResolvedValue(2);
  NotificationService.fetchNotificationHistory.mockResolvedValue({
    notifications: [
      {
        id: 'n1',
        title: 'Lab ready',
        body: 'CBC results are available.',
        type: 'lab_results',
        readAt: null,
      },
    ],
  });
  NotificationService.fetchDevices.mockResolvedValue([
    {
      id: 'device-1',
      platform: 'web',
      deviceModel: 'Chrome on Windows',
      osVersion: 'Windows',
      appVersion: '1.0.0',
      lastUsedAt: '2026-05-21T20:00:00.000Z',
    },
  ]);
  NotificationService.updatePreferences.mockResolvedValue(backendPreferences);
  NotificationService.markAllAsRead.mockResolvedValue({ success: true });
  NotificationService.removeDevice.mockResolvedValue(true);
}

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    arrangeSuccessfulLoad();
  });

  it('shows unread count, backend preference clarity, and registered device cards', async () => {
    render(<NotificationPreferences />);

    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(screen.getByText(/2 unread notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Lab ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Chrome on Windows/i)).toBeInTheDocument();
    expect(screen.getByText(/this page does not create scheduled reminders/i)).toBeInTheDocument();
  });

  it('marks all notifications as read through the bulk route', async () => {
    render(<NotificationPreferences />);

    const markAll = await screen.findByRole('button', { name: /mark all as read/i });
    fireEvent.click(markAll);

    await waitFor(() => expect(NotificationService.markAllAsRead).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/0 unread notifications/i)).toBeInTheDocument();
  });

  it('requires confirmation before removing a registered device', async () => {
    render(<NotificationPreferences />);

    const removeButton = await screen.findByRole('button', { name: /remove device/i });
    fireEvent.click(removeButton);
    expect(screen.getByRole('dialog', { name: /remove notification device/i })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /remove device/i }).at(-1));

    await waitFor(() => expect(NotificationService.removeDevice).toHaveBeenCalledWith('device-1'));
    expect(screen.queryByText(/Chrome on Windows/i)).not.toBeInTheDocument();
  });
});
