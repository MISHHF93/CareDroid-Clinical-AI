import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  COMMAND_CENTER_INTELLIGENCE_VIEWS,
  type CommandCenterIntelligenceView,
} from '../../config/hospitalCommandCenterViews.config';
import {
  buildLocalEmergencyAnalytics,
  fetchEmergencyOperationalAnalytics,
} from '../../services/emergencyAnalyticsApi';
import { fetchUnifiedPlatformHealth } from '../../services/unifiedServiceRegistry';
import { fetchEmergencySurgeStatus } from '../../services/surgeApi';
import { fetchAiCommandCenterSnapshot } from '../../services/aiCommandCenterApi';
import {
  buildPredictiveAnalyticsSummary,
  DEMO_PREDICTIVE_ANALYTICS_MODELS,
} from '../../data/predictiveAnalyticsDashboard';
import { Spinner } from '../ui/Spinner';
import './CommandCenterIntelligenceLens.css';

type LensProps = {
  view: CommandCenterIntelligenceView;
};

function LensMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="command-center-lens__metric">
      <span className="command-center-lens__metric-label">{label}</span>
      <strong className="command-center-lens__metric-value">{value}</strong>
      {detail ? <span className="command-center-lens__metric-detail">{detail}</span> : null}
    </div>
  );
}

function ExecutiveLensPanel() {
  const [loading, setLoading] = useState(true);
  const [shiftPatients, setShiftPatients] = useState('—');
  const [avgWait, setAvgWait] = useState('—');
  const [platformStatus, setPlatformStatus] = useState('—');
  const [surgeLevel, setSurgeLevel] = useState('—');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsResult, healthBundle, surgeResult] = await Promise.all([
        fetchEmergencyOperationalAnalytics(),
        fetchUnifiedPlatformHealth({
          sync: {
            status: 'command-center-executive-lens',
            source: 'HospitalCommandCenter',
            stale: false,
            message: 'Executive intelligence lens refresh.',
          },
        }),
        fetchEmergencySurgeStatus(),
      ]);

      const analyticsData =
        (
          analyticsResult as {
            ok?: boolean;
            data?: { shift?: { patientsSeen?: number; avgWaitMinutes?: number } };
          }
        ).ok &&
        (
          analyticsResult as {
            data?: { shift?: { patientsSeen?: number; avgWaitMinutes?: number } };
          }
        ).data
          ? (
              analyticsResult as {
                data: { shift?: { patientsSeen?: number; avgWaitMinutes?: number } };
              }
            ).data
          : buildLocalEmergencyAnalytics({
              patients: [],
              queues: [],
              capacity: {},
              activeShift: {},
            });

      setShiftPatients(String(analyticsData.shift?.patientsSeen ?? '—'));
      setAvgWait(
        analyticsData.shift?.avgWaitMinutes != null
          ? `${analyticsData.shift.avgWaitMinutes} min`
          : '—',
      );
      setPlatformStatus(healthBundle.saas.data?.status || 'unknown');
      setSurgeLevel(
        (surgeResult as { ok?: boolean; data?: { level?: string } }).ok
          ? String((surgeResult as { data?: { level?: string } }).data?.level || 'normal')
          : 'unknown',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="command-center-lens__loading" role="status" aria-live="polite">
        <Spinner size="sm" />
        Loading executive intelligence…
      </div>
    );
  }

  return (
    <div className="command-center-lens__panel-grid">
      <LensMetric label="Shift patients seen" value={shiftPatients} />
      <LensMetric label="Average wait" value={avgWait} />
      <LensMetric label="Platform health" value={platformStatus} />
      <LensMetric label="Surge level" value={surgeLevel} />
    </div>
  );
}

function AiLensPanel() {
  const [loading, setLoading] = useState(true);
  const [expertsActive, setExpertsActive] = useState('—');
  const [modelHealth, setModelHealth] = useState('—');
  const [pendingReviews, setPendingReviews] = useState('—');
  const [dailyCost, setDailyCost] = useState('—');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await fetchAiCommandCenterSnapshot();
      setExpertsActive(
        String(
          snapshot.experts?.filter((expert) => expert.active).length ??
            snapshot.health.activeExperts,
        ),
      );
      setModelHealth(snapshot.health.label || snapshot.health.status || 'unknown');
      setPendingReviews(String(snapshot.health.failedBenchmarks ?? snapshot.warnings.length));
      setDailyCost(
        snapshot.costMetrics?.totalUsd != null
          ? `$${snapshot.costMetrics.totalUsd.toFixed(2)}`
          : '—',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="command-center-lens__loading" role="status" aria-live="polite">
        <Spinner size="sm" />
        Loading AI operations intelligence…
      </div>
    );
  }

  return (
    <div className="command-center-lens__panel-grid">
      <LensMetric label="Active AI experts" value={expertsActive} />
      <LensMetric label="Model health" value={modelHealth} />
      <LensMetric label="Governance reviews" value={pendingReviews} />
      <LensMetric label="Daily AI cost" value={dailyCost} />
    </div>
  );
}

function PredictiveLensPanel() {
  const summary = buildPredictiveAnalyticsSummary(DEMO_PREDICTIVE_ANALYTICS_MODELS);

  return (
    <>
      {/* Matches the disclosure already shown on the full dashboard this lens links
          to (PredictiveAnalyticsDashboard.tsx) -- every entry in
          DEMO_PREDICTIVE_ANALYTICS_MODELS carries modelStatus: 'demo-model' and an
          authored, not computed, confidence score, but this condensed lens is the
          more likely first stop from the "Predictive AI" nav item, so it needs the
          same honest label, not just the page it links onward to. */}
      <p className="command-center-lens__demo-notice">
        <span className="command-center-lens__demo-notice-label">Demo models</span> — scores below
        are not live predictions. Connect live data pipelines to activate real models.
      </p>
      <div className="command-center-lens__panel-grid">
        <LensMetric label="Models active" value={String(summary.modelCount)} />
        <LensMetric
          label="High / critical risk"
          value={String(summary.highOrCriticalCount)}
          detail={summary.highestRisk?.title}
        />
        <LensMetric label="Average risk score" value={`${summary.averageScore}/100`} />
        <LensMetric label="Highest risk band" value={summary.highestRisk?.band ?? 'low'} />
      </div>
    </>
  );
}

const PANEL_BY_VIEW: Record<CommandCenterIntelligenceView, () => ReactElement> = {
  executive: ExecutiveLensPanel,
  ai: AiLensPanel,
  predictive: PredictiveLensPanel,
};

export default function CommandCenterIntelligenceLens({ view }: LensProps) {
  const definition = COMMAND_CENTER_INTELLIGENCE_VIEWS.find((entry) => entry.id === view);
  const Panel = PANEL_BY_VIEW[view];

  return (
    <section
      className="command-center-lens emergency-route-card cd-surface-card"
      aria-label={definition?.label}
    >
      <div className="emergency-route-section-card__header">
        <div>
          <strong>{definition?.label ?? 'Intelligence lens'}</strong>
          <p className="emergency-route-section-card__lead">
            {definition?.description} Progressive disclosure — operational metrics remain primary
            above.
          </p>
        </div>
        <div className="command-center-lens__header-actions">
          {definition ? (
            <Link
              to={definition.fullDashboardPath}
              className="emergency-route-filter-banner__btn cd-btn cd-btn--secondary cd-btn--sm"
            >
              View full dashboard
            </Link>
          ) : null}
          <Link
            to={CANONICAL_ROUTES.emergencyCommandCenter}
            className="emergency-route-filter-banner__btn cd-btn cd-btn--secondary cd-btn--sm"
          >
            Default view
          </Link>
        </div>
      </div>
      <Panel />
    </section>
  );
}
