import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import StateSourceNotice from '../components/StateSourceNotice';
import { apiFetchJson } from '../services/apiClient';
import analyticsService from '../services/analyticsService';
import offlineService from '../services/offlineService';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../navigation/iconRegistry';
import { buildPlatformAnalytics, PLATFORM_ANALYTICS_DECISIONS } from '../data/platformAnalytics';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import { DashboardGrid, PageShell } from '../components/ui/CareDroidPrimitives';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { user } = useUser();
  const { recentTools } = useToolPreferences();
  const [metrics, setMetrics] = useState(null);
  const [toolResults, setToolResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    analyticsService.trackPageView('platform_analytics', {
      telemetryMode: 'privacy-safe-aggregate',
      storesPhi: false,
      storesUserIdentifiers: false,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const token = localStorage.getItem('caredroid_access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const { response, data } = await apiFetchJson('/api/analytics/metrics', { headers });

        if (!response.ok) {
          throw new Error(data?.message || `Analytics request failed: ${response.status}`);
        }

        if (isMounted) {
          setMetrics(data);
        }
      } catch (_err) {
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
      } catch (_err) {
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

  const analytics = useMemo(
    () => buildPlatformAnalytics({ metrics, toolResults, recentTools }),
    [metrics, recentTools, toolResults]
  );

  const maxToolCount = Math.max(1, ...analytics.topUsed.map((item) => item.usage));
  const maxTrendCount = Math.max(1, ...analytics.adoptionTrend.map((item) => item.count));
  const decisionCounts = useMemo(
    () =>
      analytics.decisions.reduce((acc, row) => {
        acc[row.decision] = (acc[row.decision] || 0) + 1;
        return acc;
      }, {}),
    [analytics.decisions]
  );

  return (
    <PageShell
      className="analytics-dashboard"
      contentClassName="cd-page-stack cd-page-stack--compact analytics-dashboard__content"
      title="Platform Analytics"
      description="Privacy-safe telemetry for tool usage, calculator usage, AI launches, simulation completion, dashboard activity, workflow usage, and search activity."
      leadingIcon={<NavIcon icon={CHROME_ICONS.lineChart} size={28} />}
      actions={
        <>
          <span className="analytics-badge">Privacy-safe</span>
          <span className="analytics-user">Role: {user?.role || 'viewer'}</span>
        </>
      }
    >

      {errorMessage && (
        <div className="analytics-error">
          {errorMessage} Showing privacy-safe demo and local aggregate telemetry.
        </div>
      )}

      <StateSourceNotice
        title="Platform analytics source states"
        states={[
          DEMO_LIVE_STATES.LIVE,
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
        ]}
        details="Analytics uses backend aggregate metrics when available, plus local/offline tool activity and demo aggregate fallbacks. When the metrics backend is unavailable, the page clearly falls back instead of claiming live production analytics."
      />

      <DashboardGrid variant="metrics" className="analytics-summary">
        <div className="summary-card">
          <h3>Total Events</h3>
          <p className="summary-value">{isLoading && !metrics ? '…' : analytics.summary.totalEvents}</p>
          <span className="summary-label">Aggregate, no PHI</span>
        </div>
        <div className="summary-card">
          <h3>Tracked Tools</h3>
          <p className="summary-value">{analytics.summary.trackedTools}</p>
          <span className="summary-label">Tools with activity</span>
        </div>
        <div className="summary-card">
          <h3>Orphan Tools</h3>
          <p className="summary-value">{analytics.summary.orphanToolCount}</p>
          <span className="summary-label">Improve, merge, hide, or promote review</span>
        </div>
        <div className="summary-card">
          <h3>Search Activity</h3>
          <p className="summary-value">{analytics.summary.searchEvents}</p>
          <span className="summary-label">Query text never stored</span>
        </div>
      </DashboardGrid>

      <section className="analytics-privacy" aria-label="Privacy-safe telemetry">
        <div>
          <h2>Privacy-safe telemetry</h2>
          <p>
            Aggregates store event type, tool id, count, day bucket, surface, and category only.
            Patient identifiers, clinician identifiers, free text, messages, notes, MRNs, and search
            query text are excluded.
          </p>
        </div>
        <span className="analytics-badge">No PHI</span>
      </section>

      <DashboardGrid className="analytics-grid">
        <div className="analytics-panel">
          <h2>Most Used Tools</h2>
          {analytics.topUsed.map((tool) => (
            <div key={tool.toolId} className="analytics-row">
              <div className="analytics-row-label">
                <span className="tool-icon" aria-hidden>
                  <NavIcon icon={getToolIcon(tool.toolId)} size={20} />
                </span>
                <span>{tool.name}</span>
              </div>
              <div className="analytics-row-bar">
                <div
                  className="analytics-row-fill"
                  style={{
                    width: `${Math.round((tool.usage / maxToolCount) * 100)}%`,
                    backgroundColor: 'var(--app-accent-interactive, #0ea5e9)',
                  }}
                />
              </div>
              <span className="analytics-row-count">{tool.usage}</span>
            </div>
          ))}
        </div>

        <div className="analytics-panel">
          <h2>Least Used Tools</h2>
          {analytics.leastUsed.map((tool) => (
            <div key={tool.toolId} className="analytics-row">
              <div className="analytics-row-label">
                <span>{tool.name}</span>
              </div>
              <span className={`analytics-decision analytics-decision--${tool.decision}`}>{tool.decision}</span>
              <span className="analytics-row-count">{tool.usage}</span>
            </div>
          ))}
        </div>

        <div className="analytics-panel">
          <h2>Feature Engagement</h2>
          {analytics.featureEngagement.map((event) => (
            <div key={event.eventType} className="engagement-metric">
              <span>{event.eventType.replace(/_/g, ' ')}</span>
              <strong>{event.count}</strong>
            </div>
          ))}
        </div>
      </DashboardGrid>

      <DashboardGrid className="analytics-grid">
        <div className="analytics-panel">
          <h2>Adoption Trends</h2>
          {analytics.adoptionTrend.map((point) => (
            <div key={point.day} className="analytics-row">
              <div className="analytics-row-label">
                <span>{point.day}</span>
              </div>
              <div className="analytics-row-bar">
                <div
                  className="analytics-row-fill analytics-row-fill--trend"
                  style={{ width: `${Math.round((point.count / maxTrendCount) * 100)}%` }}
                />
              </div>
              <span className="analytics-row-count">{point.count}</span>
            </div>
          ))}
        </div>

        <div className="analytics-panel">
          <h2>Orphan Tools</h2>
          <p className="analytics-empty">Tools with no recent aggregate activity.</p>
          {analytics.orphanTools.slice(0, 8).map((tool) => (
            <div key={tool.toolId} className="analytics-row">
              <span className="analytics-row-label">{tool.name}</span>
              <span className="analytics-decision analytics-decision--hide">{tool.recommendation}</span>
            </div>
          ))}
        </div>
      </DashboardGrid>

      <section className="analytics-recommendations">
        <h2>Product Decisions</h2>
        <div className="recommendation-grid">
          {Object.values(PLATFORM_ANALYTICS_DECISIONS).map((decision) => (
            <div key={decision} className="recommendation-card">
              <span className="recommendation-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.lineChart} size={24} />
              </span>
              <div>
                <h3>{decision}</h3>
                <p>
                  {decisionCounts[decision] || 0} tool
                  {(decisionCounts[decision] || 0) === 1 ? '' : 's'} flagged for {decision}.
                </p>
              </div>
              <span className="recommendation-tag">Review</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
};

export default AnalyticsDashboard;
