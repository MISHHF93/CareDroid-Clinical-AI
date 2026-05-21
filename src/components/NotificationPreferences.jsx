import React, { useState, useEffect } from 'react';
import './NotificationPreferences.css';

/**
 * Notification Preferences Component
 * Allows users to configure email, SMS, and in-app notifications
 */
function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    costAlerts: true,
    recommendationAlerts: true,
    emergencyAlerts: true,
    dailyDigest: false,
    digestTime: '09:00',
    costalertThreshold: 80, // Percentage
  });

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // In a real app, fetch from API
      const stored = localStorage.getItem('notificationPreferences');
      if (stored) {
        setPreferences(JSON.parse(stored));
      }

      const storedEmail = localStorage.getItem('userEmail');
      const storedPhone = localStorage.getItem('userPhone');
      if (storedEmail) setEmail(storedEmail);
      if (storedPhone) setPhone(storedPhone);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Validate phone number for SMS
      if (preferences.smsEnabled && !phone) {
        alert('Please enter your phone number to enable SMS notifications');
        setSaving(false);
        return;
      }

      // Save to localStorage (in real app, would be API call)
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userPhone', phone);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notification-preferences">
      <div className="preferences-header">
        <h2>🔔 Notification Preferences</h2>
        <p>Customize how you receive alerts and notifications</p>
      </div>

      <div className="preferences-container">
        {/* Contact Information */}
        <section className="preferences-section">
          <h3>Contact Information</h3>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number (for SMS)</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
            <small>Required if you want to receive SMS notifications</small>
          </div>
        </section>

        {/* Notification Channels */}
        <section className="preferences-section">
          <h3>Notification Channels</h3>

          <div className="channel-toggle">
            <div className="toggle-header">
              <span>📧 Email</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.emailEnabled}
                  onChange={(e) =>
                    handlePreferenceChange('emailEnabled', e.target.checked)
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
            <p className="channel-desc">
              Receive notifications via email at {email || 'your email'}
            </p>
          </div>

          <div className="channel-toggle">
            <div className="toggle-header">
              <span>📱 SMS</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.smsEnabled}
                  onChange={(e) =>
                    handlePreferenceChange('smsEnabled', e.target.checked)
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
            <p className="channel-desc">
              Receive critical alerts via SMS at {phone || 'your phone'}
            </p>
          </div>

          <div className="channel-toggle">
            <div className="toggle-header">
              <span>🔔 In-App</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.inAppEnabled}
                  onChange={(e) =>
                    handlePreferenceChange('inAppEnabled', e.target.checked)
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
            <p className="channel-desc">
              Receive real-time notifications within the app
            </p>
          </div>
        </section>

        {/* Alert Types */}
        <section className="preferences-section">
          <h3>Alert Types</h3>

          <div className="alert-type">
            <div className="alert-header">
              <span>💰 Cost Alerts</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.costAlerts}
                  onChange={(e) =>
                    handlePreferenceChange('costAlerts', e.target.checked)
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
            <p className="alert-desc">
              Get alerted when tool costs approach or exceed limits
            </p>

            {preferences.costAlerts && (
              <div className="cost-threshold">
                <label>Alert Threshold: {preferences.costalertThreshold}%</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={preferences.costalertThreshold}
                  onChange={(e) =>
                    handlePreferenceChange('costalertThreshold', parseInt(e.target.value))
                  }
                />
                <small>Alert when budget usage reaches this percentage</small>
              </div>
            )}
          </div>

          <div className="alert-type">
            <div className="alert-header">
              <span>💡 Recommendations</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.recommendationAlerts}
                  onChange={(e) =>
                    handlePreferenceChange('recommendationAlerts', e.target.checked)
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
            <p className="alert-desc">
              Receive suggestions for better tools and cost savings
            </p>
          </div>

          <div className="alert-type">
            <div className="alert-header">
              <span>🚨 Emergency Alerts</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.emergencyAlerts}
                  onChange={(e) =>
                    handlePreferenceChange('emergencyAlerts', e.target.checked)
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
            <p className="alert-desc">
              Receive immediate notifications for emergency situations
            </p>
          </div>
        </section>

        {/* Daily Digest */}
        <section className="preferences-section">
          <h3>Daily Digest</h3>

          <div className="digest-toggle">
            <div className="digest-header">
              <span>📊 Daily Summary</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.dailyDigest}
                  onChange={(e) =>
                    handlePreferenceChange('dailyDigest', e.target.checked)
                  }
                />
                <span className="slider"></span>
              </label>
            </div>

            {preferences.dailyDigest && (
              <div className="digest-time">
                <label>Send at:</label>
                <input
                  type="time"
                  value={preferences.digestTime}
                  onChange={(e) =>
                    handlePreferenceChange('digestTime', e.target.value)
                  }
                />
                <p className="digest-desc">
                  Get a summary of your daily costs, top tools, and recommendations
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Save Button */}
      <div className="preferences-footer">
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>

        {saved && (
          <div className="save-confirmation">
            ✅ Preferences saved successfully!
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="preferences-summary">
        <h3>Your Settings Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Email Notifications</span>
            <span className="summary-value">
              {preferences.emailEnabled ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">SMS Notifications</span>
            <span className="summary-value">
              {preferences.smsEnabled ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">In-App Notifications</span>
            <span className="summary-value">
              {preferences.inAppEnabled ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Cost Alerts</span>
            <span className="summary-value">
              {preferences.costAlerts
                ? `✅ At ${preferences.costalertThreshold}%`
                : '❌ Disabled'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Daily Digest</span>
            <span className="summary-value">
              {preferences.dailyDigest ? `✅ At ${preferences.digestTime}` : '❌ Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationPreferences;
