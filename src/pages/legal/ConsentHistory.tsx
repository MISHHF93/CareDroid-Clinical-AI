import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState as EmptyStateBase } from '../../components/ui/EmptyState';
const EmptyState = EmptyStateBase as any;
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { fetchConsentStatus } from '../../services/complianceApi';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';
import './ConsentHistory.css';
import logger from '../../utils/logger';

/**
 * ConsentHistory Component
 * 
 * Displays user's consent history for audit and compliance purposes
 * Shows all consent events with timestamps and IP addresses
 */
export const ConsentHistory = () => {
  useRouteChromeRegistration({ title: 'Consent History' });
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [notice, setNotice] = useState<any>(null);

  useEffect(() => {
    fetchConsentHistory();
  }, []);

  const fetchConsentHistory = async () => {
    try {
      if (!isBackendCapabilityEnabled('complianceConsent')) {
        setError('Consent status API is not available.');
        setConsents([]);
        return;
      }

      const result = await fetchConsentStatus();
      if (!result.ok) {
        throw new Error(result.message || 'Failed to fetch consent status');
      }

      const status = result.status || {};
      const snapshot = [
        {
          key: 'termsAccepted',
          granted: status.termsAccepted,
          updatedAt: status.lastUpdated,
        },
        {
          key: 'privacyPolicyAccepted',
          granted: status.privacyPolicyAccepted,
          updatedAt: status.lastUpdated,
        },
        {
          key: 'dataProcessingConsent',
          granted: status.dataProcessingConsent,
          updatedAt: status.lastUpdated,
        },
        {
          key: 'marketingConsent',
          granted: status.marketingConsent,
          updatedAt: status.lastUpdated,
        },
        {
          key: 'thirdPartySharingConsent',
          granted: status.thirdPartySharingConsent,
          updatedAt: status.lastUpdated,
        },
      ];
      setConsents(
        snapshot.map((row) => ({
          id: row.key,
          consentDate: row.updatedAt,
          action: row.granted ? 'granted' : 'revoked',
          consents: { [row.key]: row.granted },
        }))
      );
      setNotice(
        !isBackendCapabilityEnabled('consentHistory')
          ? 'Detailed consent event history is not available on the server. Showing current snapshot from GET /api/compliance/consent.'
          : null
      );
    } catch (err: any) {
      logger.error('Error fetching consent history', { err });
      setError(err.message || 'Failed to load consent history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  };

  const getConsentLabel = (key) => {
    const labels = {
      hipaa_authorization: 'HIPAA Authorization',
      privacy_policy: 'Privacy Policy',
      terms_of_service: 'Terms of Service',
      termsAccepted: 'Terms of Service',
      privacyPolicyAccepted: 'Privacy Policy',
      dataProcessingConsent: 'Data processing (HIPAA / clinical use)',
      marketingConsent: 'Marketing communications',
      thirdPartySharingConsent: 'Third-party data sharing',
      data_sharing: 'Anonymized Data for Research',
      marketing_communications: 'Communications Preferences',
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <div className="consent-history-loading">
        <Spinner size="lg" />
        <p>Loading consent history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="consent-history-error">
        <EmptyState
          icon="⚠️"
          title="Error Loading Consent History"
          description={error}
          action={
            <button type="button" className="btn-consent-secondary" onClick={fetchConsentHistory}>
              Try Again
            </button>
          }
        />
      </div>
    );
  }

  if (consents.length === 0) {
    return (
      <div className="consent-history-empty">
        <EmptyState
          icon="📄"
          title="No Consent Records"
          description="You haven't provided any consents yet"
          action={
            <button
              type="button"
              className="btn-consent-secondary"
              onClick={() => (window.location.href = '/consent')}
            >
              Provide Consent
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="consent-history">
      <div className="consent-history-container">
        <div className="consent-history-header">
          <p className="consent-history-header__title-text" data-testid="cd-page-title-text">Consent History</p>
          {notice && (
            <p className="consent-history-notice" role="status">
              {notice}
            </p>
          )}
          <p className="consent-history-intro">
            Your complete consent and authorization history as required by HIPAA. 
            All consent actions are permanently logged for audit purposes.
          </p>
        </div>

        <div className="consent-history-actions">
          <Link to="/privacy" className="btn-consent-link">
            View Privacy Policy
          </Link>
          <Link to="/terms" className="btn-consent-link">
            View Terms of Service
          </Link>
        </div>

        <div className="consent-history-list">
          {consents.map((consent, index) => (
            <div key={consent.id || index} className="consent-record">
              <div className="consent-record-header">
                <div className="consent-record-date">
                  <span className="consent-record-icon">📅</span>
                  <span className="consent-record-timestamp">
                    {formatDate(consent.consentDate)}
                  </span>
                </div>
                <span className={`consent-record-status consent-record-status-${consent.action}`}>
                  {consent.action === 'granted' ? 'Consented' : 'Revoked'}
                </span>
              </div>

              <div className="consent-record-body">
                <h3>Consent Event</h3>
                <div className="consent-record-details">
                  {Object.entries(consent.consents || {}).map(([key, value]) => (
                    <div key={key} className="consent-detail-item">
                      <span className="consent-detail-label">{getConsentLabel(key)}:</span>
                      <span className={`consent-detail-value consent-detail-value-${value ? 'yes' : 'no'}`}>
                        {value ? '✓ Accepted' : '✗ Declined'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="consent-record-footer">
                <div className="consent-record-meta">
                  <span title="IP Address">🌐 {consent.ipAddress || 'Unknown'}</span>
                  <span title="User Agent">💻 {consent.userAgent || 'Unknown device'}</span>
                  <span title="Record ID">🔑 {consent.id || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="consent-history-footer">
          <div className="consent-history-info">
            <h3>About Consent Records</h3>
            <p>
              As required by HIPAA, we maintain a permanent, tamper-proof audit log of all 
              consent actions. Records include:
            </p>
            <ul>
              <li>Timestamp (with timezone)</li>
              <li>IP address</li>
              <li>Device/browser information</li>
              <li>Consent status for each category</li>
            </ul>
            <p>
              You may request a complete copy of your consent history at any time by contacting{' '}
              <a href="mailto:privacy@caredroid.ai">privacy@caredroid.ai</a>.
            </p>
          </div>

          <div className="consent-history-actions-footer">
            <Link to="/consent" className="btn-consent-secondary">
              Manage Consents
            </Link>
            <button type="button"
              className="btn-consent-export"
              onClick={() => {
                // Export consent history as JSON
                const dataStr = JSON.stringify(consents, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `consent-history-${new Date().toISOString()}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export as JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
