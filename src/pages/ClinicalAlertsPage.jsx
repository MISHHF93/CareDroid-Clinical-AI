import { useState, useEffect } from 'react';
import ApiStateBanner from '../components/ApiStateBanner';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../config/backendApiCapabilities';
import './ClinicalAlertsPage.css';

const ClinicalAlertsPage = () => {
  const alertsApiEnabled = isBackendCapabilityEnabled('clinicalAlerts');
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const mockAlerts = [
      {
        id: 'alert-1',
        timestamp: new Date(Date.now() - 3600000),
        severity: 'critical',
        title: 'Critical SOFA Score',
        description: 'Patient shows signs of multiple organ dysfunction',
        source: 'SOFA Calculator',
        status: 'unacknowledged',
        findings: ['SOFA Score: 15/24', 'Mortality risk: High']
      },
      {
        id: 'alert-2',
        timestamp: new Date(Date.now() - 7200000),
        severity: 'high',
        title: 'Abnormal Lab Values',
        description: '3 critical laboratory values detected',
        source: 'Lab Interpreter',
        status: 'acknowledged',
        findings: ['K+: 6.8 mEq/L', 'pH: 7.25', 'HCO3-: 18 mEq/L']
      },
      {
        id: 'alert-3',
        timestamp: new Date(Date.now() - 86400000),
        severity: 'moderate',
        title: 'Kidney Dysfunction Alert',
        description: 'GFR indicates moderate to severe kidney disease',
        source: 'GFR Calculator',
        status: 'acknowledged',
        findings: ['GFR: 28 mL/min/1.73m²', 'CKD Stage: 3b']
      }
    ];

    setAlerts(mockAlerts);
    setFilteredAlerts(mockAlerts);
  }, []);

  // Filter alerts
  useEffect(() => {
    let filtered = alerts;

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === selectedSeverity);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        a =>
          a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAlerts(filtered);
  }, [selectedSeverity, searchTerm, alerts]);

  const handleAcknowledge = (alertId) => {
    setAlerts(alerts =>
      alerts.map(a =>
        a.id === alertId ? { ...a, status: 'acknowledged' } : a
      )
    );
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🔴',
      high: '🟠',
      moderate: '🟡',
      low: '🟢',
      warning: '⚠️'
    };
    return icons[severity] || '■';
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const unacknowledgedCount = alerts.filter(a => a.status === 'unacknowledged').length;

  return (
    <div className="clinical-alerts-page">
      <div className="alerts-header">
        <h1>Clinical Alerts Management</h1>
        <p>Track and manage all clinical alerts from your tools</p>
      </div>

      {!alertsApiEnabled ? (
        <ApiStateBanner
          unsupportedMessage={`${UNSUPPORTED_CAPABILITY_MESSAGE} Showing sample alerts on this device only.`}
        />
      ) : null}

      <div className="alerts-controls">
        <div className="control-group">
          <label htmlFor="search">Search Alerts</label>
          <input
            id="search"
            type="text"
            placeholder="Search by title, description, or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="control-group">
          <label htmlFor="severity">Filter by Severity</label>
          <select
            id="severity"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="severity-select"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="control-group">
          <label>Summary</label>
          <div className="summary-badges">
            <span className="summary-badge total">
              Total: <strong>{alerts.length}</strong>
            </span>
            <span className="summary-badge unacknowledged">
              Pending: <strong>{unacknowledgedCount}</strong>
            </span>
            <span className="summary-badge acknowledged">
              Acknowledged: <strong>{alerts.length - unacknowledgedCount}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="alerts-timeline">
        <div className="timeline-title">Alert Timeline</div>
        {filteredAlerts.length > 0 ? (
          <div className="alerts-list">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`alert-card severity-${alert.severity} status-${alert.status}`}>
                <div className="card-header">
                  <div className="alert-meta">
                    <span className="severity-icon">{getSeverityIcon(alert.severity)}</span>
                    <div className="alert-info">
                      <h3 className="alert-title">{alert.title}</h3>
                      <p className="alert-description">{alert.description}</p>
                      <div className="alert-source">
                        <span className="badge-source">{alert.source}</span>
                        <span className="badge-time">{formatTime(alert.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="alert-status-badge" title={alert.status}>
                    {alert.status === 'acknowledged' ? '✓' : '!'}
                  </div>
                </div>

                {alert.findings && alert.findings.length > 0 && (
                  <div className="card-findings">
                    <div className="findings-label">Key Findings</div>
                    <ul className="findings-list">
                      {alert.findings.map((finding, idx) => (
                        <li key={idx}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="card-actions">
                  {alert.status === 'unacknowledged' && (
                    <button
                      className="btn-acknowledge"
                      onClick={() => handleAcknowledge(alert.id)}
                      title="Mark as reviewed"
                    >
                      ✓ Acknowledge
                    </button>
                  )}
                  {alert.status === 'acknowledged' && (
                    <span className="status-text">Acknowledged</span>
                  )}
                  <button className="btn-export" title="Export alert details">
                    📥 Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>No alerts found</h3>
            <p>Great! No clinical alerts match your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalAlertsPage;
