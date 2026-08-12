import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CommandActionGraphicCard,
  CommandMetricGraphicCard,
} from '../../components/graphics/CdlGraphicKit';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { resolveUnifiedMetricRoute } from '../../config/unifiedOperationalIntelligence.registry';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModeRegistry';
import { CAREDROID_PRODUCT } from '../../config/caredroidProduct.config';

import {
  resolveHospitalCommandMetricsForRole,
  resolveHospitalCommandRoleLabel,
} from '../../config/hospitalCommandCenterRolePolicy';
import { useEmergencyStore } from '../../store/emergencyStore';
import useAiChiefOrchestrator from '../../hooks/useAiChiefOrchestrator';
import useUnifiedOperationalIntelligence from '../../hooks/useUnifiedOperationalIntelligence';
import useUnifiedWorkflowAutomation from '../../hooks/useUnifiedWorkflowAutomation';
import { mapUnifiedWorkflowItemsToCommandActions } from '../../services/unifiedWorkflowPresentation';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useEmergencyAnalytics } from '../../hooks/useEmergencyOs';
import {
  buildHospitalCommandCenterSnapshot,
  filterHospitalCommandMetrics,
} from '../../services/hospitalCommandCenterModel';
import {
  buildSentinelCommandMetrics,
  buildSentinelLiveRegionText,
  formatEtaRange,
  loadSentinelCommandSnapshotWithFallback,
} from '../../services/sentinel';
import type { SentinelCommandSnapshot, SentinelUnitView } from '../../types/sentinel';

import {
  AiTruthLabel,
  hospitalCommandCenterRecommendationsTruthLabel,
  sentinelAiRecommendationsTruthLabel,
} from '../../components/ai/AiTruthLabel';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import useEdRouteDataContext from '../../hooks/useEdRouteDataContext';
import useUnifiedOperatingSurface from '../../hooks/useUnifiedOperatingSurface';
import { resolveCommandCenterIntelligenceView } from '../../config/hospitalCommandCenterViews.config';
import CommandCenterIntelligenceLens from '../../components/emergency/CommandCenterIntelligenceLens';
import { EmergencyRoutePage } from './emergencyRouteShared';
import PatientFlowStatusPanel from '../../components/emergency/PatientFlowStatusPanel';
import AdministrativeAutomationReviewPanel from '../../components/emergency/AdministrativeAutomationReviewPanel';
import CommandCenterInsightsCharts from '../../components/emergency/CommandCenterInsightsCharts';
import UnifiedOperationalIntelligencePanel from '../../components/emergency/UnifiedOperationalIntelligencePanel';
import UnifiedApplicationKnowledgeGraphPanel from '../../components/emergency/UnifiedApplicationKnowledgeGraphPanel';

import './hospital-command-center.css';

export default function HospitalCommandCenter() {
  const location = useLocation();
  const intelligenceView = resolveCommandCenterIntelligenceView(location.search);
  const operatingSurface = useUnifiedOperatingSurface();
  const emergencyRole = useEmergencyRolePermissions();
  const { backendAvailable } = useEdRouteDataContext();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const alerts = useEmergencyStore((state) => state.alerts);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const capacity = useEmergencyStore((state) => state.capacity);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const patientFlowSnapshot = useEmergencyStore((state) => state.patientFlowSnapshot);
  const administrativeAutomationQueue = useEmergencyStore((state) => state.administrativeAutomationQueue);
  const aiChief = useAiChiefOrchestrator({
    screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
    realtime: true,
  });
  const unifiedWorkflow = useUnifiedWorkflowAutomation({ realtime: true });
  const unifiedOperationalIntelligence = useUnifiedOperationalIntelligence({ realtime: true });
  const operationalIntelligence = aiChief.operationalIntelligence;
  const emergencyAnalytics = useEmergencyAnalytics();
  const [sentinelSnapshot, setSentinelSnapshot] = useState<SentinelCommandSnapshot | null>(null);
  const [sentinelSource, setSentinelSource] = useState<'live' | 'cache' | 'unavailable'>('unavailable');
  const [sentinelMessage, setSentinelMessage] = useState('Sentinel not loaded');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await loadSentinelCommandSnapshotWithFallback();
        if (cancelled) return;
        setSentinelSnapshot(result.snapshot);
        setSentinelSource(result.source);
        setSentinelMessage(result.message);
      } catch {
        if (cancelled) return;
        setSentinelSnapshot(null);
        setSentinelSource('unavailable');
        setSentinelMessage('Sentinel capability unavailable');
      }
    };
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const snapshot = useMemo(
    () =>
      buildHospitalCommandCenterSnapshot({
        patients,
        staff,
        alerts,
        emsArrivals,
        capacity,
        referrals,
        emergencySettings,
        centralSnapshot: operationalIntelligence.centralSnapshot,
        intelligenceSnapshot: operationalIntelligence.snapshot,
        hourlyArrivals:
          (emergencyAnalytics.data?.operationalCommand?.hourlyArrivals as
            | Array<{ hour: string; count: number }>
            | undefined) || [],
        patientFlowSnapshot,
        administrativeAutomationQueue,
        knowledgeGraphSummary: aiChief.knowledgeGraphSummary,
        unifiedOperationalSnapshot: unifiedOperationalIntelligence.unifiedSnapshot,
      }),
    [
      alerts,
      capacity,
      emsArrivals,
      emergencyAnalytics.data?.operationalCommand?.hourlyArrivals,
      emergencySettings,
      operationalIntelligence.centralSnapshot,
      operationalIntelligence.snapshot,
      patientFlowSnapshot,
      administrativeAutomationQueue,
      aiChief.knowledgeGraphSummary,
      unifiedOperationalIntelligence.unifiedSnapshot,
      patients,
      referrals,
      staff,
    ],
  );

  const visibleMetricIds = useMemo(
    () => resolveHospitalCommandMetricsForRole(emergencyRole.role),
    [emergencyRole.role],
  );

  const sentinelMetrics = useMemo(
    () => buildSentinelCommandMetrics(sentinelSnapshot),
    [sentinelSnapshot],
  );

  const visibleMetrics = useMemo(() => {
    const base = filterHospitalCommandMetrics(snapshot, visibleMetricIds);
    // Prefer live Sentinel values for EMS/ETA/alarm/AI metrics when available.
    if (!sentinelSnapshot) return base;
    const byId = new Map(base.map((m) => [m.id, m]));
    for (const metric of sentinelMetrics) {
      if (visibleMetricIds.includes(metric.id)) {
        byId.set(metric.id, metric);
      }
    }
    return visibleMetricIds.map((id) => byId.get(id)).filter(Boolean) as typeof base;
  }, [snapshot, visibleMetricIds, sentinelSnapshot, sentinelMetrics]);

  const sentinelLiveText = useMemo(
    () => buildSentinelLiveRegionText(sentinelSnapshot),
    [sentinelSnapshot],
  );

  const workflowActions = useMemo(
    () => mapUnifiedWorkflowItemsToCommandActions(unifiedWorkflow.pendingItems, 6),
    [unifiedWorkflow.pendingItems],
  );

  const roleLabel = resolveHospitalCommandRoleLabel(emergencyRole.role);

  return (
    <EmergencyRoutePage
      surfaceClassName="hospital-command-center"
      eyebrow="Hospital Command Center"
      title="Real-Time ED Operations"
      description={`One operational picture for ${roleLabel} — actionable metrics only, no historical reporting widgets.`}
      situationBrief={{
        status: snapshot.statusLine,
        attention:
          snapshot.threeMinuteCompliance.breaches > 0
            ? `${snapshot.threeMinuteCompliance.breaches} three-minute breach${snapshot.threeMinuteCompliance.breaches === 1 ? '' : 'es'}`
            : snapshot.unresolvedAlerts.length
              ? `${snapshot.unresolvedAlerts.length} unresolved critical alert${snapshot.unresolvedAlerts.length === 1 ? '' : 's'}`
              : 'No P0 compliance signals',
        owner: snapshot.ownerRole,
        nextAction: snapshot.nextAction,
        tone: snapshot.tone === 'critical' ? 'critical' : snapshot.tone === 'warning' ? 'warning' : 'neutral',
      }}
      actions={
        <Link to={CANONICAL_ROUTES.emergencyWhiteboard} className="emergency-route-filter-banner__btn cd-btn cd-btn--secondary cd-btn--sm">
          Open whiteboard
        </Link>
      }
      operationalSummaryExtra={
        <>
          <EdDataSourceBanner
            envelope={{
              source: operatingSurface.hasBackendSnapshot
                ? 'backend'
                : backendAvailable
                  ? 'backend'
                  : 'local-store-fallback',
              generatedAt: operatingSurface.apiEnvelope.generatedAt || snapshot.generatedAt,
            }}
            loading={operatingSurface.apiLoading}
          />
          <div
            className={`hospital-command-center__status cdl-surface cdl-surface--operational-status hospital-command-center__status--${snapshot.tone}`}
            role="status"
          >
            {/* snapshot.statusLine is already shown once above in the "Happening now" situation-brief
                cell (situationBrief.status) -- repeating it here duplicated the exact same sentence in
                two stacked banners on the same page. This strip now carries only the info that isn't
                shown anywhere else on the page. */}
            <div className="hospital-command-center__status-meta">
              <span>{CAREDROID_PRODUCT.safetyShort}</span>
              <span>Role view: {roleLabel}</span>
              <span>
                3-min: {snapshot.threeMinuteCompliance.compliant ? 'compliant' : 'breach'}
              </span>
              <span>Sentinel: {sentinelSource}</span>
            </div>
          </div>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {sentinelLiveText}
          </div>
        </>
      }
      primaryActions={
        <section className="emergency-route-card cd-surface-card">
          <div className="emergency-route-section-card__header">
            <div>
              <strong>Critical actions</strong>
              <p className="emergency-route-section-card__lead">
                Prioritized from dispatch, readiness, alerts, AI review, bottlenecks, and staff routing.
              </p>
            </div>
          </div>
          <div className="hospital-command-center__actions">
            {workflowActions.map((action) => (
              <CommandActionGraphicCard
                key={action.id}
                label={action.label}
                count={action.count}
                reason={action.reason}
                owner={action.owner}
                deadlineLabel={action.deadlineLabel}
                nextAction={action.nextAction}
                tone={action.tone}
                active={action.active}
                route={action.route}
              />
            ))}
          </div>
        </section>
      }
      activeWork={
        <>
          <section
            className="emergency-route-card cd-surface-card"
            aria-labelledby="sentinel-ems-command-heading"
          >
            <div className="emergency-route-section-card__header">
              <div>
                <strong id="sentinel-ems-command-heading">Sentinel EMS command</strong>
                <p className="emergency-route-section-card__lead">
                  Live units, ETA confidence ranges, inbound pre-arrival, durable alarms, and
                  human-review AI. Source: {sentinelSource}. {sentinelMessage}
                </p>
              </div>
              <Link
                to={CANONICAL_ROUTES.emergencyEms}
                className="emergency-route-filter-banner__btn cd-btn cd-btn--secondary cd-btn--sm"
              >
                Open EMS pipeline
              </Link>
            </div>
            {sentinelSnapshot && sentinelSnapshot.units.length > 0 ? (
              <ul className="hospital-command-center__sentinel-units">
                {sentinelSnapshot.units.slice(0, 8).map((unit: SentinelUnitView) => (
                  <li key={unit.id}>
                    <strong>{unit.label}</strong>
                    <span>
                      {unit.status} · {unit.freshness}
                    </span>
                    <span>{formatEtaRange(unit)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="emergency-route-section-card__lead">
                No Sentinel units yet. Enable SENTINEL_ENABLED and poll mock/webhook adapters, or
                use EMS pipeline demo paths.
              </p>
            )}
            {sentinelSnapshot && sentinelSnapshot.aiRecommendations.length > 0 ? (
              <>
                <p className="emergency-route-section-card__lead" role="note">
                  {sentinelSnapshot.aiRecommendations.length} AI recommendation(s) require clinician
                  review before any pathway activation.
                </p>
                <AiTruthLabel {...sentinelAiRecommendationsTruthLabel()} compact />
              </>
            ) : null}
          </section>
          <section className="emergency-route-card cd-surface-card">
            <div className="emergency-route-section-card__header">
              <div>
                <strong>Unified operational intelligence</strong>
                <p className="emergency-route-section-card__lead">
                  Backend-event-driven insights across patient flow, staffing, capacity, alerts,
                  workflow metrics, service health, and AI recommendations.
                </p>
              </div>
            </div>
            <UnifiedOperationalIntelligencePanel />
          </section>
          <section className="emergency-route-card cd-surface-card">
            <div className="emergency-route-section-card__header">
              <div>
                <strong>Continuous patient flow</strong>
                <p className="emergency-route-section-card__lead">
                  Real-time workflow state, ownership, wait timers, bottlenecks, and AI next-step guidance.
                </p>
              </div>
            </div>
            <PatientFlowStatusPanel />
          </section>
          <section className="emergency-route-card cd-surface-card">
            <div className="emergency-route-section-card__header">
              <div>
                <strong>Unified workflow automation</strong>
                <p className="emergency-route-section-card__lead">
                  One review queue for reception, intake, triage, routing, notifications, documentation,
                  handoffs, staff assignments, analytics, reporting, and AI recommendations.
                </p>
              </div>
            </div>
            <AdministrativeAutomationReviewPanel />
          </section>
        </>
      }
      analytics={
        <section className="emergency-route-card cd-surface-card">
          <div className="emergency-route-section-card__header">
            <div>
              <strong>Live operational metrics</strong>
              <p className="emergency-route-section-card__lead">
                Actionable signals for {roleLabel} — tap a metric to open the owning workflow.
              </p>
            </div>
            <span className="emergency-route-journey-card__count">{visibleMetrics.length}</span>
          </div>
          <div className="hospital-command-center__metric-grid">
            {visibleMetrics.map((metric) => (
              <CommandMetricGraphicCard
                key={metric.id}
                id={metric.id}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
                tone={metric.tone}
                route={
                  metric.route ||
                  resolveUnifiedMetricRoute(metric.id) ||
                  CANONICAL_ROUTES.emergencyCommandCenter
                }
              />
            ))}
          </div>
          <CommandCenterInsightsCharts snapshot={snapshot} visibleMetrics={visibleMetrics} />
        </section>
      }
      supportingContext={
        <div className="hospital-command-center__panels">
          <section className="emergency-route-card cd-surface-card">
            <div className="emergency-route-section-card__header">
              <div>
                <strong>Application knowledge graph</strong>
                <p className="emergency-route-section-card__lead">
                  Connected patients, staff, departments, alerts, workflows, services, queues, rooms,
                  beds, diagnostics, and operational events.
                </p>
              </div>
            </div>
            <UnifiedApplicationKnowledgeGraphPanel />
          </section>
          <section className="emergency-route-card cd-surface-card">
            <div className="emergency-route-section-card__header">
              <strong>Service bottlenecks</strong>
              <span className="emergency-route-journey-card__count">{snapshot.bottlenecks.length}</span>
            </div>
            {snapshot.bottlenecks.length === 0 ? (
              <p className="emergency-route-section-card__lead">No active bottleneck signals.</p>
            ) : (
              <ul className="hospital-command-center__panel-list">
                {snapshot.bottlenecks.map((item) => (
                  <li key={item.id} className="hospital-command-center__panel-row">
                    <div>
                      <strong>{item.title}</strong>
                      {item.ownerRole ? <p>Owner: {item.ownerRole}</p> : null}
                    </div>
                    <span
                      className={`hospital-command-center__severity hospital-command-center__severity--${
                        item.severity === 'critical' ? 'critical' : 'warning'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="emergency-route-card cd-surface-card">
            <div className="emergency-route-section-card__header">
              <strong>Unresolved alerts</strong>
              <span className="emergency-route-journey-card__count">
                {snapshot.unresolvedAlerts.length}
              </span>
            </div>
            {snapshot.unresolvedAlerts.length === 0 ? (
              <p className="emergency-route-section-card__lead">All critical alerts acknowledged.</p>
            ) : (
              <ul className="hospital-command-center__panel-list">
                {snapshot.unresolvedAlerts.map((alert) => (
                  <li key={alert.id} className="hospital-command-center__panel-row">
                    <div>
                      <strong>{alert.title}</strong>
                      <p>Acknowledgement required before next clinical action</p>
                    </div>
                    <Link to={alert.route} className="emergency-route-filter-banner__btn cd-btn cd-btn--secondary cd-btn--sm">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="emergency-route-card cd-surface-card cdl-ai-panel">
            <div className="emergency-route-section-card__header">
              <strong className="cdl-ai-panel__eyebrow">AI recommendations</strong>
              <span className="emergency-route-journey-card__count">
                {snapshot.aiRecommendations.length}
              </span>
            </div>
            {snapshot.aiRecommendations.length > 0 ? (
              <AiTruthLabel {...hospitalCommandCenterRecommendationsTruthLabel()} compact />
            ) : null}
            {snapshot.aiRecommendations.length === 0 ? (
              <p className="emergency-route-section-card__lead">
                No pending CareDroid Copilot recommendations —{' '}
                <Link to={CANONICAL_ROUTES.emergencyCopilot}>open copilot</Link> for case context.
              </p>
            ) : (
              <ul className="hospital-command-center__panel-list">
                {snapshot.aiRecommendations.map((rec) => (
                  <li key={rec.id} className="hospital-command-center__panel-row">
                    <div>
                      <strong>{rec.action}</strong>
                      <p>{rec.rationale}</p>
                    </div>
                    <Link
                      to={rec.route || CANONICAL_ROUTES.emergencyCopilot}
                      className="emergency-route-filter-banner__btn cd-btn cd-btn--secondary cd-btn--sm"
                    >
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      }
      history={
        <>
          {intelligenceView ? <CommandCenterIntelligenceLens view={intelligenceView} /> : null}
          <div role="note" className="emergency-route-card emergency-route-copilot-hint cdl-surface cdl-surface--inactive">
            {CAREDROID_PRODUCT.safetyLine} Historical analytics and shift reports live under{' '}
            <Link to={CANONICAL_ROUTES.emergencyAnalytics}>Analytics</Link> — this command center shows
            only what needs action now.
          </div>
        </>
      }
    />
  );
}