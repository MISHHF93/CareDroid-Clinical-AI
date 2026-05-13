import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { apiFetch } from '../services/apiClient';
import analyticsService from '../services/analyticsService';
import offlineService from '../services/offlineService';
import toolRegistry, { toolRegistryById } from '../data/toolRegistry';
import LiveCostDashboard from '../components/LiveCostDashboard';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../navigation/iconRegistry';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { user } = useUser();
  const [metrics, setMetrics] = useState(null);
  const [toolResults, setToolResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    analyticsService.trackPageView('analytics_dashboard');
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const token = localStorage.getItem('caredroid_access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await apiFetch('/api/analytics/metrics', { headers });

        if (!response.ok) {
          throw new Error(`Analytics request failed: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setMetrics(data);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage('Unable to load analytics metrics.');
        }
      }

      try {
        if (user?.id) {
          const results = await offlineService.getToolResults(user.id);
          if (isMounted) {
            setToolResults(results || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setToolResults([]);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const toolUsage = useMemo(() => {
    const counts = toolResults.reduce((acc, result) => {
      const toolType = result.toolType || 'unknown';
      acc[toolType] = (acc[toolType] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(counts).map(([toolType, count]) => {
      const tool = toolRegistryById[toolType];
      return {
        toolType,
        count,
        name: tool?.name || toolType,
        color: tool?.color || '#64748B',
      };
    });

    return entries.sort((a, b) => b.count - a.count);
  }, [toolResults]);

  const maxToolCount = Math.max(1, ...toolUsage.map((item) => item.count));

  return (
    <div className="analytics-dashboard">
      <header className="analytics-header">
        <div>
          <h1 className="analytics-page-title">
            <span className="analytics-page-title-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.lineChart} size={28} />
            </span>
            <span>Clinical Analytics</span>
          </h1>
          <p>Usage insights for CareDroid tools and conversations.</p>
        </div>
        <div className="analytics-header-actions">
          <span className="analytics-badge">Live</span>
          <span className="analytics-user">{user?.name || 'Clinician'}</span>
        </div>
      </header>

      {errorMessage && (
        <div className="analytics-error">{errorMessage}</div>
      )}

      <section className="analytics-summary">
        <div className="summary-card">
          <h3>Total Events</h3>
          <p className="summary-value">
            {metrics ? metrics.totalEvents : isLoading ? '…' : '0'}
          </p>
          <span className="summary-label">Last 30 days</span>
        </div>
        <div className="summary-card">
          <h3>Active Clinicians</h3>
          <p className="summary-value">
            {metrics ? metrics.dailyActiveUsers : isLoading ? '…' : '0'}
          </p>
          <span className="summary-label">Daily active</span>
        </div>
        <div className="summary-card">
          <h3>Top Events</h3>
          <p className="summary-value">
            {metrics?.topEvents?.[0]?.event || (isLoading ? '…' : 'None')}
          </p>
          <span className="summary-label">Most frequent action</span>
        </div>
      </section>

      <section className="analytics-grid">
        <div className="analytics-panel">
          <h2>Tool Usage</h2>
          {toolUsage.length === 0 && !isLoading && (
            <p className="analytics-empty">No tool usage captured yet.</p>
          )}
          {toolUsage.map((tool) => (
            <div key={tool.toolType} className="analytics-row">
              <div className="analytics-row-label">
                <span className="tool-icon" aria-hidden>
                  <NavIcon icon={getToolIcon(tool.toolType)} size={20} />
                </span>
                <span>{tool.name}</span>
              </div>
              <div className="analytics-row-bar">
                <div
                  className="analytics-row-fill"
                  style={{
                    width: `${Math.round((tool.count / maxToolCount) * 100)}%`,
                    backgroundColor: tool.color,
                  }}
                />
              </div>
              <span className="analytics-row-count">{tool.count}</span>
            </div>
          ))}
        </div>

        <div className="analytics-panel">
          <h2>Engagement</h2>
          <div className="engagement-metric">
            <span>Daily Active Users</span>
            <strong>{metrics ? metrics.dailyActiveUsers : isLoading ? '…' : '0'}</strong>
          </div>
          <div className="engagement-metric">
            <span>Weekly Active Users</span>
            <strong>{metrics ? metrics.weeklyActiveUsers : isLoading ? '…' : '0'}</strong>
          </div>
          <div className="engagement-metric">
            <span>Monthly Active Users</span>
            <strong>{metrics ? metrics.monthlyActiveUsers : isLoading ? '…' : '0'}</strong>
          </div>
          <div className="engagement-metric">
            <span>Unique Users</span>
            <strong>{metrics ? metrics.uniqueUsers : isLoading ? '…' : '0'}</strong>
          </div>
        </div>

        <div className="analytics-panel">
          <h2>Top Events</h2>
          {metrics?.topEvents?.length ? (
            metrics.topEvents.map((event) => (
              <div key={event.event} className="analytics-row">
                <div className="analytics-row-label">
                  <span>{event.event}</span>
                </div>
                <div className="analytics-row-bar">
                  <div
                    className="analytics-row-fill"
                    style={{
                      width: `${Math.round((event.count / metrics.topEvents[0].count) * 100)}%`,
                      backgroundColor: 'var(--primary-color, #4F46E5)',
                    }}
                  />
                </div>
                <span className="analytics-row-count">{event.count}</span>
              </div>
            ))
          ) : (
            <p className="analytics-empty">No events tracked yet.</p>
          )}
        </div>
      </section>

      <section className="analytics-live-costs">
        <LiveCostDashboard embedded />
      </section>

      <section className="analytics-recommendations">
        <h2>AI Recommendations</h2>
        <div className="recommendation-grid">
          {toolRegistry.slice(0, 3).map((tool) => (
            <div key={tool.id} className="recommendation-card">
              <span className="recommendation-icon" aria-hidden>
                <NavIcon icon={getToolIcon(tool.id)} size={24} />
              </span>
              <div>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
              </div>
              <span className="recommendation-tag">Suggested</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AnalyticsDashboard;
