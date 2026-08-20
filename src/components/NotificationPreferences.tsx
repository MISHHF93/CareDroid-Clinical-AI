import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationService } from '../services/NotificationService';
import './NotificationPreferences.css';

const DEFAULT_PREFERENCES = Object.freeze({
  emergencyAlerts: true,
  medicationReminders: true,
  appointmentReminders: true,
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
});

const CHANNEL_PREFERENCES = [
  {
    key: 'pushEnabled',
    label: 'Push notifications',
    description: 'Delivered only to registered devices listed below.',
  },
  {
    key: 'emailEnabled',
    label: 'Email notifications',
    description: 'Uses the email address on your authenticated account.',
  },
  {
    key: 'smsEnabled',
    label: 'SMS notifications',
    description: 'Preference only. SMS delivery depends on configured backend support.',
  },
];

const TYPE_PREFERENCES = [
  {
    key: 'emergencyAlerts',
    label: 'Emergency alerts',
    description: 'High-priority safety and escalation messages.',
  },
  {
    key: 'medicationReminders',
    label: 'Medication reminders',
    description: 'Controls delivery preference only; this page does not create reminders.',
  },
  {
    key: 'appointmentReminders',
    label: 'Appointment reminders',
    description: 'Controls delivery preference only; scheduling requires a separate backend API.',
  },
  {
    key: 'labResults',
    label: 'Lab results',
    description: 'Notifications for lab result availability or related updates.',
  },
  {
    key: 'securityAlerts',
    label: 'Security alerts',
    description: 'Account, login, and access-related notices.',
  },
  {
    key: 'systemUpdates',
    label: 'System updates',
    description: 'Product and maintenance notices.',
  },
  {
    key: 'marketingCommunications',
    label: 'Marketing communications',
    description: 'Optional announcements and non-clinical updates.',
  },
];

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatNotificationType(type) {
  return String(type || 'notification').replace(/[_-]/g, ' ').toLowerCase();
}

function NotificationPreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<any>(null);
  const [confirmDevice, setConfirmDevice] = useState<any>(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // HEAL-263: this custom confirm dialog (used instead of the shared
  // ConfirmDialogProvider) had a backdrop with role="presentation" but no
  // onClick, and no Escape handler -- unlike the shared confirm dialog,
  // keyboard/mouse users could only dismiss it via the two buttons
  // themselves.
  useEffect(() => {
    if (!confirmDevice) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmDevice(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [confirmDevice]);

  const unreadLabel = useMemo(
    () => `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`,
    [unreadCount]
  );

  const loadNotificationData = useCallback(async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });

    const [preferencesResult, unreadResult, notificationsResult, devicesResult] = await Promise.allSettled([
      NotificationService.getPreferences(),
      NotificationService.getUnreadCount(),
      NotificationService.fetchNotificationHistory(10),
      NotificationService.fetchDevices(),
    ]);

    if (preferencesResult.status === 'fulfilled') {
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(preferencesResult.value?.preferences || preferencesResult.value || {}),
      });
    }

    if (unreadResult.status === 'fulfilled') {
      setUnreadCount(unreadResult.value || 0);
    }

    if (notificationsResult.status === 'fulfilled') {
      setNotifications(notificationsResult.value?.notifications || []);
    }

    if (devicesResult.status === 'fulfilled') {
      setDevices(devicesResult.value || []);
    }

    const firstError = [preferencesResult, unreadResult, notificationsResult, devicesResult].find(
      (result) => result.status === 'rejected'
    );
    if (firstError) {
      setStatus({
        type: 'error',
        message: firstError.reason?.message || 'Some notification data could not be loaded.',
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotificationData();
  }, [loadNotificationData]);

  const handlePreferenceChange = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setStatus({ type: '', message: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await NotificationService.updatePreferences(preferences);
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(result?.preferences || preferences),
      });
      setStatus({ type: 'success', message: 'Notification preferences saved.' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAll = async (enabled) => {
    setSaving(true);
    try {
      await NotificationService.toggleAllNotifications(enabled);
      await loadNotificationData();
      setStatus({
        type: 'success',
        message: `All notification preferences ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to update all preferences.' });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await NotificationService.markAllAsRead();
      const readAt = new Date().toISOString();
      setUnreadCount(0);
      setNotifications((current) => current.map((notification) => ({ ...notification, readAt })));
      setStatus({ type: 'success', message: 'All notifications marked as read.' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to mark notifications as read.' });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleRemoveDevice = async () => {
    if (!confirmDevice) return;
    const identifier = confirmDevice.token || confirmDevice.id;
    setRemovingDeviceId(confirmDevice.id);

    try {
      await NotificationService.removeDevice(identifier);
      setDevices((current) => current.filter((device) => device.id !== confirmDevice.id));
      setConfirmDevice(null);
      setStatus({ type: 'success', message: 'Notification device removed.' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to remove notification device.' });
    } finally {
      setRemovingDeviceId(null);
    }
  };

  return (
    <div className="notification-preferences">
      <div className="preferences-header">
        <p className="preferences-eyebrow">Notifications</p>
        <h2>Notification Preferences</h2>
        <p>Manage unread state, delivery channels, and devices through protected notification APIs.</p>
      </div>

      {status.message && (
        <div className={`notification-status notification-status--${status.type}`} role="status">
          {status.message}
        </div>
      )}

      <div className="preferences-container">
        <section className="preferences-section notification-overview-card">
          <div className="notification-section-header">
            <div>
              <h3>Unread Notifications</h3>
              <p className="section-help">Count is loaded from the protected unread-count route.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={loadNotificationData} disabled={loading}>
              Refresh
            </button>
          </div>

          <div className="notification-unread-strip">
            <div>
              <span className="unread-count">{loading ? '...' : unreadCount}</span>
              <span className="unread-label">{unreadLabel}</span>
            </div>
            <button
              type="button"
              className="save-btn"
              onClick={handleMarkAllAsRead}
              disabled={loading || markingAllRead || unreadCount === 0}
            >
              {markingAllRead ? 'Marking...' : 'Mark all as read'}
            </button>
          </div>

          <div className="notification-recent-list" aria-label="Recent notifications">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-recent-item${notification.readAt ? '' : ' notification-recent-item--unread'}`}
                >
                  <div>
                    <strong>{notification.title || formatNotificationType(notification.type)}</strong>
                    <p>{notification.body || 'No message body provided.'}</p>
                  </div>
                  <span>{notification.readAt ? 'Read' : 'Unread'}</span>
                </article>
              ))
            ) : (
              <p className="empty-note">{loading ? 'Loading notifications...' : 'No notifications returned yet.'}</p>
            )}
          </div>
        </section>

        <section className="preferences-section">
          <div className="notification-section-header">
            <div>
              <h3>Delivery Channels</h3>
              <p className="section-help">These settings control delivery eligibility; they do not create scheduled reminders.</p>
            </div>
            <div className="bulk-preference-actions">
              <button type="button" className="secondary-btn" onClick={() => handleToggleAll(true)} disabled={saving}>
                Enable all
              </button>
              <button type="button" className="secondary-btn secondary-btn--danger" onClick={() => handleToggleAll(false)} disabled={saving}>
                Disable all
              </button>
            </div>
          </div>

          {CHANNEL_PREFERENCES.map((item) => (
            <PreferenceToggle
              key={item.key}
              item={item}
              checked={Boolean(preferences[item.key])}
              onChange={(value) => handlePreferenceChange(item.key, value)}
            />
          ))}
        </section>

        <section className="preferences-section">
          <h3>Notification Types</h3>
          <p className="section-help">
            Medication and appointment reminders are preferences only. This page does not create scheduled reminders because no scheduler creation API is exposed here.
          </p>

          {TYPE_PREFERENCES.map((item) => (
            <PreferenceToggle
              key={item.key}
              item={item}
              checked={Boolean(preferences[item.key])}
              onChange={(value) => handlePreferenceChange(item.key, value)}
            />
          ))}
        </section>

        <section className="preferences-section">
          <h3>Quiet Hours</h3>
          <PreferenceToggle
            item={{
              key: 'quietHoursEnabled',
              label: 'Quiet hours',
              description: 'Suppress eligible non-critical delivery during the selected window.',
            }}
            checked={Boolean(preferences.quietHoursEnabled)}
            onChange={(value) => handlePreferenceChange('quietHoursEnabled', value)}
          />
          <div className="quiet-hours-grid">
            <label>
              Start
              <input
                type="time"
                value={preferences.quietHoursStart || '22:00'}
                onChange={(e) => handlePreferenceChange('quietHoursStart', e.target.value)}
                disabled={!preferences.quietHoursEnabled}
              />
            </label>
            <label>
              End
              <input
                type="time"
                value={preferences.quietHoursEnd || '08:00'}
                onChange={(e) => handlePreferenceChange('quietHoursEnd', e.target.value)}
                disabled={!preferences.quietHoursEnabled}
              />
            </label>
          </div>
        </section>

        <section className="preferences-section">
          <div className="notification-section-header">
            <div>
              <h3>Registered Devices</h3>
              <p className="section-help">Devices are listed from the protected notification device route.</p>
            </div>
            <span className="device-count">{devices.length} active</span>
          </div>

          <div className="notification-device-grid">
            {devices.length > 0 ? (
              devices.map((device) => (
                <article key={device.id} className="notification-device-card">
                  <div>
                    <h4>{device.deviceModel || `${device.platform || 'Unknown'} device`}</h4>
                    <p>{device.platform || 'Unknown platform'}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>OS</dt>
                      <dd>{device.osVersion || 'Not recorded'}</dd>
                    </div>
                    <div>
                      <dt>App</dt>
                      <dd>{device.appVersion || 'Not recorded'}</dd>
                    </div>
                    <div>
                      <dt>Last used</dt>
                      <dd>{formatDate(device.lastUsedAt)}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="secondary-btn secondary-btn--danger"
                    onClick={() => setConfirmDevice(device)}
                    disabled={removingDeviceId === device.id}
                  >
                    {removingDeviceId === device.id ? 'Removing...' : 'Remove device'}
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-note">
                {loading ? 'Loading registered devices...' : 'No push notification devices are registered.'}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="preferences-footer">
        <button type="button" className="save-btn" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {confirmDevice && (
        <div
          className="notification-confirm-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setConfirmDevice(null);
          }}
        >
          <div
            className="notification-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-device-title"
          >
            <h3 id="remove-device-title">Remove notification device?</h3>
            <p>
              This stops push notifications from being sent to{' '}
              <strong>{confirmDevice.deviceModel || confirmDevice.platform || 'this device'}</strong>. You can register
              it again later from the same device.
            </p>
            <div className="notification-confirm-actions">
              <button type="button" className="secondary-btn" onClick={() => setConfirmDevice(null)}>
                Cancel
              </button>
              <button type="button" className="save-btn save-btn--danger" onClick={handleRemoveDevice}>
                Remove device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PreferenceToggle({ item, checked, onChange }) {
  return (
    <div className="channel-toggle">
      <div className="toggle-header">
        <span>{item.label}</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-label={item.label}
          />
          <span className="slider"></span>
        </label>
      </div>
      <p className="channel-desc">{item.description}</p>
    </div>
  );
}

export default NotificationPreferences;
