import React, { useState, useEffect } from 'react';
import './AuditLogs.css';
import { apiFetch } from '../services/apiClient';
import logger from '../utils/logger';
import {
  ActionRow,
  DashboardGrid,
  DashboardSection,
  FilterPanel,
  InfoNotice,
  LoadingState,
  MetricCard,
  OverflowCanvas,
  PageShell,
} from '../components/ui/CareDroidPrimitives';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState('checking');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  // Audit action type labels
  const actionLabels = {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    REGISTRATION: 'Registration',
    PASSWORD_CHANGE: 'Password Change',
    EMAIL_VERIFICATION: 'Email Verification',
    TWO_FACTOR_ENABLE: '2FA Enabled',
    TWO_FACTOR_DISABLE: '2FA Disabled',
    SUBSCRIPTION_CHANGE: 'Subscription Change',
    DATA_EXPORT: 'Data Export',
    DATA_DELETION: 'Data Deletion',
    PHI_ACCESS: 'PHI Access',
    AI_QUERY: 'AI Query',
    CLINICAL_DATA_ACCESS: 'Clinical Data Access',
    SECURITY_EVENT: 'Security Event',
    PROFILE_UPDATE: 'Profile Update',
  };

  useEffect(() => {
    fetchAuditLogs();
    verifyIntegrity();
    fetchStatistics();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '100');

      const response = await apiFetch(`/api/audit/logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setLogs(data.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      logger.error('Error fetching audit logs', { err });
    } finally {
      setLoading(false);
    }
  };

  const verifyIntegrity = async () => {
    try {
      const response = await apiFetch('/api/audit/verify-integrity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to verify integrity');

      const data = await response.json();
      setIntegrityStatus(data.data.isValid ? 'VALID' : 'TAMPERED');
    } catch (err) {
      logger.error('Error verifying integrity', { err });
      setIntegrityStatus('ERROR');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await apiFetch('/api/audit/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      logger.error('Error fetching statistics', { err });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = () => {
    fetchAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      startDate: '',
      endDate: '',
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActionClass = (action) => {
    if (action === 'SECURITY_EVENT' || action === 'PHI_ACCESS') {
      return 'action-critical';
    }
    if (action === 'PASSWORD_CHANGE' || action === 'TWO_FACTOR_ENABLE') {
      return 'action-security';
    }
    return 'action-default';
  };

  return (
    <PageShell
      className="audit-logs-container"
      contentClassName="cd-page-stack cd-page-stack--compact audit-logs-container__content"
      title="Audit Logs"
      description="Complete audit trail of all system activities and PHI access"
    >

      {/* Integrity Status */}
      <InfoNotice className={`integrity-status status-${integrityStatus.toLowerCase()}`} role="status">
        <span className="status-icon">
          {integrityStatus === 'VALID' && '✓'}
          {integrityStatus === 'TAMPERED' && '⚠️'}
          {integrityStatus === 'checking' && '⏳'}
          {integrityStatus === 'ERROR' && '❌'}
        </span>
        <span className="status-text">
          Audit log integrity: <strong>{integrityStatus}</strong>
        </span>
        <button 
          className="verify-btn"
          onClick={verifyIntegrity}
          disabled={integrityStatus === 'checking'}
        >
          Re-verify
        </button>
      </InfoNotice>

      {/* Statistics */}
      {stats && (
        <DashboardSection
          className="stats-section"
          title={`Statistics (${stats.totalLogs} logs)`}
          actions={
          <button 
            className="stats-toggle"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide statistics' : 'Show statistics'}
          </button>
          }
        >
          {showStats && (
            <DashboardGrid variant="metrics" className="stats-grid">
              <MetricCard className="stat-card" label="Total Logs" value={stats.totalLogs} />
              <MetricCard className="stat-card" label="PHI Access Events" value={stats.phiAccessCount} />
              <MetricCard className="stat-card" label="Security Events" value={stats.securityEventCount} />
              <MetricCard className="stat-card" label="Integrity Status" value={stats.integrityStatus} />
            </DashboardGrid>
          )}
        </DashboardSection>
      )}

      {/* Filters */}
      <DashboardSection className="filters-section" title="Filter Logs">
        <FilterPanel className="filter-grid">
          <div className="filter-group">
            <label>User ID</label>
            <input
              type="text"
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              placeholder="Filter by user ID"
            />
          </div>
          <div className="filter-group">
            <label>Action Type</label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
            >
              <option value="">All actions</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="datetime-local"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="datetime-local"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
        </FilterPanel>
        <ActionRow className="filter-buttons">
          <button className="btn btn-primary" onClick={applyFilters}>
            Apply Filters
          </button>
          <button className="btn btn-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </ActionRow>
      </DashboardSection>

      {/* Error Display */}
      {error && (
        <InfoNotice className="error-alert" tone="warning" label="Error:" detail={error} />
      )}

      {/* Loading State */}
      {loading && (
        <LoadingState className="loading-container" title="Loading audit logs..." />
      )}

      {/* Audit Logs Table */}
      {!loading && logs.length === 0 && !error && (
        <InfoNotice className="empty-state" role="status">
          <p>No audit logs found matching your criteria.</p>
        </InfoNotice>
      )}

      {!loading && logs.length > 0 && (
        <OverflowCanvas className="logs-table-container" minWidth="920px">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User ID</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
                <th>PHI Accessed</th>
                <th>Integrity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="log-row">
                  <td className="timestamp">{formatDate(log.timestamp)}</td>
                  <td className="user-id">{log.userId ? log.userId.substring(0, 8) + '...' : 'N/A'}</td>
                  <td>
                    <span className={`action-badge ${getActionClass(log.action)}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="resource">{log.resource}</td>
                  <td className="ip-address">{log.ipAddress}</td>
                  <td className="phi-accessed">
                    {log.phiAccessed ? (
                      <span className="badge badge-danger">Yes</span>
                    ) : (
                      <span className="badge badge-default">No</span>
                    )}
                  </td>
                  <td className="integrity">
                    {log.integrityVerified ? (
                      <span className="badge badge-success">✓ Valid</span>
                    ) : (
                      <span className="badge badge-warning">⚠️ Unverified</span>
                    )}
                  </td>
                  <td className="metadata">
                    {log.metadata ? (
                      <details>
                        <summary>View</summary>
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                      </details>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </OverflowCanvas>
      )}
    </PageShell>
  );
}
