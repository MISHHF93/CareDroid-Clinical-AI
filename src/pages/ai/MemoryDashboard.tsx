import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  DEMO_MEMORY_ACTIVITY,
  DEMO_MEMORY_WORKFLOWS,
} from '../../utils/clinicalInsightsChartModel';
import { fetchMemoryDashboard } from '../../services/memoryApi';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './MemoryDashboard.css';

// Found 2026-08-27: the real GET /memory/dashboard response
// (MemoryController.toActivity(), backend/src/modules/memory/memory.controller.ts)
// shapes each activity item as { title, occurredAt, ... } and each saved
// workflow as a raw LongMemoryEntry ({ title, ... }, no status field) --
// this page only ever read label/detail/time/status, field names that exist
// ONLY on the local DEMO_MEMORY_ACTIVITY/DEMO_MEMORY_WORKFLOWS fallback data
// (utils/clinicalInsightsChartModel.ts). Every real (non-demo) load rendered
// a blank bold line and the generic "Recent session" subtitle -- the title
// column three separate memory tables persist, and the timestamp the
// controller computes specifically for display ordering, never reached the
// user. Reads both shapes so the same rendering works for live and demo data.
function activityLabel(item: { label?: string; title?: string }): string {
  return item.label || item.title || 'Memory event';
}

function activitySubtitle(item: { detail?: string; time?: string; occurredAt?: string }): string {
  if (item.detail) return item.detail;
  if (item.time) return item.time;
  if (item.occurredAt) {
    const parsed = new Date(item.occurredAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return 'Recent session';
}

export default function MemoryDashboard() {
  useRouteChromeRegistration({ title: 'Memory Dashboard' });
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState<
    readonly {
      id: string;
      label?: string;
      title?: string;
      detail?: string;
      time?: string;
      occurredAt?: string;
    }[]
  >([]);
  const [workflows, setWorkflows] = useState<
    readonly { id: string; label?: string; title?: string; status?: string }[]
  >([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const result = await fetchMemoryDashboard();
      if (!active) return;
      const payload = (result as { data?: typeof result }).data || result;
      const recentActivity = (payload as any).recentActivity || [];
      const savedWorkflows = (payload as any).savedWorkflows || [];
      setFromApi(Boolean((result as { ok?: boolean }).ok));
      setMessage((result as { message?: string }).message || '');
      setActivity(recentActivity.length ? recentActivity : DEMO_MEMORY_ACTIVITY);
      setWorkflows(savedWorkflows.length ? savedWorkflows : DEMO_MEMORY_WORKFLOWS);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const savedCount = useMemo(() => workflows.length, [workflows]);

  return (
    <main className="memory-page" aria-label="Memory dashboard">
      <header className="memory-page__header">
        <div className="memory-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="memory-dashboard-title-text" data-testid="cd-page-title-text">
              Memory Dashboard
            </p>
            <p>Short-term assistant context, saved workflows, and recent clinical tool activity.</p>
          </div>
        </div>
        <div className="memory-page__actions">
          <Link to={CANONICAL_ROUTES.aiEvaluation}>AI evaluation</Link>
          <Link to="/costs">Cost analytics</Link>
          <Link to={CANONICAL_ROUTES.clinicalDecisionSupport}>Decision support</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Memory source state"
        states={
          fromApi
            ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LIVE]
            : [
                DEMO_LIVE_STATES.DEMO,
                DEMO_LIVE_STATES.LOCAL_ONLY,
                DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
              ]
        }
        details={
          message ||
          (fromApi
            ? 'Memory fabric connected.'
            : 'Demo memory fabric with local fallback activity.')
        }
      />

      <div className="memory-page__metrics" role="group" aria-label="Memory summary metrics">
        <MetricCard
          label="Recent activity"
          value={String(activity.length)}
          hint="Tool and session events"
          tone="neutral"
        />
        <MetricCard
          label="Saved workflows"
          value={String(savedCount)}
          hint="Pinned or saved flows"
          tone="good"
        />
        <MetricCard
          label="Source"
          value={fromApi ? 'API' : 'Local'}
          hint="Latest memory scan"
          tone={fromApi ? 'good' : 'warning'}
        />
        <MetricCard
          label="Status"
          value={loading ? 'Loading' : 'Ready'}
          hint="Dashboard state"
          tone="neutral"
        />
      </div>

      <div className="memory-page__panels">
        <section className="memory-page__panel" aria-label="Recent activity">
          <h2>Recent activity</h2>
          <div className="memory-page__list">
            {activity.map((item) => (
              <article key={item.id} className="memory-page__item">
                <strong>{activityLabel(item)}</strong>
                <span>{activitySubtitle(item)}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="memory-page__panel" aria-label="Saved workflows">
          <h2>Saved workflows</h2>
          <div className="memory-page__list">
            {workflows.map((item) => (
              <article key={item.id} className="memory-page__item">
                <strong>{activityLabel(item)}</strong>
                <span>{item.status || 'saved'}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
