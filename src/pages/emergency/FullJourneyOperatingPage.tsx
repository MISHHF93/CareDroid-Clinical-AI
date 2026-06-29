import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import { useEmergencyStore } from '../../store/emergencyStore';
import { buildFullEmergencyCareJourneySnapshot } from '../../services/fullEmergencyCareJourneyService';
import {
  getActivePlans,
  getReadinessSummary,
  createReadinessPlan,
  checkEquipmentItem,
  markReady,
  notifyStaff,
  type ReadinessTrigger,
} from '../../services/edReadinessService';
import { getDiagnosticsBoard, getDiagnosticsSummary, DIAGNOSTIC_TYPE_LABELS, DIAGNOSTIC_PRIORITY_LABELS } from '../../services/diagnosticsCoordinationService';
import { getStaffRoutingSummary } from '../../services/staffRoutingService';
import { getCADSystemSummary } from '../../services/cadIntegrationService';
import { getPrehospitalSummary, getAllActiveAssessments } from '../../services/prehospitalAssessmentService';
import { EmergencyRoutePage, MetricGrid } from './emergencyRouteShared';
import type { DiagnosticOrder, EDReadinessPlan } from '../../types/emergency';
import {
  buildCommandCenterWorkflowActions,
  type OperationalWorkflowAction,
} from '../../config/operationalWorkflow.config';

type ViewId = 'journey' | 'ed-readiness' | 'diagnostics' | 'handoffs' | 'reports';

type FullJourneyOperatingPageProps = Readonly<{
  view?: ViewId;
}>;

const VIEW_COPY: Record<ViewId, { eyebrow: string; title: string; description: string }> = {
  journey: {
    eyebrow: 'Command center',
    title: 'Full Emergency-Care Journey',
    description: 'One operating picture from emergency signal and 911 call through EMS, ED care, disposition, reporting, and analytics feedback.',
  },
  'ed-readiness': {
    eyebrow: 'Pre-arrival',
    title: 'ED Readiness',
    description: 'Prepare rooms, staff, equipment, specialty teams, lab, radiology, and pharmacy before the patient arrives.',
  },
  diagnostics: {
    eyebrow: 'Diagnostics',
    title: 'Diagnostics Coordination',
    description: 'Coordinate lab, imaging, ECG, pharmacy review, and consult workflows from the live ED operating state.',
  },
  handoffs: {
    eyebrow: 'Handoffs',
    title: 'Structured Handoffs',
    description: 'Track EMS-to-ED, ED-to-department, admission, transfer, and discharge handoff readiness.',
  },
  reports: {
    eyebrow: 'Reports',
    title: 'Operational Reports',
    description: 'Review response compliance, bottlenecks, outcomes, safety review signals, and analytics feedback loops.',
  },
};

const VIEW_STAGE_IDS: Record<ViewId, readonly string[]> = {
  journey: [],
  'ed-readiness': ['hospital-pre-arrival', 'ed-readiness', 'patient-arrival'],
  diagnostics: ['diagnostics', 'treatment-observation'],
  handoffs: ['hospital-pre-arrival', 'disposition', 'handoff-reporting'],
  reports: ['outcome-tracking', 'analytics-feedback'],
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  attention: '#EF4444',
  ready: MEDICAL_THEME.inkSubtle,
};

// ── Shared card shell ────────────────────────────────────────────────────────

function SectionCard({ title, lead, badge, children }: {
  title: string;
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
  const color = STATUS_COLORS[status] ?? MEDICAL_THEME.inkSubtle;
  return (
    <span
      className="emergency-route-action-chip"
      style={{ color, borderColor: color, whiteSpace: 'nowrap' }}
    >
      {label} · {status}
    </span>
  );
}

function MetricChip({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: MEDICAL_THEME.surfaceCard,
        border: `1px solid ${warn && Number(value) > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.border}`,
        minWidth: 80,
        flex: '0 0 auto',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: warn && Number(value) > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.ink,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ActionToneDot({ tone }: { tone: OperationalWorkflowAction['tone'] }) {
  const color =
    tone === 'critical'
      ? MEDICAL_TYPE.statusCritical
      : tone === 'warning'
        ? '#F59E0B'
        : tone === 'success'
          ? '#10B981'
          : MEDICAL_THEME.accent;

  return (
    <span
      className={`emergency-command-action__tone emergency-command-action__tone--${tone}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function CommandCenterActionPanel({
  actions,
}: {
  actions: readonly OperationalWorkflowAction[];
}) {
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

function JourneyView({ snapshot }: { snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot> }) {
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
        <p>{snapshot.mission} {snapshot.safety}</p>
      </article>

      <CommandCenterActionPanel actions={commandActions} />

      {/* Prehospital tier */}
      <SectionCard
        title="Prehospital Tier"
        lead="CAD dispatch status, active EMS assessments, and pre-arrival pipeline."
        badge={cadSummary.activeAssignments}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <MetricChip label="CAD units total" value={cadSummary.totalUnits} />
          <MetricChip label="Available" value={cadSummary.availableUnits} />
          <MetricChip label="En route" value={cadSummary.enRouteUnits} warn />
          <MetricChip label="On scene" value={cadSummary.onSceneUnits} />
          <MetricChip label="Transporting" value={cadSummary.transportingUnits} warn />
          <MetricChip label="Active assessments" value={prehospitalSummary.activeAssessments} warn />
          <MetricChip label="Packets transmitted" value={prehospitalSummary.transmittedPackets} />
        </div>
        <div className="emergency-route-chip-row" style={{ marginTop: 10 }}>
          <Link to={CANONICAL_ROUTES.emergencyDispatch} className="emergency-route-action-chip">Dispatch Console</Link>
          <Link to={CANONICAL_ROUTES.emergencyEms} className="emergency-route-action-chip">EMS Pipeline</Link>
          <Link to={CANONICAL_ROUTES.emergencyEdReadiness} className="emergency-route-action-chip">ED Readiness</Link>
        </div>
      </SectionCard>

      {/* ED tier */}
      <SectionCard
        title="ED Operations Tier"
        lead="Active patients, queues, staff routing, and diagnostics."
        badge={snapshot.metrics.activePatients}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <MetricChip label="Active patients" value={snapshot.metrics.activePatients} />
          <MetricChip label="P1/P2" value={snapshot.metrics.p1p2Patients} warn />
          <MetricChip label="Inbound EMS" value={snapshot.metrics.inboundEms} warn />
          <MetricChip label="Staff pending" value={staffSummary.pendingAcknowledgement} warn />
          <MetricChip label="STAT orders" value={dxSummary.statOrders} warn />
          <MetricChip label="Capacity" value={snapshot.metrics.capacityBand} />
        </div>
        <div className="emergency-route-chip-row" style={{ marginTop: 10 }}>
          <Link to={CANONICAL_ROUTES.emergencyWhiteboard} className="emergency-route-action-chip">Whiteboard</Link>
          <Link to={CANONICAL_ROUTES.emergencyQueues} className="emergency-route-action-chip">Patient Queues</Link>
          <Link to={CANONICAL_ROUTES.emergencyDiagnostics} className="emergency-route-action-chip">Diagnostics</Link>
          <Link to={CANONICAL_ROUTES.emergencyCopilot} className="emergency-route-action-chip">AI Chief</Link>
        </div>
      </SectionCard>

      {/* Journey stage map */}
      <SectionCard
        title="20-Stage Journey Map"
        lead="Live status for each stage. Click Open to navigate to that stage's surface."
        badge={snapshot.stages.length}
      >
        <div className="emergency-route-stack" style={{ marginTop: 10 }}>
          {snapshot.stages.map((stage) => (
            <article key={stage.id} className="emergency-route-queue-row">
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13 }}>
                  {stage.order}. {stage.label}
                </strong>
                <div className="emergency-route-queue-row__patients" style={{ fontSize: 12, marginTop: 2 }}>
                  {stage.outcome}
                </div>
                <small className="emergency-route-queue-row__movement" style={{ fontSize: 11 }}>
                  {stage.ownerRoles.join(' · ')}
                </small>
              </div>
              <Link to={stage.route} className="emergency-route-filter-banner__btn" style={{ flexShrink: 0 }}>
                Open
              </Link>
              <span
                className="emergency-route-queue-row__oldest"
                style={{ color: STATUS_COLORS[stage.status] ?? MEDICAL_THEME.inkSubtle, flexShrink: 0 }}
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
            <span key={service.id} className="emergency-route-action-chip" title={service.implementation}>
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

  const resourceOptions = ['STEMI protocol', 'Stroke protocol', 'Trauma bay', 'Sepsis protocol', 'Airway kit', 'Blood products'];

  function toggle(r: string) {
    setResources((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 3 }}>Bay / Room</label>
          <input
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${MEDICAL_THEME.border}`, background: MEDICAL_THEME.surfacePage, color: MEDICAL_THEME.ink, fontSize: 13, boxSizing: 'border-box' }}
            value={bay}
            onChange={(e) => setBay(e.target.value)}
            placeholder="e.g. Resus 1, Trauma Bay..."
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 3 }}>ETA (minutes)</label>
          <input
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${MEDICAL_THEME.border}`, background: MEDICAL_THEME.surfacePage, color: MEDICAL_THEME.ink, fontSize: 13, boxSizing: 'border-box' }}
            type="number"
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(e.target.value)}
            min={1}
            max={60}
          />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 4 }}>Activate resources:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {resourceOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggle(r)}
              style={{
                padding: '3px 8px',
                borderRadius: 20,
                border: `1px solid ${resources.includes(r) ? MEDICAL_THEME.accent : MEDICAL_THEME.border}`,
                background: resources.includes(r) ? `color-mix(in srgb, ${MEDICAL_THEME.accent} 15%, transparent)` : 'transparent',
                color: resources.includes(r) ? MEDICAL_THEME.ink : MEDICAL_THEME.inkSubtle,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '8px 14px',
          borderRadius: 8,
          background: MEDICAL_THEME.accent,
          color: MEDICAL_THEME.onAccent,
          fontWeight: 700,
          fontSize: 13,
          border: 'none',
          cursor: submitting ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        Create Readiness Plan
      </button>
    </form>
  );
}

function ReadinessPlanCard({ plan, onUpdated }: { plan: EDReadinessPlan; onUpdated: () => void }) {
  const checkedItems = plan.equipmentChecklist.filter((e) => e.ready).length;
  const totalItems = plan.equipmentChecklist.length;
  const overdue = new Date(plan.expectedArrivalAt).getTime() < Date.now() && plan.status === 'pending';
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
      style={{
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${overdue ? MEDICAL_TYPE.statusCritical : plan.status === 'ready' ? '#10B981' : MEDICAL_THEME.border}`,
        background: plan.status === 'ready' ? 'rgba(16,185,129,0.05)' : MEDICAL_THEME.surfaceCard,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong style={{ fontSize: 13 }}>{plan.assignedRoom ?? plan.assignedBay ?? 'Bay TBD'}</strong>
          <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
            ETA: {new Date(plan.expectedArrivalAt).toLocaleTimeString()}
            {plan.specialtyTeamCalled && ` · Specialty: ${plan.specialtyTeams.join(', ')}`}
          </div>
          <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>
            Equipment: {checkedItems}/{totalItems} · Staff notified: {plan.notifiedStaff.length}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            background: overdue ? 'rgba(239,68,68,0.12)' : plan.status === 'ready' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
            color: overdue ? MEDICAL_TYPE.statusCritical : plan.status === 'ready' ? '#059669' : '#b45309',
          }}
        >
          {overdue ? 'OVERDUE' : plan.status.toUpperCase()}
        </span>
      </div>

      {/* Equipment checklist */}
      {plan.equipmentChecklist.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {plan.equipmentChecklist.map((item) => (
            <label
              key={item.item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: item.ready ? 'default' : 'pointer',
                color: item.ready ? '#10B981' : MEDICAL_THEME.ink,
                textDecoration: item.ready ? 'line-through' : 'none',
              }}
            >
              <input
                type="checkbox"
                checked={item.ready}
                disabled={item.ready}
                onChange={() => !item.ready && handleCheckItem(item.item)}
                style={{ accentColor: '#10B981' }}
              />
              {item.item}
            </label>
          ))}
        </div>
      )}

      {/* Actions */}
      {plan.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {plan.notifiedStaff.length === 0 && (
            <button
              type="button"
              onClick={handleNotifyStaff}
              style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', color: MEDICAL_THEME.accent, border: `1px solid ${MEDICAL_THEME.accent}`, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Notify Charge Nurse
            </button>
          )}
          <button
            type="button"
            onClick={handleMarkReady}
            disabled={!allChecked && totalItems > 0}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              background: allChecked ? '#10B981' : 'transparent',
              color: allChecked ? '#fff' : MEDICAL_THEME.inkSubtle,
              border: `1px solid ${allChecked ? '#10B981' : MEDICAL_THEME.border}`,
              fontSize: 12,
              fontWeight: 700,
              cursor: allChecked ? 'pointer' : 'not-allowed',
              opacity: allChecked ? 1 : 0.6,
            }}
            title={allChecked ? 'Mark bay as ready' : `Check all ${totalItems - checkedItems} remaining items first`}
          >
            ✓ Mark Bay Ready
          </button>
        </div>
      )}

      {plan.status === 'ready' && (
        <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>✓ Bay ready for patient arrival</div>
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <MetricChip label="Active plans" value={summary.activePlans} />
        <MetricChip label="Ready" value={summary.readyCount} />
        <MetricChip label="Pending" value={summary.pendingCount} warn />
        <MetricChip label="Overdue" value={summary.overdueCount} warn />
        <MetricChip label="Inbound EMS" value={cadSummary.enRouteUnits + cadSummary.transportingUnits} warn />
        <MetricChip label="Active prehospital" value={activeAssessments.length} />
      </div>

      {/* Overdue alert */}
      {summary.overdueCount > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `2px solid ${MEDICAL_TYPE.statusCritical}` }}>
          <strong style={{ color: MEDICAL_TYPE.statusCritical, fontSize: 13 }}>
            ⚡ {summary.overdueCount} readiness plan{summary.overdueCount > 1 ? 's' : ''} overdue — patient arrival expected. Check equipment now.
          </strong>
        </div>
      )}

      {/* Alert flags from prehospital */}
      {activeAssessments.length > 0 && (
        <SectionCard
          title="Inbound EMS — Prehospital Alerts"
          lead="Critical flags from active EMS assessments en route. Review and activate ED protocols."
          badge={activeAssessments.filter((a) => a.traumaActivation || a.strokeAlert || a.stemiAlert || a.sepsisConcern).length}
        >
          <div className="emergency-route-stack" style={{ marginTop: 10 }}>
            {activeAssessments.map((assessment) => {
              const flags: string[] = [];
              if (assessment.traumaActivation) flags.push('TRAUMA ACTIVATION');
              if (assessment.strokeAlert) flags.push('STROKE ALERT');
              if (assessment.stemiAlert) flags.push('STEMI ALERT');
              if (assessment.sepsisConcern) flags.push('SEPSIS CONCERN');

              return (
                <article key={assessment.id} className="emergency-route-queue-row">
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>{assessment.chiefComplaint}</strong>
                    <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                      Crew: {assessment.crewLeadName} · Mechanism: {assessment.mechanism}
                    </div>
                    {flags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {flags.map((flag) => (
                          <span key={flag} style={{ fontSize: 11, fontWeight: 800, color: MEDICAL_TYPE.statusCritical }}>
                            ⚠ {flag}
                          </span>
                        ))}
                      </div>
                    )}
                    {assessment.currentVitals && (
                      <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                        Vitals: HR {assessment.currentVitals.hr ?? '?'} · SpO2 {assessment.currentVitals.spo2 ?? '?'}%
                        · BP {assessment.currentVitals.sbp ?? '?'}/{assessment.currentVitals.dbp ?? '?'}
                      </div>
                    )}
                    {flags.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            const resources = flags.map((f) =>
                              f === 'TRAUMA ACTIVATION' ? 'Trauma bay'
                              : f === 'STEMI ALERT' ? 'STEMI protocol'
                              : f === 'STROKE ALERT' ? 'Stroke protocol'
                              : 'Sepsis protocol',
                            );
                            const eta = new Date(Date.now() + 8 * 60_000).toISOString();
                            createReadinessPlan({ callId: assessment.id, preparedBy: 'charge-nurse-current', expectedArrivalAt: eta, activatedResources: resources });
                            refresh();
                          }}
                          style={{ padding: '4px 10px', borderRadius: 6, background: MEDICAL_TYPE.statusCritical, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          ⚡ Activate ED Protocols
                        </button>
                      </div>
                    )}
                  </div>
                  <span
                    className="emergency-route-queue-row__oldest"
                    style={{ color: flags.length > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.inkSubtle }}
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
        <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: plans.length > 0 ? 12 : 0 }}>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            style={{
              padding: '6px 12px',
              borderRadius: 7,
              background: showCreateForm ? MEDICAL_THEME.border : MEDICAL_THEME.accent,
              color: showCreateForm ? MEDICAL_THEME.ink : MEDICAL_THEME.onAccent,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showCreateForm ? 'Cancel' : '+ Create Readiness Plan'}
          </button>
          <Link to={CANONICAL_ROUTES.emergencyDispatch} className="emergency-route-action-chip" style={{ fontSize: 12 }}>
            Dispatch Console
          </Link>
        </div>

        {showCreateForm && (
          <CreateReadinessPlanForm onCreated={() => { setShowCreateForm(false); refresh(); }} />
        )}

        {plans.length === 0 && !showCreateForm ? (
          <p style={{ fontSize: 13, color: MEDICAL_THEME.inkSubtle, marginTop: 10 }}>
            No active readiness plans. Create a plan manually above, or send a pre-alert from the Dispatch Console.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
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
        <div className="emergency-route-chip-row" style={{ marginTop: 10 }}>
          <StatusChip label={`${cadSummary.availableUnits} Available`} status="ready" />
          <StatusChip label={`${cadSummary.enRouteUnits} En Route`} status="active" />
          <StatusChip label={`${cadSummary.transportingUnits} Transporting`} status="active" />
          <StatusChip label={`${cadSummary.onSceneUnits} On Scene`} status="ready" />
        </div>
        <div className="emergency-route-chip-row" style={{ marginTop: 8 }}>
          <Link to={CANONICAL_ROUTES.emergencyDispatch} className="emergency-route-action-chip">Dispatch Console</Link>
          <Link to={CANONICAL_ROUTES.emergencyEms} className="emergency-route-action-chip">EMS Pipeline</Link>
        </div>
      </SectionCard>

      <div role="note" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>
        ED Readiness planning is decision support only. Bed assignment, specialty team activation, and equipment preparation require charge nurse or physician authorization.
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

  const priorityColor = (priority: DiagnosticOrder['priority']) =>
    priority === 'stat' ? MEDICAL_TYPE.statusCritical
    : priority === 'urgent' ? '#F59E0B'
    : MEDICAL_THEME.inkSubtle;

  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
        title="Diagnostics Board"
        lead="Active diagnostic orders sorted by priority. STAT orders appear first."
        badge={board.length}
      >
        {board.length === 0 ? (
          <p style={{ fontSize: 13, color: MEDICAL_THEME.inkSubtle, marginTop: 10 }}>
            No active diagnostic orders. Orders appear here when created via the patient care workflow.
          </p>
        ) : (
          <div className="emergency-route-stack" style={{ marginTop: 10 }}>
            {board.map((row) => (
              <article key={row.orderId} className="emergency-route-queue-row">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>
                      {DIAGNOSTIC_TYPE_LABELS[row.type]}
                    </strong>
                    <span style={{ fontSize: 11, fontWeight: 800, color: priorityColor(row.priority) }}>
                      {DIAGNOSTIC_PRIORITY_LABELS[row.priority]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                    Patient {row.patientId.slice(-6)} · {row.targetDepartment}
                    · Ordered {new Date(row.orderedAt).toLocaleTimeString()}
                  </div>
                  {row.resultSummary && (
                    <div style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>
                      Result: {row.resultSummary}
                    </div>
                  )}
                </div>
                <span
                  className="emergency-route-queue-row__oldest"
                  style={{ color: row.status === 'resulted' ? '#10B981' : row.status === 'in_progress' ? '#F59E0B' : MEDICAL_THEME.inkSubtle }}
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
        <div className="emergency-route-chip-row" style={{ marginTop: 10 }}>
          <Link to="/emergency/tools?filter=laboratory&q=lab-interp" className="emergency-route-action-chip">Lab Interpreter</Link>
          <Link to="/emergency/tools?filter=clinical-tools&q=drug-check" className="emergency-route-action-chip">Drug Checker</Link>
          <Link to="/emergency/referrals" className="emergency-route-action-chip">Consults</Link>
          <Link to={CANONICAL_ROUTES.emergencyTools} className="emergency-route-action-chip">All Clinical Tools</Link>
        </div>
      </SectionCard>

      <div role="note" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>
        Diagnostic coordination is decision support only. All orders require physician authorization. Lab, imaging, and pharmacy results require licensed clinician interpretation before clinical action.
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <MetricChip label="Disposition patients" value={dispositionPatients.length} />
        <MetricChip label="Pending handoffs" value={pendingHandoffs.length} warn />
        <MetricChip label="EMS handoffs active" value={arrivedEms.length} warn />
        <MetricChip label="Staff assignments pending" value={staffRouting.pendingAcknowledgement} warn />
      </div>

      {arrivedEms.length > 0 && (
        <SectionCard
          title="EMS → ED Handoffs"
          lead="Ambulance crews at the ED awaiting patient handoff confirmation."
          badge={arrivedEms.length}
        >
          <div className="emergency-route-stack" style={{ marginTop: 10 }}>
            {arrivedEms.map((arrival) => (
              <article key={arrival.id} className="emergency-route-queue-row">
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13 }}>{arrival.chiefComplaint}</strong>
                  <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                    Unit: {arrival.unitName} · Age {arrival.patientAge} {arrival.patientSex}
                    · Severity: {arrival.severity}
                  </div>
                  {arrival.handoffSummary && (
                    <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                      {arrival.handoffSummary}
                    </div>
                  )}
                </div>
                <span
                  className="emergency-route-queue-row__oldest"
                  style={{ color: arrival.status === 'Handoff' ? '#F59E0B' : STATUS_COLORS.active }}
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
          <p style={{ fontSize: 13, color: MEDICAL_THEME.inkSubtle, marginTop: 10 }}>
            No patients currently in disposition or admission state.
          </p>
        ) : (
          <div className="emergency-route-stack" style={{ marginTop: 10 }}>
            {dispositionPatients.map((patient) => (
              <article key={patient.id} className="emergency-route-queue-row">
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13 }}>
                    {patient.firstName} {patient.lastName}
                  </strong>
                  <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                    MRN: {patient.mrn} · {patient.chiefComplaint} · State: {patient.state}
                  </div>
                  {patient.referral && (
                    <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>
                      Referral: {patient.referral.targetDepartment} — {patient.referral.status}
                    </div>
                  )}
                </div>
                <span
                  className="emergency-route-queue-row__oldest"
                  style={{ color: STATUS_COLORS.active }}
                >
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
        <div className="emergency-route-chip-row" style={{ marginTop: 10 }}>
          <Link to={CANONICAL_ROUTES.emergencyShift} className="emergency-route-action-chip">Shift Summary</Link>
          <Link to={CANONICAL_ROUTES.emergencyReferrals} className="emergency-route-action-chip">Referrals</Link>
          <Link to={CANONICAL_ROUTES.emergencyEms} className="emergency-route-action-chip">EMS Pipeline</Link>
          <Link to={CANONICAL_ROUTES.emergencyWhiteboard} className="emergency-route-action-chip">Whiteboard</Link>
        </div>
      </SectionCard>

      <div role="note" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>
        Handoff summaries are structured decision support. All handoffs require verbal confirmation and clinician sign-off. AI-generated handoff content must be reviewed and accepted by the receiving clinician.
      </div>
    </>
  );
}

// ── Reports view ─────────────────────────────────────────────────────────────

function ReportsView({ snapshot }: { snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot> }) {
  const bottlenecks = snapshot.liveServiceSummaries.bottlenecks;
  const journeyMetrics = snapshot.liveServiceSummaries.journeyMetrics;
  const staffSummary = snapshot.liveServiceSummaries.staffRouting;
  const dxSummary = snapshot.liveServiceSummaries.diagnostics;

  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
        <div className="emergency-route-stack" style={{ marginTop: 10 }}>
          <article className="emergency-route-queue-row">
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13 }}>Active Journey Traces</strong>
              <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>
                Patients with an active 3-minute response timer in progress.
              </div>
            </div>
            <span className="emergency-route-journey-card__count">{journeyMetrics.activeJourneys}</span>
          </article>
          <article className="emergency-route-queue-row">
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13 }}>Response Breaches</strong>
              <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>
                Critical response timers that exceeded the 3-minute target this session.
              </div>
            </div>
            <span
              className="emergency-route-journey-card__count"
              style={{ color: snapshot.metrics.threeMinuteBreaches > 0 ? MEDICAL_TYPE.statusCritical : '#10B981' }}
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
          <div className="emergency-route-stack" style={{ marginTop: 10 }}>
            {bottlenecks.activeBottlenecks.slice(0, 8).map((finding) => (
              <article key={finding.id} className="emergency-route-queue-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{finding.title}</div>
                  {finding.ownerRole && (
                    <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>
                      Owner: {finding.ownerRole}
                    </div>
                  )}
                </div>
                <span
                  className="emergency-route-queue-row__oldest"
                  style={{ color: finding.severity === 'critical' ? MEDICAL_TYPE.statusCritical : '#F59E0B' }}
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
        <div className="emergency-route-chip-row" style={{ marginTop: 10 }}>
          <Link to={CANONICAL_ROUTES.emergencyAnalytics} className="emergency-route-action-chip">Analytics Dashboard</Link>
          <Link to={CANONICAL_ROUTES.emergencyShift} className="emergency-route-action-chip">Shift Summary</Link>
          <Link to={CANONICAL_ROUTES.emergencyAlerts} className="emergency-route-action-chip">Critical Alerts</Link>
          <Link to={CANONICAL_ROUTES.emergencyCopilot} className="emergency-route-action-chip">AI Chief</Link>
        </div>
      </SectionCard>
    </>
  );
}

// ── Sticky critical action banner ─────────────────────────────────────────────

function StickyActionBanner({ snapshot }: { snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot> }) {
  const dispatch = snapshot.liveServiceSummaries.dispatch;
  const readiness = snapshot.liveServiceSummaries.readiness;
  const metrics = snapshot.metrics;

  const criticalPending = (dispatch?.echoCount ?? 0) + (dispatch?.deltaCount ?? 0);
  const readinessOverdue = readiness?.overdueCount ?? 0;
  const unackedAlerts = metrics.criticalAlerts ?? 0;

  const topIssue =
    criticalPending > 0
      ? { label: `${criticalPending} Echo/Delta call${criticalPending > 1 ? 's' : ''} need dispatch`, route: CANONICAL_ROUTES.emergencyDispatch, action: 'Dispatch Now →' }
      : readinessOverdue > 0
        ? { label: `${readinessOverdue} ED readiness plan${readinessOverdue > 1 ? 's' : ''} overdue`, route: CANONICAL_ROUTES.emergencyEdReadiness, action: 'Prepare Bay →' }
        : unackedAlerts > 0
          ? { label: `${unackedAlerts} critical alert${unackedAlerts > 1 ? 's' : ''} unacknowledged`, route: CANONICAL_ROUTES.emergencyAlerts, action: 'Acknowledge →' }
          : null;

  if (!topIssue) return null;

  return (
    <div
      style={{
        padding: '10px 16px',
        borderRadius: 8,
        background: 'rgba(239,68,68,0.1)',
        border: `2px solid ${MEDICAL_TYPE.statusCritical}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <strong style={{ color: MEDICAL_TYPE.statusCritical, fontSize: 13 }}>{topIssue.label}</strong>
        <span style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>— 3-minute response target</span>
      </div>
      <Link
        to={topIssue.route}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          background: MEDICAL_TYPE.statusCritical,
          color: '#fff',
          fontWeight: 700,
          fontSize: 12,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {topIssue.action}
      </Link>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FullJourneyOperatingPage({ view = 'journey' }: FullJourneyOperatingPageProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);

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

  return (
    <EmergencyRoutePage eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      {/* Sticky critical action banner — only shown when there's something urgent */}
      <StickyActionBanner snapshot={snapshot} />

      <MetricGrid
        metrics={[
          { label: 'Active patients', value: snapshot.metrics.activePatients },
          { label: 'P1/P2', value: snapshot.metrics.p1p2Patients, color: '#EF4444' },
          { label: 'Inbound EMS', value: snapshot.metrics.inboundEms, color: '#F59E0B' },
          { label: 'Critical alerts', value: snapshot.metrics.criticalAlerts, color: '#DC2626' },
          { label: 'Capacity', value: snapshot.metrics.capacityBand },
          { label: '3-min breaches', value: snapshot.metrics.threeMinuteBreaches, color: snapshot.metrics.threeMinuteBreaches ? '#DC2626' : '#10B981' },
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
          <Link to={CANONICAL_ROUTES.emergencyCopilot} className="emergency-route-action-chip">AI Chief</Link>
          <Link to={CANONICAL_ROUTES.emergencyAlerts} className="emergency-route-action-chip">Critical Alerts</Link>
          <Link to={CANONICAL_ROUTES.emergencyAnalytics} className="emergency-route-action-chip">Analytics</Link>
          <Link to={CANONICAL_ROUTES.emergencyCommandCenter} className="emergency-route-action-chip">Command Center</Link>
          <Link to={CANONICAL_ROUTES.emergencyHelp} className="emergency-route-action-chip">Help Manual</Link>
        </div>
      </SectionCard>
    </EmergencyRoutePage>
  );
}
