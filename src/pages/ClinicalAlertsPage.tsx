import { useState, useEffect } from 'react';
import ApiStateBanner from '../components/ApiStateBanner';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../config/backendApiCapabilities';
import {
  acknowledgeClinicalAlertApi,
  fetchClinicalAlerts,
} from '../services/clinicalAlertsApi';
import './ClinicalAlertsPage.css';

type AlertSeverity = 'critical' | 'high' | 'moderate' | 'low';
type AlertStatus = 'unacknowledged' | 'acknowledged';

interface ClinicalAlert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  status: AlertStatus;
  findings: string[];
}

const SEVERITY_FILTERS: { value: AlertSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'low', label: 'Low' },
];

const buildSampleAlerts = (): ClinicalAlert[] => [
  {
    id: 'alert-1',
    timestamp: new Date(Date.now() - 3600000),
    severity: 'critical',
    title: 'Critical SOFA Score',
    description: 'Patient shows signs of multiple organ dysfunction',
    source: 'SOFA Calculator',
    status: 'unacknowledged',
    findings: ['SOFA Score: 15/24', 'Mortality risk: High'],
  },
  {
    id: 'alert-2',
    timestamp: new Date(Date.now() - 7200000),
    severity: 'high',
    title: 'Abnormal Lab Values',
    description: '3 critical laboratory values detected',
    source: 'Lab Interpreter',
    status: 'acknowledged',
    findings: ['K+: 6.8 mEq/L', 'pH: 7.25', 'HCO3-: 18 mEq/L'],
  },
  {
    id: 'alert-3',
    timestamp: new Date(Date.now() - 86400000),
    severity: 'moderate',
    title: 'Kidney Dysfunction Alert',
    description: 'GFR indicates moderate to severe kidney disease',
    source: 'GFR Calculator',
    status: 'acknowledged',
    findings: ['GFR: 28 mL/min/1.73m²', 'CKD Stage: 3b'],
  },
];

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const ClinicalAlertsPage = () => {
  const alertsApiEnabled = isBackendCapabilityEnabled('clinicalAlerts');
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<ClinicalAlert[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(alertsApiEnabled);
  const [apiNotice, setApiNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      if (!alertsApiEnabled) {
        const sampleAlerts = buildSampleAlerts();
        setAlerts(sampleAlerts);
        setFilteredAlerts(sampleAlerts);
        setIsLoadingAlerts(false);
        return;
      }

      setIsLoadingAlerts(true);
      const result = await fetchClinicalAlerts();
      if (cancelled) return;

      if (result.ok) {
        const resultAny = result as any;
        const apiAlerts = Array.isArray(resultAny.data?.alerts) ? resultAny.data.alerts : [];
        setAlerts(apiAlerts);
        setFilteredAlerts(apiAlerts);
        setApiNotice(resultAny.data?.safety || '');
      } else {
        const sampleAlerts = buildSampleAlerts();
        setAlerts(sampleAlerts);
        setFilteredAlerts(sampleAlerts);
        setApiNotice(`${result.message || 'Unable to load clinical alerts.'} Showing sample alerts on this device only.`);
      }
      setIsLoadingAlerts(false);
    }

    loadAlerts();
    return () => { cancelled = true; };
  }, [alertsApiEnabled]);

  useEffect(() => {
    let filtered = alerts;
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((a) => a.severity === selectedSeverity);
    }
    if (searchTerm) {
      const lc = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(lc) ||
          a.description.toLowerCase().includes(lc) ||
          a.source.toLowerCase().includes(lc),
      );
    }
    setFilteredAlerts(filtered);
  }, [selectedSeverity, searchTerm, alerts]);

  const handleAcknowledge = async (alertId: string) => {
    if (alertsApiEnabled) {
      const result = await acknowledgeClinicalAlertApi(alertId, {
        acknowledgedAt: new Date().toISOString(),
      });
      if (!result.ok) {
        setApiNotice(
          `${result.message || 'Unable to acknowledge alert on the server.'} Updated locally only.`,
        );
      }
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a)),
    );
  };

  const unacknowledgedCount = alerts.filter((a) => a.status === 'unacknowledged').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="clinical-alerts-page" aria-label="Clinical Alerts Management">
      <div className="alerts-page-header">
        <div className="alerts-page-header__copy">
          <p className="alerts-page-header__eyebrow">Clinical Operations</p>
          <h1 className="alerts-page-header__title">Clinical Alerts Management</h1>
          <p className="alerts-page-header__subtitle">
            Review and acknowledge active clinical alerts generated by CareDroid tools
          </p>
        </div>
      </div>

      <div className="alerts-summary-strip" role="status" aria-label="Alert summary">
        <span className="alerts-summary-chip">
          Total <strong>{alerts.length}</strong>
        </span>
        {criticalCount > 0 && (
          <span className="alerts-summary-chip alerts-summary-chip--critical">
            Critical <strong>{criticalCount}</strong>
          </span>
        )}
        {unacknowledgedCount > 0 && (
          <span className="alerts-summary-chip alerts-summary-chip--pending">
            Pending review <strong>{unacknowledgedCount}</strong>
          </span>
        )}
        <span className="alerts-summary-chip alerts-summary-chip--cleared">
          Acknowledged <strong>{alerts.length - unacknowledgedCount}</strong>
        </span>
      </div>

      {!alertsApiEnabled ? (
        <ApiStateBanner
          unsupportedMessage={`${UNSUPPORTED_CAPABILITY_MESSAGE} Showing sample alerts on this device only.` as any}
        />
      ) : null}
      {apiNotice ? <div className="alerts-api-notice" role="status">{apiNotice}</div> : null}

      <div className="alerts-controls">
        <div className="alerts-controls__search">
          <span className="alerts-controls__search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            type="search"
            className="alerts-controls__search-input"
            placeholder="Search by title, description, or source…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search clinical alerts"
          />
        </div>

        <div className="alerts-controls__filter-group" role="group" aria-label="Filter by severity">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={[
                'alerts-filter-chip',
                f.value !== 'all' ? `alerts-filter-chip--${f.value}` : '',
                selectedSeverity === f.value ? 'alerts-filter-chip--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedSeverity(f.value as AlertSeverity | 'all')}
              aria-pressed={selectedSeverity === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoadingAlerts ? (
        <div className="alerts-loading" role="status">Loading clinical alerts…</div>
      ) : null}

      <div className="alerts-list-section">
        {!isLoadingAlerts && filteredAlerts.length > 0 ? (
          <>
            <p className="alerts-list-label">
              {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </p>
            <ul className="alerts-list" role="list">
              {filteredAlerts.map((alert) => (
                <li key={alert.id}>
                  <article
                    className={[
                      'alert-card',
                      `alert-card--severity-${alert.severity}`,
                      alert.status === 'acknowledged' ? 'alert-card--acknowledged' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={`${alert.severity} alert: ${alert.title}`}
                  >
                    <div className="alert-card__header">
                      <span
                        className="alert-card__severity-dot"
                        aria-label={`Severity: ${alert.severity}`}
                        role="img"
                      />
                      <div className="alert-card__body">
                        <h3 className="alert-card__title">{alert.title}</h3>
                        <p className="alert-card__description">{alert.description}</p>
                        <div className="alert-card__meta">
                          <span className="alert-card__source-badge">{alert.source}</span>
                          <time className="alert-card__time" dateTime={new Date(alert.timestamp).toISOString()}>
                            {formatTime(alert.timestamp)}
                          </time>
                        </div>
                      </div>
                      <div
                        className={[
                          'alert-card__status-indicator',
                          alert.status === 'acknowledged'
                            ? 'alert-card__status-indicator--ack'
                            : 'alert-card__status-indicator--pending',
                        ].join(' ')}
                        aria-label={alert.status === 'acknowledged' ? 'Acknowledged' : 'Pending review'}
                        role="img"
                      >
                        {alert.status === 'acknowledged' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="currentColor"/>
                          </svg>
                        )}
                      </div>
                    </div>

                    {alert.findings.length > 0 && (
                      <div className="alert-card__findings">
                        <p className="alert-card__findings-label">Key Findings</p>
                        <ul className="alert-card__findings-list">
                          {alert.findings.map((finding, idx) => (
                            <li key={idx} className="alert-card__finding">{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="alert-card__actions">
                      {alert.status === 'unacknowledged' ? (
                        <button
                          type="button"
                          className="alert-card__btn-acknowledge"
                          onClick={() => handleAcknowledge(alert.id)}
                          aria-label={`Acknowledge alert: ${alert.title}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Acknowledge
                        </button>
                      ) : (
                        <span className="alert-card__acknowledged-label">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Reviewed
                        </span>
                      )}
                      <button
                        type="button"
                        className="alert-card__btn-export"
                        aria-label={`Export details for alert: ${alert.title}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Export
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </>
        ) : !isLoadingAlerts ? (
          <div className="alerts-empty-state" role="status">
            <div className="alerts-empty-state__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="alerts-empty-state__title">All clear</h3>
            <p className="alerts-empty-state__description">
              No clinical alerts match your current filters.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ClinicalAlertsPage;
