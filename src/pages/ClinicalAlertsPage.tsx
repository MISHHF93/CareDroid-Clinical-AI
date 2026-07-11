import { useState, useEffect, useMemo } from 'react';
import ApiStateBanner from '../components/ApiStateBanner';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../config/backendApiCapabilities';
import useSecurityAccess from '../hooks/useSecurityAccess';
import { useCareDroidUser } from '../hooks/useCareDroidUser';
import { CAREDROID_PERMISSIONS } from '../lib/users/permissions';
import { getCompiledRoleLabel } from '../lib/users/canonicalAccess';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  filterAlertsForProfile,
  mapAlertToClinicalDisplay,
  syncClinicalAlertsFromBackend,
  transitionAlertLifecycle,
} from '../services/alertLifecycleOrchestrator';
import { EmergencyRoutePage } from './emergency/emergencyRouteShared';
import useUnifiedApplicationKnowledgeGraph from '../hooks/useUnifiedApplicationKnowledgeGraph';
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
  const { can, readOnly: isReadOnly, compiledProfile } = useSecurityAccess();
  const { profile } = useCareDroidUser();
  const storeAlerts = useEmergencyStore((state) => state.alerts);
  const updateAlerts = useEmergencyStore((state) => state.updateAlerts);
  const canAcknowledge = can(CAREDROID_PERMISSIONS.ALERT_ACKNOWLEDGE);
  const canExport = can(CAREDROID_PERMISSIONS.REPORTS_EXPORT);
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(alertsApiEnabled);
  const [apiNotice, setApiNotice] = useState('');
  const knowledgeGraph = useUnifiedApplicationKnowledgeGraph();

  useEffect(() => {
    updateAlerts();
  }, [updateAlerts]);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      if (!alertsApiEnabled) {
        setIsLoadingAlerts(false);
        return;
      }

      setIsLoadingAlerts(true);
      const result = await syncClinicalAlertsFromBackend();
      if (cancelled) return;
      setApiNotice(result.message);
      setIsLoadingAlerts(false);
    }

    void loadAlerts();
    return () => {
      cancelled = true;
    };
  }, [alertsApiEnabled]);

  const displayAlerts = useMemo(
    () =>
      (compiledProfile ? filterAlertsForProfile(storeAlerts, compiledProfile) : storeAlerts).map(
        mapAlertToClinicalDisplay,
      ),
    [compiledProfile, storeAlerts],
  );

  const filteredAlerts = useMemo(() => {
    let filtered = displayAlerts;
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((alert) => alert.severity === selectedSeverity);
    }
    if (searchTerm) {
      const lc = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          alert.title.toLowerCase().includes(lc) ||
          alert.description.toLowerCase().includes(lc) ||
          alert.source.toLowerCase().includes(lc),
      );
    }
    return filtered;
  }, [displayAlerts, searchTerm, selectedSeverity]);

  const handleAcknowledge = async (alertId: string) => {
    await transitionAlertLifecycle(alertId, 'acknowledge', {
      actorId: profile.employeeId,
      actorRole: profile.role,
      sourceScreen: 'clinical-alerts-page',
    });
  };

  const unacknowledgedCount = displayAlerts.filter((a) => a.status === 'unacknowledged').length;
  const criticalCount = displayAlerts.filter((a) => a.severity === 'critical').length;

  const situationTone =
    criticalCount > 0 ? 'critical' : unacknowledgedCount > 0 ? 'warning' : 'neutral';

  return (
    <EmergencyRoutePage
      surfaceClassName="clinical-alerts-page"
      eyebrow="Clinical Operations"
      title="Clinical Alerts"
      description="Review, acknowledge, and resolve operational and clinical alerts — one lifecycle, role-aware delivery."
      situationBrief={{
        status: `${displayAlerts.length} active alert${displayAlerts.length === 1 ? '' : 's'}`,
        attention:
          unacknowledgedCount > 0
            ? `${unacknowledgedCount} need acknowledgement`
            : 'All alerts reviewed',
        owner: `${getCompiledRoleLabel(compiledProfile)} owns review on this shift`,
        nextAction:
          unacknowledgedCount > 0
            ? 'Acknowledge highest-severity unreviewed alerts first'
            : 'Monitor for new clinical and operational alerts',
        tone: situationTone,
      }}
      activeWork={
        <>
      <div className="alerts-summary-strip" role="status" aria-label="Alert summary">
        <span className="alerts-summary-chip">
          Total <strong>{displayAlerts.length}</strong>
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
          Acknowledged <strong>{displayAlerts.length - unacknowledgedCount}</strong>
        </span>
      </div>

      {isReadOnly && (
        <div
          className="alerts-readonly-banner"
          role="status"
          aria-live="polite"
          aria-label="Read-only mode active"
        >
          Read-only mode — {profile.role} cannot acknowledge or export alerts.
        </div>
      )}

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
              {...((selectedSeverity === f.value) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
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

                    {(() => {
                      const graphContext = knowledgeGraph.resolveAlertContext(alert.id);
                      const connectedPatients = graphContext.affectedPatients;
                      const connectedDepartments = graphContext.escalatedDepartments;
                      if (connectedPatients.length === 0 && connectedDepartments.length === 0) {
                        return null;
                      }
                      return (
                        <div className="alert-card__graph-context" role="note" aria-label="Connected operational context">
                          <p className="alert-card__findings-label">Connected context</p>
                          <ul className="alert-card__findings-list">
                            {connectedPatients.slice(0, 3).map((patient) => (
                              <li key={patient.id} className="alert-card__finding">
                                Patient: {patient.label}
                              </li>
                            ))}
                            {connectedDepartments.slice(0, 2).map((department) => (
                              <li key={department.id} className="alert-card__finding">
                                Department: {department.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}

                    <div className="alert-card__actions">
                      {alert.status === 'unacknowledged' ? (
                        canAcknowledge ? (
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
                          <span
                            className="alert-card__readonly-label"
                            aria-label="Acknowledgement not available for your role"
                          >
                            View only
                          </span>
                        )
                      ) : (
                        <span className="alert-card__acknowledged-label">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Reviewed
                        </span>
                      )}
                      {canExport && (
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
                      )}
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
        </>
      }
    />
  );
};

export default ClinicalAlertsPage;
