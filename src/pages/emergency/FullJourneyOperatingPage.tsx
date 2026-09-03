import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useEmergencyStore } from '../../store/emergencyStore';
import { buildFullEmergencyCareJourneySnapshot } from '../../services/fullEmergencyCareJourneyService';
import {
  getActivePlans,
  getReadinessSummary,
  createReadinessPlan,
  checkEquipmentItem,
  markReady,
  notifyStaff,
} from '../../services/edReadinessService';
import {
  getDiagnosticsBoard,
  getDiagnosticsSummary,
  DIAGNOSTIC_TYPE_LABELS,
  DIAGNOSTIC_PRIORITY_LABELS,
} from '../../services/diagnosticsCoordinationService';
import { getStaffRoutingSummary } from '../../services/staffRoutingService';
import { getCADSystemSummary } from '../../services/cadIntegrationService';
import { getAllActiveAssessments } from '../../services/prehospitalAssessmentService';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import CareOperationsInboxPanel from '../../components/emergency/CareOperationsInboxPanel';
import useEmergencyOperatingSurface from '../../hooks/useEmergencyOperatingSurface';
import type { OperatingSurfaceId } from '../../services/emergencyOsApi';
import { EmergencyRoutePage, MetricGrid, MaturityChip } from './emergencyRouteShared';
import type { EDReadinessPlan } from '../../types/emergency';
import {
  buildCommandCenterWorkflowActions,
  type OperationalWorkflowAction,
} from '../../config/operationalWorkflow.config';
import './FullJourneyOperatingPage.css';

type ViewId = 'journey' | 'ed-readiness' | 'diagnostics' | 'handoffs' | 'reports';

type FullJourneyOperatingPageProps = Readonly<{
  view?: ViewId;
}>;

const VIEW_COPY: Record<ViewId, { eyebrow: string; title: string; description: string }> = {
  journey: {
    eyebrow: 'Command center',
    title: 'Full Emergency-Care Journey',
    description:
      'One operating picture from emergency signal and 911 call through EMS, ED care, disposition, reporting, and analytics feedback.',
  },
  'ed-readiness': {
    eyebrow: 'Pre-arrival',
    title: 'ED Readiness',
    description:
      'Prepare rooms, staff, equipment, specialty teams, lab, radiology, and pharmacy before the patient arrives.',
  },
  diagnostics: {
    eyebrow: 'Diagnostics',
    title: 'Diagnostics Coordination',
    description:
      'Coordinate lab, imaging, ECG, pharmacy review, and consult workflows from the live ED operating state.',
  },
  handoffs: {
    eyebrow: 'Handoffs',
    title: 'Structured Handoffs',
    description:
      'Track EMS-to-ED, ED-to-department, admission, transfer, and discharge handoff readiness.',
  },
  reports: {
    eyebrow: 'Reports',
    title: 'Operational Reports',
    description:
      'Review response compliance, bottlenecks, outcomes, safety review signals, and analytics feedback loops.',
  },
};

const VIEW_STAGE_IDS: Record<ViewId, readonly string[]> = {
  journey: [],
  'ed-readiness': ['hospital-pre-arrival', 'ed-readiness', 'patient-arrival'],
  diagnostics: ['diagnostics', 'treatment-observation'],
  handoffs: ['hospital-pre-arrival', 'disposition', 'handoff-reporting'],
  reports: ['outcome-tracking', 'analytics-feedback'],
};

// ── Shared card shell ────────────────────────────────────────────────────────

function SectionCard({
  title,
  lead,
  badge,
  children,
}: {
  title: React.ReactNode;
  lead?: string;
  badge?: string | number;
  children: React.ReactNode;
}) {
  return (
    <section className="emergency-route-card">
      <div className="emergency-route-section-card__header">
        <div>
          <strong>{title}</strong>
          {lead && <p className="emergency-route-section-card__lead">{lead}</p>}
        </div>
        {badge !== undefined && (
          <span className="emergency-route-journey-card__count">{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function StatusChip({ label, status }: { label: string; status: string }) {
  return (
    <span className="emergency-route-action-chip fj-status-chip" data-status={status}>
      {label} · {status}
    </span>
  );
}

function MetricChip({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  const warnOn = Boolean(warn && Number(value) > 0);
  return (
    <div className={`fj-metric-chip${warnOn ? ' fj-metric-chip--warn' : ''}`}>
      <div className="fj-metric-chip__value">{value}</div>
      <div className="fj-metric-chip__label">{label}</div>
    </div>
  );
}

function ActionToneDot({ tone }: { tone: OperationalWorkflowAction['tone'] }) {
  return (
    <span
      className={`emergency-command-action__tone emergency-command-action__tone--${tone}`}
      aria-hidden="true"
    />
  );
}

function CommandCenterActionPanel({ actions }: { actions: readonly OperationalWorkflowAction[] }) {
  const activeCount = actions.filter((action) => action.active).length;

  return (
    <SectionCard
      title="Top Critical Actions"
      lead="Sorted from live dispatch, readiness, alerts, AI review, bottleneck, and staff-routing signals."
      badge={activeCount ? `${activeCount} active` : 'clear'}
    >
      <div className="emergency-command-action-grid">
        {actions.map((action) => (
          <article
            key={action.id}
            className={`emergency-route-card emergency-command-action emergency-command-action--${action.tone}${
              action.active ? ' emergency-command-action--active' : ''
            }`}
          >
            <div className="emergency-command-action__header">
              <ActionToneDot tone={action.tone} />
              <strong>{action.label}</strong>
              <span className="emergency-command-action__count">{action.count}</span>
            </div>
            <p>{action.reason}</p>
            <dl className="emergency-command-action__meta">
              <div>
                <dt>Owner</dt>
                <dd>{action.owner}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{action.deadlineLabel}</dd>
              </div>
            </dl>
            <div className="emergency-command-action__footer">
              <span>{action.nextAction}</span>
              <Link to={action.route} className="emergency-route-filter-banner__btn">
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Journey view ─────────────────────────────────────────────────────────────

function JourneyView({
  snapshot,
}: {
  snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot>;
}) {
  const cadSummary = snapshot.liveServiceSummaries.cad;
  const prehospitalSummary = snapshot.liveServiceSummaries.prehospital;
  const staffSummary = snapshot.liveServiceSummaries.staffRouting;
  const dxSummary = snapshot.liveServiceSummaries.diagnostics;
  const commandActions = buildCommandCenterWorkflowActions({
    dispatch: snapshot.liveServiceSummaries.dispatch,
    readiness: snapshot.liveServiceSummaries.readiness,
    metrics: snapshot.metrics,
    staffRouting: snapshot.liveServiceSummaries.staffRouting,
    bottlenecks: snapshot.liveServiceSummaries.bottlenecks,
  });

  return (
    <>
      <article className="emergency-route-card emergency-route-copilot-hint">
        <strong>{snapshot.principle}</strong>
        <p>
          {snapshot.mission} {snapshot.safety}
        </p>
      </article>

      <CommandCenterActionPanel actions={commandActions} />

      <SectionCard
        title="3-Minute Response Objective"
        lead="Door-to-action compliance tracked through journey traces and the response timer engine."
        badge={
          snapshot.metrics.threeMinuteBreaches
            ? `${snapshot.metrics.threeMinuteBreaches} breach`
            : 'on track'
        }
      >
        <div className="u-flex-wrap-gap-10-mt-10">
          <MetricChip label="Active journeys" value={snapshot.metrics.activeJourneyTraces} />
          <MetricChip label="3-min breaches" value={snapshot.metrics.threeMinuteBreaches} warn />
          <MetricChip
            label="Unacked critical"
            value={snapshot.metrics.unacknowledgedCriticalAlerts}
            warn
          />
          <MetricChip label="Inbound EMS" value={snapshot.metrics.inboundEms} warn />
        </div>
      </SectionCard>

      <SectionCard
        title="Live Journey Traces"
        lead="End-to-end signal chain from 911 call through EMS, reception, triage, treatment, and reporting."
        badge={snapshot.activeTraces?.length ?? 0}
      >
        {snapshot.activeTraces?.length ? (
          <div className="emergency-route-stack u-mt-10">
            {snapshot.activeTraces.map((trace) => (
              <article key={trace.traceId} className="emergency-route-queue-row">
                <div className="u-flex-1">
                  <strong className="u-fs-13">{trace.currentStage.replace(/_/g, ' ')}</strong>
                  <div className="emergency-route-queue-row__patients fj-caption">
                    {trace.callId ? `Call ${trace.callId}` : 'Walk-in'}
                    {trace.patientId ? ` · Patient ${trace.patientId}` : ''}
                    {trace.emsArrivalId ? ` · EMS ${trace.emsArrivalId}` : ''}
                  </div>
                  <small className="emergency-route-queue-row__movement u-fs-11">
                    {trace.signalCount} signals · started{' '}
                    {new Date(trace.startedAt).toLocaleTimeString()}
                  </small>
                </div>
                <span
                  className={`emergency-route-queue-row__oldest ${trace.threeMinuteBreachOccurred ? 'fj-text-critical-flex' : 'fj-text-subtle-flex'}`}
                >
                  {trace.threeMinuteBreachOccurred ? '3-min breach' : 'compliant'}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="emergency-route-section-card__lead u-mt-10">
            No active traces yet. Log a call in the Dispatch Console, dispatch a unit, and route
            through reception to populate the full emergency care journey.
          </p>
        )}
      </SectionCard>

      {/* Prehospital tier */}
      <SectionCard
        title="Prehospital Tier"
        lead="CAD dispatch status, active EMS assessments, and pre-arrival pipeline."
        badge={cadSummary.activeAssignments}
      >
        <div className="u-flex-wrap-gap-10-mt-10">
          <MetricChip label="CAD units total" value={cadSummary.totalUnits} />
          <MetricChip label="Available" value={cadSummary.availableUnits} />
          <MetricChip label="En route" value={cadSummary.enRouteUnits} warn />
          <MetricChip label="On scene" value={cadSummary.onSceneUnits} />
          <MetricChip label="Transporting" value={cadSummary.transportingUnits} warn />
          <MetricChip
            label="Active assessments"
            value={prehospitalSummary.activeAssessments}
            warn
          />
          <MetricChip label="Packets transmitted" value={prehospitalSummary.transmittedPackets} />
        </div>
        <div className="emergency-route-chip-row u-mt-10">
          <Link to={CANONICAL_ROUTES.emergencyDispatch} className="emergency-route-action-chip">
            Dispatch Console
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyEms} className="emergency-route-action-chip">
            EMS Pipeline
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyEdReadiness} className="emergency-route-action-chip">
            ED Readiness
          </Link>
        </div>
      </SectionCard>

      {/* ED tier */}
      <SectionCard
        title="ED Operations Tier"
        lead="Active patients, queues, staff routing, and diagnostics."
        badge={snapshot.metrics.activePatients}
      >
        <div className="u-flex-wrap-gap-10-mt-10">
          <MetricChip label="Active patients" value={snapshot.metrics.activePatients} />
          <MetricChip label="P1/P2" value={snapshot.metrics.p1p2Patients} warn />
          <MetricChip label="Inbound EMS" value={snapshot.metrics.inboundEms} warn />
          <MetricChip label="Staff pending" value={staffSummary.pendingAcknowledgement} warn />
          <MetricChip label="STAT orders" value={dxSummary.statOrders} warn />
          <MetricChip label="Capacity" value={snapshot.metrics.capacityBand} />
        </div>
        <div className="emergency-route-chip-row u-mt-10">
          <Link to={CANONICAL_ROUTES.emergencyWhiteboard} className="emergency-route-action-chip">
            Whiteboard
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyQueues} className="emergency-route-action-chip">
            Patient Queues
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyDiagnostics} className="emergency-route-action-chip">
            Diagnostics
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyCopilot} className="emergency-route-action-chip">
            AI Chief
          </Link>
        </div>
      </SectionCard>

      {/* Journey stage map */}
      <SectionCard
        title="20-Stage Journey Map"
        lead="Live status for each stage. Click Open to navigate to that stage's surface."
        badge={snapshot.stages.length}
      >
        <div className="emergency-route-stack u-mt-10">
          {snapshot.stages.map((stage) => (
            <article key={stage.id} className="emergency-route-queue-row">
              <div className="u-flex-1">
                <strong className="u-fs-13">
                  {stage.order}. {stage.label}
                </strong>
                <div className="emergency-route-queue-row__patients fj-caption">
                  {stage.outcome}
                </div>
                <small className="emergency-route-queue-row__movement u-fs-11">
                  {stage.ownerRoles.join(' · ')}
                </small>
              </div>
              <Link
                to={stage.route}
                className="emergency-route-filter-banner__btn fj-flex-shrink-0"
              >
                Open
              </Link>
              <span
                className="emergency-route-queue-row__oldest fj-text-subtle-flex"
                data-status={stage.status}
              >
                {stage.status}
              </span>
            </article>
          ))}
        </div>
      </SectionCard>

      {/* Service map */}
      <SectionCard
        title="Connected SaaS Services"
        lead="Every service maps to a concrete implementation file and route."
        badge={snapshot.services.length}
      >
        <div className="emergency-route-chip-row">
          {snapshot.services.map((service) => (
            <span
              key={service.id}
              className="emergency-route-action-chip"
              title={service.implementation}
            >
              {service.label} · {service.reuseStatus}
            </span>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

// ── ED Readiness view ────────────────────────────────────────────────────────

function CreateReadinessPlanForm({ onCreated }: { onCreated: () => void }) {
  const [bay, setBay] = useState('');
  const [etaMinutes, setEtaMinutes] = useState('8');
  const [resources, setResources] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resourceOptions = [
    'STEMI protocol',
    'Stroke protocol',
    'Trauma bay',
    'Sepsis protocol',
    'Airway kit',
    'Blood products',
  ];

  function toggle(r: string) {
    setResources((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const eta = new Date(Date.now() + Number(etaMinutes) * 60_000).toISOString();
    createReadinessPlan({
      callId: `manual-${Date.now()}`,
      preparedBy: 'charge-nurse-current',
      expectedArrivalAt: eta,
      activatedResources: resources,
      assignedBay: bay.trim() || undefined,
    });
    setSubmitting(false);
    setBay('');
    setEtaMinutes('8');
    setResources([]);
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="fj-stack-col-10">
      <div className="u-grid-2-gap-10">
        <div>
          <label className="fj-label-block" htmlFor="fj-bay">
            Bay / Room
          </label>
          <input
            id="fj-bay"
            className="fj-field-input"
            value={bay}
            onChange={(e) => setBay(e.target.value)}
            placeholder="e.g. Resus 1, Trauma Bay..."
          />
        </div>
        <div>
          <label className="fj-label-block" htmlFor="fj-eta-minutes">
            ETA (minutes)
          </label>
          <input
            id="fj-eta-minutes"
            className="fj-field-input"
            type="number"
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(e.target.value)}
            min={1}
            max={60}
          />
        </div>
      </div>
      <div>
        <div className="fj-label-mb4">Activate resources:</div>
        <div className="u-flex-wrap u-gap-6">
          {resourceOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggle(r)}
              className={`fj-resource-chip${resources.includes(r) ? ' fj-resource-chip--on' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" disabled={submitting} className="fj-btn-primary">
        Create Readiness Plan
      </button>
    </form>
  );
}

function ReadinessPlanCard({ plan, onUpdated }: { plan: EDReadinessPlan; onUpdated: () => void }) {
  const checkedItems = plan.equipmentChecklist.filter((e) => e.ready).length;
  const totalItems = plan.equipmentChecklist.length;
  const overdue =
    new Date(plan.expectedArrivalAt).getTime() < Date.now() && plan.status === 'pending';
  const allChecked = checkedItems === totalItems && totalItems > 0;

  function handleCheckItem(item: string) {
    checkEquipmentItem(plan.id, item);
    onUpdated();
  }

  function handleMarkReady() {
    markReady(plan.id);
    onUpdated();
  }

  function handleNotifyStaff() {
    notifyStaff(plan.id, { roleId: 'charge_nurse', name: 'Charge Nurse (Current)' });
    onUpdated();
  }

  return (
    <article
      className={`fj-plan-card${overdue ? ' fj-plan-card--overdue' : plan.status === 'ready' ? ' fj-plan-card--ready' : ''}`}
    >
      <div className="fj-row-between">
        <div>
          <strong className="u-fs-13">{plan.assignedRoom ?? plan.assignedBay ?? 'Bay TBD'}</strong>
          <div className="fj-caption-12-mt">
            ETA: {new Date(plan.expectedArrivalAt).toLocaleTimeString()}
            {plan.specialtyTeamCalled && ` · Specialty: ${plan.specialtyTeams.join(', ')}`}
          </div>
          <div className="fj-caption-11">
            Equipment: {checkedItems}/{totalItems} · Staff notified: {plan.notifiedStaff.length}
          </div>
        </div>
        <span
          className={`fj-plan-status ${overdue ? 'fj-plan-status--overdue' : plan.status === 'ready' ? 'fj-plan-status--ready' : 'fj-plan-status--active'}`}
        >
          {overdue ? 'OVERDUE' : plan.status.toUpperCase()}
        </span>
      </div>

      {/* Equipment checklist */}
      {plan.equipmentChecklist.length > 0 && (
        <div className="u-flex-col u-gap-4">
          {plan.equipmentChecklist.map((item) => (
            <label
              key={item.item}
              className={`fj-check-row ${item.ready ? 'fj-check-row--ready' : 'fj-check-row--todo'}`}
            >
              <input
                type="checkbox"
                checked={item.ready}
                disabled={item.ready}
                onChange={() => !item.ready && handleCheckItem(item.item)}
                className="fj-check-row"
              />
              {item.item}
            </label>
          ))}
        </div>
      )}

      {/* Actions */}
      {plan.status === 'pending' && (
        <div className="fj-row-wrap-8-mt">
          {plan.notifiedStaff.length === 0 && (
            <button type="button" onClick={handleNotifyStaff} className="fj-btn-outline-accent">
              Notify Charge Nurse
            </button>
          )}
          <button
            type="button"
            onClick={handleMarkReady}
            disabled={!allChecked && totalItems > 0}
            className={`fj-btn-mark-ready${allChecked ? ' fj-btn-mark-ready--enabled' : ''}`}
            title={
              allChecked
                ? 'Mark bay as ready'
                : `Check all ${totalItems - checkedItems} remaining items first`
            }
          >
            ✓ Mark Bay Ready
          </button>
        </div>
      )}

      {plan.status === 'ready' && (
        <div className="fj-text-ok-12">✓ Bay ready for patient arrival</div>
      )}
    </article>
  );
}

function EdReadinessView() {
  const [plans, setPlans] = useState(getActivePlans());
  const [summary, setSummary] = useState(getReadinessSummary());
  const [cadSummary, setCadSummary] = useState(getCADSystemSummary());
  const [activeAssessments, setActiveAssessments] = useState(getAllActiveAssessments());
  const [showCreateForm, setShowCreateForm] = useState(false);

  const refresh = useCallback(() => {
    setPlans(getActivePlans());
    setSummary(getReadinessSummary());
    setCadSummary(getCADSystemSummary());
    setActiveAssessments(getAllActiveAssessments());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <>
      {/* Summary metrics */}
      <div className="u-flex-wrap-gap-10">
        <MetricChip label="Active plans" value={summary.activePlans} />
        <MetricChip label="Ready" value={summary.readyCount} />
        <MetricChip label="Pending" value={summary.pendingCount} warn />
        <MetricChip label="Overdue" value={summary.overdueCount} warn />
        {/* Deliberately NOT labeled "Inbound EMS" -- the always-visible MetricGrid a few lines
            above this view already uses that exact label for metrics.inboundEms (the ED's own
            real emsArrivals record count). This chip is sourced from cadIntegrationService's
            in-memory CAD unit registry (7 hardcoded demo units, unrelated to ED patient
            records) -- both chips could render simultaneously on the ed-readiness tab with
            different numbers under an identical label. */}
        <MetricChip
          label="CAD units inbound"
          value={cadSummary.enRouteUnits + cadSummary.transportingUnits}
          warn
        />
        <MetricChip label="Active prehospital" value={activeAssessments.length} />
      </div>

      {/* Overdue alert */}
      {summary.overdueCount > 0 && (
        <div className="fj-critical-panel">
          <strong className="fj-text-critical-13">
            ⚡ {summary.overdueCount} readiness plan{summary.overdueCount > 1 ? 's' : ''} overdue —
            patient arrival expected. Check equipment now.
          </strong>
        </div>
      )}

      {/* Alert flags from prehospital */}
      {activeAssessments.length > 0 && (
        <SectionCard
          title="Inbound EMS — Prehospital Alerts"
          lead="Critical flags from active EMS assessments en route. Review and activate ED protocols."
          badge={
            activeAssessments.filter(
              (a) => a.traumaActivation || a.strokeAlert || a.stemiAlert || a.sepsisConcern,
            ).length
          }
        >
          <div className="emergency-route-stack u-mt-10">
            {activeAssessments.map((assessment) => {
              const flags: string[] = [];
              if (assessment.traumaActivation) flags.push('TRAUMA ACTIVATION');
              if (assessment.strokeAlert) flags.push('STROKE ALERT');
              if (assessment.stemiAlert) flags.push('STEMI ALERT');
              if (assessment.sepsisConcern) flags.push('SEPSIS CONCERN');

              return (
                <article key={assessment.id} className="emergency-route-queue-row">
                  <div className="u-flex-1">
                    <strong className="u-fs-13">{assessment.chiefComplaint}</strong>
                    <div className="fj-caption-12-mt">
                      Crew: {assessment.crewLeadName} · Mechanism: {assessment.mechanism}
                    </div>
                    {flags.length > 0 && (
                      <div className="fj-row-wrap-6-mt">
                        {flags.map((flag) => (
                          <span key={flag} className="fj-text-critical-11">
                            ⚠ {flag}
                          </span>
                        ))}
                      </div>
                    )}
                    {assessment.currentVitals && (
                      <div className="fj-caption-11-mt">
                        Vitals: HR {assessment.currentVitals.hr ?? '?'} · SpO2{' '}
                        {assessment.currentVitals.spo2 ?? '?'}% · BP{' '}
                        {assessment.currentVitals.sbp ?? '?'}/{assessment.currentVitals.dbp ?? '?'}
                      </div>
                    )}
                    {flags.length > 0 && (
                      <div className="fj-mt-6">
                        <button
                          type="button"
                          onClick={() => {
                            const resources = flags.map((f) =>
                              f === 'TRAUMA ACTIVATION'
                                ? 'Trauma bay'
                                : f === 'STEMI ALERT'
                                  ? 'STEMI protocol'
                                  : f === 'STROKE ALERT'
                                    ? 'Stroke protocol'
                                    : 'Sepsis protocol',
                            );
                            const eta = new Date(Date.now() + 8 * 60_000).toISOString();
                            createReadinessPlan({
                              callId: assessment.id,
                              preparedBy: 'charge-nurse-current',
                              expectedArrivalAt: eta,
                              activatedResources: resources,
                            });
                            refresh();
                          }}
                          className="fj-btn-critical"
                        >
                          ⚡ Activate ED Protocols
                        </button>
                      </div>
                    )}
                  </div>
                  <span
                    className={`emergency-route-queue-row__oldest ${flags.length > 0 ? 'fj-text-critical' : 'fj-text-subtle'}`}
                  >
                    {assessment.status}
                  </span>
                </article>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Readiness plans with actions */}
      <SectionCard
        title="ED Readiness Plans"
        lead="Active bay/room preparation plans. Check equipment, notify staff, and mark bay ready before patient arrival."
        badge={plans.length}
      >
        <div className="fj-actions-row" style={plans.length > 0 ? { marginBottom: 12 } : undefined}>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className={`fj-btn-toggle ${showCreateForm ? 'fj-btn-toggle--on' : 'fj-btn-toggle--off'}`}
          >
            {showCreateForm ? 'Cancel' : '+ Create Readiness Plan'}
          </button>
          <Link
            to={CANONICAL_ROUTES.emergencyDispatch}
            className="emergency-route-action-chip u-fs-12"
          >
            Dispatch Console
          </Link>
        </div>

        {showCreateForm && (
          <CreateReadinessPlanForm
            onCreated={() => {
              setShowCreateForm(false);
              refresh();
            }}
          />
        )}

        {plans.length === 0 && !showCreateForm ? (
          <p className="fj-caption-13-mt">
            No active readiness plans. Create a plan manually above, or send a pre-alert from the
            Dispatch Console.
          </p>
        ) : (
          <div className="fj-stack-col-10-mt">
            {plans.map((plan) => (
              <ReadinessPlanCard key={plan.id} plan={plan} onUpdated={refresh} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* CAD unit board */}
      <SectionCard
        title="CAD Unit Board"
        lead="Real-time EMS unit status from the dispatch system."
        badge={cadSummary.totalUnits}
      >
        <div className="emergency-route-chip-row u-mt-10">
          <StatusChip label={`${cadSummary.availableUnits} Available`} status="ready" />
          <StatusChip label={`${cadSummary.enRouteUnits} En Route`} status="active" />
          <StatusChip label={`${cadSummary.transportingUnits} Transporting`} status="active" />
          <StatusChip label={`${cadSummary.onSceneUnits} On Scene`} status="ready" />
        </div>
        <div className="emergency-route-chip-row u-mt-8">
          <Link to={CANONICAL_ROUTES.emergencyDispatch} className="emergency-route-action-chip">
            Dispatch Console
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyEms} className="emergency-route-action-chip">
            EMS Pipeline
          </Link>
        </div>
      </SectionCard>

      <div role="note" className="fj-alert-box">
        ED Readiness planning is decision support only. Bed assignment, specialty team activation,
        and equipment preparation require charge nurse or physician authorization.
      </div>
    </>
  );
}

// ── Diagnostics view ─────────────────────────────────────────────────────────

function DiagnosticsView() {
  type BoardRow = ReturnType<typeof getDiagnosticsBoard>[number];
  const [board, setBoard] = useState<BoardRow[]>(getDiagnosticsBoard());
  const [summary, setSummary] = useState(getDiagnosticsSummary());

  const refresh = useCallback(() => {
    setBoard(getDiagnosticsBoard());
    setSummary(getDiagnosticsSummary());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <>
      <div className="u-flex-wrap-gap-10">
        <MetricChip label="Total orders" value={summary.totalOrders} />
        <MetricChip label="STAT" value={summary.statOrders} warn />
        <MetricChip label="Urgent" value={summary.urgentOrders} />
        <MetricChip label="Lab pending" value={summary.pendingLab} />
        <MetricChip label="Imaging pending" value={summary.pendingImaging} />
        <MetricChip label="ECG pending" value={summary.pendingEcg} />
        <MetricChip label="Pharmacy" value={summary.pendingPharmacy} />
        <MetricChip label="Consult" value={summary.pendingConsult} />
        <MetricChip label="Resulted" value={summary.resulted} />
      </div>

      <SectionCard
        title={
          <>
            Diagnostics Board <MaturityChip maturity="planned" />
          </>
        }
        lead="Active diagnostic orders sorted by priority. STAT orders appear first."
        badge={board.length}
      >
        {board.length === 0 ? (
          <p className="fj-caption-13-mt">
            Order-based diagnostics tracking is not yet built -- there is no clinician-facing way to
            place a lab, imaging, ECG, or pharmacy order in CareDroid today, so this board can never
            show real data. The metrics above will always read 0 until order placement is
            implemented.
          </p>
        ) : (
          <div className="emergency-route-stack u-mt-10">
            {board.map((row) => (
              <article key={row.orderId} className="emergency-route-queue-row">
                <div className="u-flex-1">
                  <div className="u-flex-center u-gap-8">
                    <strong className="u-fs-13">{DIAGNOSTIC_TYPE_LABELS[row.type]}</strong>
                    <span className="fj-priority-badge" data-priority={row.priority}>
                      {DIAGNOSTIC_PRIORITY_LABELS[row.priority]}
                    </span>
                  </div>
                  <div className="fj-caption-12-mt">
                    Patient {row.patientId.slice(-6)} · {row.targetDepartment}· Ordered{' '}
                    {new Date(row.orderedAt).toLocaleTimeString()}
                  </div>
                  {row.resultSummary && (
                    <div className="fj-text-ok-12-mt">Result: {row.resultSummary}</div>
                  )}
                </div>
                <span
                  className="emergency-route-queue-row__oldest fj-dx-status"
                  data-status={row.status}
                >
                  {row.status}
                </span>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Diagnostic Workflows"
        lead="Navigate to laboratory, imaging, pharmacy, and consult surfaces."
      >
        <div className="emergency-route-chip-row u-mt-10">
          <Link
            to="/emergency/tools?filter=laboratory&q=lab-interp"
            className="emergency-route-action-chip"
          >
            Lab Interpreter
          </Link>
          <Link
            to="/emergency/tools?filter=clinical-tools&q=drug-check"
            className="emergency-route-action-chip"
          >
            Drug Checker
          </Link>
          <Link to="/emergency/referrals" className="emergency-route-action-chip">
            Consults
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyTools} className="emergency-route-action-chip">
            All Clinical Tools
          </Link>
        </div>
      </SectionCard>

      <div role="note" className="fj-alert-box">
        Diagnostic coordination is decision support only. All orders require physician
        authorization. Lab, imaging, and pharmacy results require licensed clinician interpretation
        before clinical action.
      </div>
    </>
  );
}

// ── Handoffs view ────────────────────────────────────────────────────────────

function HandoffsView() {
  const patients = useEmergencyStore((state) => state.patients);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const staffRouting = getStaffRoutingSummary();

  const dispositionPatients = patients.filter(
    (p) => p.state === 'Disposition' || p.state === 'Admission',
  );
  const pendingHandoffs = patients.filter(
    (p) => p.state === 'Discharge' || p.state === 'Admission',
  );
  const arrivedEms = emsArrivals.filter((a) => a.status === 'Arrived' || a.status === 'Handoff');

  return (
    <>
      <CareOperationsInboxPanel />

      <div className="u-flex-wrap-gap-10">
        <MetricChip label="Disposition patients" value={dispositionPatients.length} />
        <MetricChip label="Pending handoffs" value={pendingHandoffs.length} warn />
        <MetricChip label="EMS handoffs active" value={arrivedEms.length} warn />
        <MetricChip
          label="Staff assignments pending"
          value={staffRouting.pendingAcknowledgement}
          warn
        />
      </div>

      {arrivedEms.length > 0 && (
        <SectionCard
          title="EMS → ED Handoffs"
          lead="Ambulance crews at the ED awaiting patient handoff confirmation."
          badge={arrivedEms.length}
        >
          <div className="emergency-route-stack u-mt-10">
            {arrivedEms.map((arrival) => (
              <article key={arrival.id} className="emergency-route-queue-row">
                <div className="u-flex-1">
                  <strong className="u-fs-13">{arrival.chiefComplaint}</strong>
                  <div className="fj-caption-12-mt">
                    Unit: {arrival.unitName} · Age {arrival.patientAge} {arrival.patientSex}·
                    Severity: {arrival.severity}
                  </div>
                  {arrival.handoffSummary && (
                    <div className="fj-caption-12-mt">{arrival.handoffSummary}</div>
                  )}
                </div>
                <span
                  className="emergency-route-queue-row__oldest fj-arrival-status"
                  data-status={arrival.status}
                >
                  {arrival.status}
                </span>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Disposition & Admission Handoffs"
        lead="Patients awaiting admission bed, transfer, or discharge handoff documentation."
        badge={dispositionPatients.length}
      >
        {dispositionPatients.length === 0 ? (
          <p className="fj-caption-13-mt">
            No patients currently in disposition or admission state.
          </p>
        ) : (
          <div className="emergency-route-stack u-mt-10">
            {dispositionPatients.map((patient) => (
              <article key={patient.id} className="emergency-route-queue-row">
                <div className="u-flex-1">
                  <strong className="u-fs-13">
                    {patient.firstName} {patient.lastName}
                  </strong>
                  <div className="fj-caption-12-mt">
                    MRN: {patient.mrn} · {patient.chiefComplaint} · State: {patient.state}
                  </div>
                  {patient.referral && (
                    <div className="fj-caption">
                      Referral: {patient.referral.targetDepartment} — {patient.referral.status}
                    </div>
                  )}
                </div>
                <span className="emergency-route-queue-row__oldest fj-text-ok">
                  {patient.state}
                </span>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Handoff Tools"
        lead="Generate structured handoff summaries and access shift documentation."
      >
        <div className="emergency-route-chip-row u-mt-10">
          <Link to={CANONICAL_ROUTES.emergencyShift} className="emergency-route-action-chip">
            Shift Summary
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyReferrals} className="emergency-route-action-chip">
            Referrals
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyEms} className="emergency-route-action-chip">
            EMS Pipeline
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyWhiteboard} className="emergency-route-action-chip">
            Whiteboard
          </Link>
        </div>
      </SectionCard>

      <div role="note" className="fj-alert-box">
        Handoff summaries are structured decision support. All handoffs require verbal confirmation
        and clinician sign-off. AI-generated handoff content must be reviewed and accepted by the
        receiving clinician.
      </div>
    </>
  );
}

// ── Reports view ─────────────────────────────────────────────────────────────

function ReportsView({
  snapshot,
}: {
  snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot>;
}) {
  const bottlenecks = snapshot.liveServiceSummaries.bottlenecks;
  const journeyMetrics = snapshot.liveServiceSummaries.journeyMetrics;
  const staffSummary = snapshot.liveServiceSummaries.staffRouting;
  const dxSummary = snapshot.liveServiceSummaries.diagnostics;

  return (
    <>
      <div className="u-flex-wrap-gap-10">
        <MetricChip label="Active journeys" value={journeyMetrics.activeJourneys} />
        <MetricChip label="3-min breaches" value={snapshot.metrics.threeMinuteBreaches} warn />
        <MetricChip label="Bottlenecks" value={bottlenecks?.analytics?.activeCount ?? 0} warn />
        <MetricChip label="STAT orders" value={dxSummary.statOrders} warn />
        <MetricChip label="Staff pending" value={staffSummary.pendingAcknowledgement} warn />
        <MetricChip label="Capacity" value={snapshot.metrics.capacityBand} />
      </div>

      <SectionCard
        title="3-Minute Response Compliance"
        lead="Tracks critical response timer adherence from first emergency signal to clinical action."
      >
        <div className="emergency-route-stack u-mt-10">
          <article className="emergency-route-queue-row">
            <div className="u-flex-1">
              <strong className="u-fs-13">Active Journey Traces</strong>
              <div className="fj-caption">
                Patients with an active 3-minute response timer in progress.
              </div>
            </div>
            <span className="emergency-route-journey-card__count">
              {journeyMetrics.activeJourneys}
            </span>
          </article>
          <article className="emergency-route-queue-row">
            <div className="u-flex-1">
              <strong className="u-fs-13">Response Breaches</strong>
              <div className="fj-caption">
                Critical response timers that exceeded the 3-minute target this session.
              </div>
            </div>
            <span
              className={`emergency-route-journey-card__count ${snapshot.metrics.threeMinuteBreaches > 0 ? 'fj-metric-count-bad' : 'fj-metric-count-ok'}`}
            >
              {snapshot.metrics.threeMinuteBreaches}
            </span>
          </article>
        </div>
      </SectionCard>

      {(bottlenecks?.activeBottlenecks?.length ?? 0) > 0 && (
        <SectionCard
          title="Active Bottleneck Signals"
          lead="Detected workflow, operational, or system bottlenecks requiring attention."
          badge={bottlenecks.analytics?.activeCount ?? 0}
        >
          <div className="emergency-route-stack u-mt-10">
            {bottlenecks.activeBottlenecks.slice(0, 8).map((finding) => (
              <article key={finding.id} className="emergency-route-queue-row">
                <div className="u-flex-1">
                  <div className="u-fs-13">{finding.title}</div>
                  {finding.ownerRole && (
                    <div className="fj-caption-11">Owner: {finding.ownerRole}</div>
                  )}
                </div>
                <span
                  className={`emergency-route-queue-row__oldest ${finding.severity === 'critical' ? 'fj-severity-critical' : 'fj-severity-warn'}`}
                >
                  {finding.severity}
                </span>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Analytics & Reporting Surfaces"
        lead="Navigate to full analytics, shift summaries, and AI governance reports."
      >
        <div className="emergency-route-chip-row u-mt-10">
          <Link to={CANONICAL_ROUTES.emergencyAnalytics} className="emergency-route-action-chip">
            Analytics Dashboard
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyShift} className="emergency-route-action-chip">
            Shift Summary
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyAlerts} className="emergency-route-action-chip">
            Critical Alerts
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyCopilot} className="emergency-route-action-chip">
            AI Chief
          </Link>
        </div>
      </SectionCard>
    </>
  );
}

// ── Sticky critical action banner ─────────────────────────────────────────────

function StickyActionBanner({
  snapshot,
}: {
  snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot>;
}) {
  const dispatch = snapshot.liveServiceSummaries.dispatch;
  const readiness = snapshot.liveServiceSummaries.readiness;
  const metrics = snapshot.metrics;

  const criticalPending = (dispatch?.echoCount ?? 0) + (dispatch?.deltaCount ?? 0);
  const readinessOverdue = readiness?.overdueCount ?? 0;
  const unackedAlerts = metrics.criticalAlerts ?? 0;

  const topIssue =
    criticalPending > 0
      ? {
          label: `${criticalPending} Echo/Delta call${criticalPending > 1 ? 's' : ''} need dispatch`,
          route: CANONICAL_ROUTES.emergencyDispatch,
          action: 'Dispatch Now →',
        }
      : readinessOverdue > 0
        ? {
            label: `${readinessOverdue} ED readiness plan${readinessOverdue > 1 ? 's' : ''} overdue`,
            route: CANONICAL_ROUTES.emergencyEdReadiness,
            action: 'Prepare Bay →',
          }
        : unackedAlerts > 0
          ? {
              label: `${unackedAlerts} critical alert${unackedAlerts > 1 ? 's' : ''} unacknowledged`,
              route: CANONICAL_ROUTES.emergencyAlerts,
              action: 'Acknowledge →',
            }
          : null;

  if (!topIssue) return null;

  return (
    <div className="fj-critical-banner">
      <div className="u-flex-center u-gap-8">
        <span className="fj-critical-banner__icon">⚡</span>
        <strong className="fj-text-critical-13">{topIssue.label}</strong>
        <span className="fj-caption-11">— 3-minute response target</span>
      </div>
      <Link to={topIssue.route} className="fj-critical-banner__cta">
        {topIssue.action}
      </Link>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const VIEW_SURFACE_MAP: Partial<Record<ViewId, OperatingSurfaceId>> = {
  'ed-readiness': 'ed-readiness',
  diagnostics: 'diagnostics',
  handoffs: 'handoffs',
  reports: 'reports',
};

export default function FullJourneyOperatingPage({
  view = 'journey',
}: FullJourneyOperatingPageProps) {
  const surfaceId = VIEW_SURFACE_MAP[view];
  const {
    loading: apiLoading,
    error: apiError,
    envelope: apiEnvelope,
  } = useEmergencyOperatingSurface(surfaceId);
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);

  // HEAL-182: readiness.overdueCount (feeds StickyActionBanner, mounted on all 5 views) is
  // time-based (expectedArrivalAt < now), but this page has no timer of its own -- snapshot only
  // recomputes when the Zustand store selectors above change, so a plan can flip from
  // on-time to overdue with zero store mutation and sit stale here indefinitely, while the
  // ed-readiness view's own EdReadinessView already refreshes the identical getReadinessSummary()
  // every 5s (see its own setInterval below). Mirrors that same established pattern so the
  // cross-view banner doesn't fall behind the single-view display of the same count.
  const [, forceRefreshTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRefreshTick((tick) => tick + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const snapshot = buildFullEmergencyCareJourneySnapshot({
    patients,
    staff,
    emsArrivals,
    alerts,
    capacity,
  });

  const copy = VIEW_COPY[view];
  const selectedStageIds = VIEW_STAGE_IDS[view];
  const stages = selectedStageIds.length
    ? snapshot.stages.filter((stage) => selectedStageIds.includes(stage.id as never))
    : snapshot.stages;

  const apiMetrics = (apiEnvelope.data || {}) as Record<string, unknown>;
  const metrics = surfaceId
    ? {
        ...snapshot.metrics,
        inboundEms:
          typeof apiMetrics.inboundEms === 'number'
            ? apiMetrics.inboundEms
            : snapshot.metrics.inboundEms,
        criticalAlerts:
          typeof apiMetrics.criticalAlerts === 'number'
            ? apiMetrics.criticalAlerts
            : snapshot.metrics.criticalAlerts,
        capacityBand:
          typeof apiMetrics.capacityBand === 'string'
            ? apiMetrics.capacityBand
            : snapshot.metrics.capacityBand,
      }
    : snapshot.metrics;

  return (
    <EmergencyRoutePage eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      {surfaceId ? (
        <EdDataSourceBanner
          loading={apiLoading}
          error={apiError}
          envelope={{
            source: apiEnvelope.source,
            generatedAt: apiEnvelope.generatedAt,
          }}
          compact
        />
      ) : null}
      {/* Sticky critical action banner — only shown when there's something urgent */}
      <StickyActionBanner snapshot={snapshot} />

      <MetricGrid
        metrics={[
          { label: 'Active patients', value: metrics.activePatients },
          { label: 'P1/P2', value: metrics.p1p2Patients, color: '#EF4444' },
          { label: 'Inbound EMS', value: metrics.inboundEms, color: '#F59E0B' },
          { label: 'Critical alerts', value: metrics.criticalAlerts, color: '#DC2626' },
          { label: 'Capacity', value: metrics.capacityBand },
          {
            label: '3-min breaches',
            value: metrics.threeMinuteBreaches,
            color: metrics.threeMinuteBreaches ? '#DC2626' : '#10B981',
          },
        ]}
      />

      {view === 'journey' && <JourneyView snapshot={snapshot} />}
      {view === 'ed-readiness' && <EdReadinessView />}
      {view === 'diagnostics' && <DiagnosticsView />}
      {view === 'handoffs' && <HandoffsView />}
      {view === 'reports' && <ReportsView snapshot={snapshot} />}

      {/* Filtered stage list for non-journey views */}
      {view !== 'journey' && stages.length > 0 && (
        <SectionCard
          title="Journey Stages — This View"
          lead={`Stages covered by the ${copy.title} surface.`}
          badge={stages.length}
        >
          <div className="emergency-route-chip-row">
            {stages.map((stage) => (
              <Link key={stage.id} to={stage.route} className="emergency-route-action-chip">
                {stage.order}. {stage.label}
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Next Review Surfaces"
        lead="AI Chief, Alerts, Analytics, and Help carry the same journey map for decision support and fallback procedures."
      >
        <div className="emergency-route-chip-row">
          <Link to={CANONICAL_ROUTES.emergencyCopilot} className="emergency-route-action-chip">
            AI Chief
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyAlerts} className="emergency-route-action-chip">
            Critical Alerts
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyAnalytics} className="emergency-route-action-chip">
            Analytics
          </Link>
          <Link
            to={CANONICAL_ROUTES.emergencyCommandCenter}
            className="emergency-route-action-chip"
          >
            Command Center
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyHelp} className="emergency-route-action-chip">
            Help Manual
          </Link>
        </div>
      </SectionCard>
    </EmergencyRoutePage>
  );
}
