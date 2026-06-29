import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import { useEmergencyStore } from '../../store/emergencyStore';
import { buildFullEmergencyCareJourneySnapshot } from '../../services/fullEmergencyCareJourneyService';
import { getActivePlans, getReadinessSummary } from '../../services/edReadinessService';
import { getDiagnosticsBoard, getDiagnosticsSummary, DIAGNOSTIC_TYPE_LABELS, DIAGNOSTIC_PRIORITY_LABELS } from '../../services/diagnosticsCoordinationService';
import { getStaffRoutingSummary } from '../../services/staffRoutingService';
import { getCADSystemSummary } from '../../services/cadIntegrationService';
import { getPrehospitalSummary, getAllActiveAssessments } from '../../services/prehospitalAssessmentService';
import { EmergencyRoutePage, MetricGrid } from './emergencyRouteShared';
import type { DiagnosticOrder } from '../../types/emergency';

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

// ── Journey view ─────────────────────────────────────────────────────────────

function JourneyView({ snapshot }: { snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot> }) {
  const cadSummary = snapshot.liveServiceSummaries.cad;
  const prehospitalSummary = snapshot.liveServiceSummaries.prehospital;
  const staffSummary = snapshot.liveServiceSummaries.staffRouting;
  const dxSummary = snapshot.liveServiceSummaries.diagnostics;

  return (
    <>
      <article className="emergency-route-card emergency-route-copilot-hint">
        <strong>{snapshot.principle}</strong>
        <p>{snapshot.mission} {snapshot.safety}</p>
      </article>

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

function EdReadinessView() {
  const [plans, setPlans] = useState(getActivePlans());
  const [summary, setSummary] = useState(getReadinessSummary());
  const [cadSummary, setCadSummary] = useState(getCADSystemSummary());
  const [activeAssessments, setActiveAssessments] = useState(getAllActiveAssessments());

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

      {/* Readiness plans */}
      <SectionCard
        title="ED Readiness Plans"
        lead="Active bay/room preparation plans triggered by EMS pre-arrival notifications."
        badge={plans.length}
      >
        {plans.length === 0 ? (
          <p style={{ fontSize: 13, color: MEDICAL_THEME.inkSubtle, marginTop: 10 }}>
            No active readiness plans. Plans are created when EMS issues a pre-arrival notification for a critical patient.
          </p>
        ) : (
          <div className="emergency-route-stack" style={{ marginTop: 10 }}>
            {plans.map((plan) => {
              const checkedItems = plan.equipmentChecklist.filter((e) => e.ready).length;
              const totalItems = plan.equipmentChecklist.length;
              const overdue = new Date(plan.expectedArrivalAt).getTime() < Date.now() && plan.status === 'pending';

              return (
                <article key={plan.id} className="emergency-route-queue-row">
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>
                      {plan.assignedRoom ?? plan.assignedBay ?? 'Bay TBD'}
                    </strong>
                    <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                      Expected: {new Date(plan.expectedArrivalAt).toLocaleTimeString()}
                      {plan.specialtyTeamCalled && ` · Specialty: ${plan.specialtyTeams.join(', ')}`}
                    </div>
                    <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
                      Equipment: {checkedItems}/{totalItems} checked ·
                      Staff notified: {plan.notifiedStaff.length}
                    </div>
                    {plan.activatedResources.length > 0 && (
                      <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>
                        Resources: {plan.activatedResources.join(', ')}
                      </div>
                    )}
                  </div>
                  <span
                    className="emergency-route-queue-row__oldest"
                    style={{ color: overdue ? MEDICAL_TYPE.statusCritical : STATUS_COLORS[plan.status] ?? MEDICAL_THEME.inkSubtle }}
                  >
                    {overdue ? 'OVERDUE' : plan.status}
                  </span>
                </article>
              );
            })}
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
