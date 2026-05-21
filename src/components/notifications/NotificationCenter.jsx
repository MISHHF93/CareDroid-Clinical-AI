import { useState, useEffect, useRef } from 'react';
import './NotificationCenter.css';

/**
 * NotificationCenter Component
 * 
 * Dropdown notification feed with unread count badge
 * Shows critical alerts, system updates, and feature announcements
 * 
 * @param {Array<{id, title, message, type, timestamp, read, action}>} notifications - List of notifications
 * @param {Function} onMarkAsRead - Callback when notification is marked as read
 * @param {Function} onDelete - Callback when notification is deleted
 * @param {Function} onAction - Callback when notification action is clicked
 */
export const NotificationCenter = ({
  notifications = [],
  onMarkAsRead,
  onDelete,
  onAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, critical, updates, announcements
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const getNotificationIcon = (type) => {
    const icons = {
      critical: '🚨',
      alert: '⚠️',
      success: '✅',
      update: '📦',
      announcement: '📢',
      info: 'ℹ️',
    };
    return icons[type] || 'ℹ️';
  };

  const handleMarkAsRead = (id, e) => {
    e.stopPropagation();
    onMarkAsRead?.(id);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      onMarkAsRead?.(notification.id);
    }
    if (notification.action?.onClick) {
      onAction?.(notification);
    }
  };

  const markAllAsRead = () => {
    notifications
      .filter(n => !n.read)
      .forEach(n => onMarkAsRead?.(n.id));
  };

  return (
    <div className="notification-center" ref={containerRef}>
      {/* Bell Icon with Badge */}
      <button
        className="notification-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="notification-bell">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown" role="dialog" aria-labelledby="notification-title">
          <div className="notification-header">
            <h2 id="notification-title" className="notification-title">Notifications</h2>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="notification-filters">
            {['all', 'critical', 'updates', 'announcements'].map((tab) => (
              <button
                key={tab}
                className={`notification-filter-btn ${filter === tab ? 'notification-filter-active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="notification-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item notification-item-${notification.type} ${
                    !notification.read ? 'notification-item-unread' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="notification-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-item-content">
                    <h4 className="notification-item-title">{notification.title}</h4>
                    <p className="notification-item-message">{notification.message}</p>
                    <span className="notification-item-time">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>

                  <div className="notification-item-actions">
                    {!notification.read && (
                      <button
                        className="notification-item-mark"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        •
                      </button>
                    )}
                    <button
                      className="notification-item-delete"
                      onClick={(e) => handleDelete(notification.id, e)}
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="notification-empty">
                <p>No notifications</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer">
            <a href="/notifications" className="notification-footer-link">
              View all notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * NotificationPreferences Component
 * 
 * Settings page for managing notification preferences
 */
export const NotificationPreferences = ({
  onSave,
  onCancel,
}) => {
  const [preferences, setPreferences] = useState({
    email: {
      critical: true,
      updates: true,
      announcements: false,
    },
    inApp: {
      critical: true,
      updates: true,
      announcements: true,
    },
    push: {
      critical: true,
      updates: false,
      announcements: false,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  });

  const handleChange = (channel, type, value) => {
    setPreferences(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: value,
      },
    }));
  };

  const handleQuietHoursChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave?.(preferences);
  };

  return (
    <div className="notification-preferences">
      <div className="preferences-header">
        <h2>Notification Preferences</h2>
        <p>Manage how and when you receive notifications</p>
      </div>

      <div className="preferences-sections">
        {/* Email Notifications */}
        <section className="preference-section">
          <h3>📧 Email Notifications</h3>
          <div className="preference-options">
            <PreferenceCheckbox
              label="Critical Alerts"
              description="Emergency detection, severe warnings"
              checked={preferences.email.critical}
              onChange={(value) => handleChange('email', 'critical', value)}
              required
            />
            <PreferenceCheckbox
              label="Updates"
              description="System updates, new features"
              checked={preferences.email.updates}
              onChange={(value) => handleChange('email', 'updates', value)}
            />
            <PreferenceCheckbox
              label="Announcements"
              description="News, product announcements"
              checked={preferences.email.announcements}
              onChange={(value) => handleChange('email', 'announcements', value)}
            />
          </div>
        </section>

        {/* In-App Notifications */}
        <section className="preference-section">
          <h3>🔔 In-App Notifications</h3>
          <div className="preference-options">
            <PreferenceCheckbox
              label="Critical Alerts"
              description="Emergency detection, severe warnings"
              checked={preferences.inApp.critical}
              onChange={(value) => handleChange('inApp', 'critical', value)}
              required
            />
            <PreferenceCheckbox
              label="Updates"
              description="System updates, new features"
              checked={preferences.inApp.updates}
              onChange={(value) => handleChange('inApp', 'updates', value)}
            />
            <PreferenceCheckbox
              label="Announcements"
              description="News, product announcements"
              checked={preferences.inApp.announcements}
              onChange={(value) => handleChange('inApp', 'announcements', value)}
            />
          </div>
        </section>

        {/* Push Notifications */}
        <section className="preference-section">
          <h3>📱 Push Notifications</h3>
          <div className="preference-options">
            <PreferenceCheckbox
              label="Critical Alerts"
              description="Emergency detection, severe warnings"
              checked={preferences.push.critical}
              onChange={(value) => handleChange('push', 'critical', value)}
              required
            />
            <PreferenceCheckbox
              label="Updates"
              description="System updates, new features"
              checked={preferences.push.updates}
              onChange={(value) => handleChange('push', 'updates', value)}
            />
            <PreferenceCheckbox
              label="Announcements"
              description="News, product announcements"
              checked={preferences.push.announcements}
              onChange={(value) => handleChange('push', 'announcements', value)}
            />
          </div>
        </section>

        {/* Quiet Hours */}
        <section className="preference-section">
          <h3>🌙 Quiet Hours</h3>
          <p className="preference-description">
            Disable non-critical notifications during specified hours (except emergencies)
          </p>
          <div className="preference-quiet-hours">
            <label className="preference-checkbox-label">
              <input
                type="checkbox"
                checked={preferences.quietHours.enabled}
                onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
              />
              <span>Enable Quiet Hours</span>
            </label>

            {preferences.quietHours.enabled && (
              <div className="quiet-hours-inputs">
                <div className="input-group">
                  <label htmlFor="quiet-start">Start Time</label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="quiet-end">End Time</label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Actions */}
      <div className="preferences-actions">
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-save" onClick={handleSave}>
          Save Preferences
        </button>
      </div>
    </div>
  );
};

/**
 * Preference Checkbox Helper Component
 */
const PreferenceCheckbox = ({ label, description, checked, onChange, required }) => {
  return (
    <label className="preference-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={required}
      />
      <div className="preference-checkbox-content">
        <span className="preference-checkbox-label">{label}</span>
        {description && (
          <span className="preference-checkbox-description">{description}</span>
        )}
        {required && <span className="preference-checkbox-required">(Required)</span>}
      </div>
    </label>
  );
};

/**
 * Helper function to format relative time
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
