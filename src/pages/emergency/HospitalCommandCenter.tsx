import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CommandActionGraphicCard,
  CommandMetricGraphicCard,
} from '../../components/graphics/CdlGraphicKit';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModeRegistry';
import { CAREDROID_PRODUCT } from '../../config/caredroidProduct.config';
import { buildCommandCenterWorkflowActions } from '../../config/operationalWorkflow.config';
import {
  resolveHospitalCommandMetricsForRole,
  resolveHospitalCommandRoleLabel,
} from '../../config/hospitalCommandCenterRolePolicy';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useOperationalIntelligence } from '../../hooks/useOperationalIntelligence';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useEmergencyAnalytics } from '../../hooks/useEmergencyOs';
import {
  buildHospitalCommandCenterSnapshot,
  filterHospitalCommandMetrics,
} from '../../services/hospitalCommandCenterModel';
import { buildFullEmergencyCareJourneySnapshot } from '../../services/fullEmergencyCareJourneyService';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import useEdRouteDataContext from '../../hooks/useEdRouteDataContext';
import { EmergencyRoutePage } from './emergencyRouteShared';
import PatientFlowStatusPanel from '../../components/emergency/PatientFlowStatusPanel';
import AdministrativeAutomationReviewPanel from '../../components/emergency/AdministrativeAutomationReviewPanel';
import './hospital-command-center.css';

export default function HospitalCommandCenter() {
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
  const operationalIntelligence = useOperationalIntelligence({
    screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
    realtime: true,
  });
  const emergencyAnalytics = useEmergencyAnalytics();

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
      patients,
      referrals,
      staff,
    ],
  );

  const visibleMetricIds = useMemo(
    () => resolveHospitalCommandMetricsForRole(emergencyRole.role),
    [emergencyRole.role],
  );

  const visibleMetrics = useMemo(
    () => filterHospitalCommandMetrics(snapshot, visibleMetricIds),
    [snapshot, visibleMetricIds],
  );

  const workflowActions = useMemo(() => {
    const journey = buildFullEmergencyCareJourneySnapshot({
      patients,
      staff,
      emsArrivals,
      alerts,
      capacity,
    });
    return buildCommandCenterWorkflowActions({
      dispatch: journey.liveServiceSummaries.dispatch,
      readiness: journey.liveServiceSummaries.readiness,
      metrics: journey.metrics,
      staffRouting: journey.liveServiceSummaries.staffRouting,
      bottlenecks: journey.liveServiceSummaries.bottlenecks,
    }).slice(0, 4);
  }, [alerts, capacity, emsArrivals, patients, staff]);

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
              source: backendAvailable ? 'backend' : 'local-store-fallback',
              generatedAt: snapshot.generatedAt,
            }}
            loading={false}
          />
          <div
            className={`hospital-command-center__status cdl-surface cdl-surface--operational-status hospital-command-center__status--${snapshot.tone}`}
            role="status"
          >
            <p className="hospital-command-center__status-line">{snapshot.statusLine}</p>
            <div className="hospital-command-center__status-meta">
              <span>{CAREDROID_PRODUCT.safetyShort}</span>
              <span>Role view: {roleLabel}</span>
              <span>
                3-min: {snapshot.threeMinuteCompliance.compliant ? 'compliant' : 'breach'}
              </span>
            </div>
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
                <strong>Administrative automation review</strong>
                <p className="emergency-route-section-card__lead">
                  Approve, modify, or override automated routing, handoffs, summaries, triage prep,
                  notifications, assignments, queue priority, and escalations.
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
                route={metric.route || CANONICAL_ROUTES.emergencyCommandCenter}
              />
            ))}
          </div>
        </section>
      }
      supportingContext={
        <div className="hospital-command-center__panels">
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
        <div role="note" className="emergency-route-card emergency-route-copilot-hint cdl-surface cdl-surface--inactive">
          {CAREDROID_PRODUCT.safetyLine} Historical analytics and shift reports live under{' '}
          <Link to={CANONICAL_ROUTES.emergencyAnalytics}>Analytics</Link> — this command center shows
          only what needs action now.
        </div>
      }
    />
  );
}