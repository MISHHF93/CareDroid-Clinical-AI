import { useMemo } from 'react';
import type { ActiveShift, CapacitySnapshot, Patient, Room, Staff } from '../../types/emergency';
import DepartmentStaffBar from '../whiteboard/DepartmentStaffBar';
import { AIRecommendationCard } from '../ai';
import type { EmergencyBoardingMetrics } from '../../store/emergencyStore';
import {
  buildOperationalCommandDashboardSnapshot,
  type OperationalCommandDashboardSnapshot,
  type OperationalDashboardMetric,
  type ZoneBedOccupancy,
} from '../../services/operationalCommandDashboardModel';
import {
  CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  buildAiResponseProvenance,
  type CareDroidAIResponse,
} from '../../lib/ai/careDroidAI';
import { BottleneckCommandPanel } from '../bottlenecks/BottleneckPanels';
import type { BottleneckRegistrySnapshot } from '../../services/bottleneckRegistry';
import { getUnifiedServiceHealthSnapshot } from '../../services/unifiedServiceRegistry';
import ResponseComplianceCard, { type ComplianceAlert } from './ResponseComplianceCard';
import { getAllActiveTimers } from '../../engine/threeMinuteTimerEngine';
import './CommandDashboard.css';

export type CommandDashboardProps = {
  patients: Patient[];
  rooms: Room[];
  complianceAlerts?: ComplianceAlert[];
  staff?: Staff[];
  activeShift?: ActiveShift | null;
  capacity: CapacitySnapshot;
  boardingMetrics?: EmergencyBoardingMetrics;
  title?: string;
  subtitle?: string;
  snapshot?: OperationalCommandDashboardSnapshot;
  bottleneckRegistry?: BottleneckRegistrySnapshot;
  now?: number;
  className?: string;
};

function toneLabel(tone: OperationalDashboardMetric['tone'] | ZoneBedOccupancy['tone']): string {
  if (tone === 'red') return 'Red';
  if (tone === 'amber') return 'Amber';
  return 'Green';
}

function MetricCard({ metric }: { metric: OperationalDashboardMetric }) {
  return (
    <article
      className={`command-dashboard__metric command-dashboard__metric--${metric.tone}`}
      aria-label={`${metric.label} ${metric.value}. Threshold ${toneLabel(metric.tone)}.`}
    >
      <div className="command-dashboard__metric-head">
        <span className="command-dashboard__metric-label">{metric.label}</span>
        <span className={`command-dashboard__rag command-dashboard__rag--${metric.tone}`}>
          {toneLabel(metric.tone)}
        </span>
      </div>
      <strong className="command-dashboard__metric-value">{metric.value}</strong>
      <p className="command-dashboard__metric-detail">{metric.detail}</p>
      <small className="command-dashboard__metric-threshold">{metric.thresholdLabel}</small>
    </article>
  );
}

function ZoneOccupancyRow({ zone }: { zone: ZoneBedOccupancy }) {
  return (
    <li className={`command-dashboard__zone command-dashboard__zone--${zone.tone}`}>
      <div className="command-dashboard__zone-head">
        <span>{zone.zoneLabel}</span>
        <span className={`command-dashboard__rag command-dashboard__rag--${zone.tone}`}>
          {toneLabel(zone.tone)}
        </span>
      </div>
      <strong>
        {zone.occupied}/{zone.total} beds
      </strong>
      <div
        className="command-dashboard__zone-bar"
        role="presentation"
        aria-hidden="true"
      >
        <span style={{ width: `${zone.occupancyPercent}%` }} />
      </div>
      <small>{zone.occupancyPercent}% occupied</small>
    </li>
  );
}

function AiDecisionSupportQueue({ snapshot }: { snapshot: OperationalCommandDashboardSnapshot }) {
  const recommendations = [
    ...snapshot.pendingBedAssignments.map((assignment) => ({
      id: `bed-${assignment.patientId}`,
      recommendation: `Start bed coordination for ${assignment.patientLabel}`,
      confidence: assignment.probabilityPercent,
      rationale: `Admission probability ${assignment.probabilityPercent}% with admit score ${assignment.admitScore}/10.`,
      action: assignment.action,
    })),
    ...snapshot.prolongedStayAlerts.map((alert) => ({
      id: `stay-${alert.patientId}`,
      recommendation: `Escalate prolonged-stay risk for ${alert.patientLabel}`,
      confidence: alert.probabilityPercent,
      rationale: `Projected ED stay ${alert.predictedHours}h with ${alert.probabilityPercent}% risk.`,
      action: alert.action,
    })),
    ...snapshot.orientationPredictions.map((prediction) => ({
      id: `orientation-${prediction.patientId}`,
      recommendation: `Prepare ${prediction.orientation} pathway for ${prediction.patientLabel}`,
      confidence: prediction.probabilityPercent,
      rationale: `Native AI predicts ${prediction.orientation} as the most likely post-ED orientation.`,
      action: 'Review with responsible clinician before changing disposition or bed workflow.',
    })),
  ]
    .slice(0, 5)
    .map(
      (item): CareDroidAIResponse => ({
        intent: 'hospital_command_insight',
        status: 'success',
        data: {
          id: item.id,
          recommendation: item.recommendation,
          recommendedAction: item.action,
        },
        confidence: item.confidence / 100,
        reasoning: [item.rationale],
        warnings: [CLINICAL_DECISION_SUPPORT_DISCLAIMER],
        redFlags: [],
        nextActions: [item.action],
        priority: item.confidence >= 90 ? 'high' : 'medium',
        assignedRole: 'Charge nurse',
        recommendedDepartment: 'Emergency Department',
        requiresClinicianReview: true,
        clinicianOverrideAvailable: true,
        generatedAt: snapshot.updatedAt,
        safetyDisclaimer: CLINICAL_DECISION_SUPPORT_DISCLAIMER,
        // orientationPredictions/prolongedStayPredictions are real
        // computations over real snapshot data (predictPostEdOrientation
        // etc. in nativeAiCore.ts), but confirmed logistic-formula
        // heuristics, not trained models (AI_CONFIGURATION_MAP.md).
        provenance: buildAiResponseProvenance({
          responseSource: 'DETERMINISTIC_RULE',
          responseClass: 'operational',
        }),
      }),
    );

  if (!recommendations.length) return null;

  return (
    <section className="command-dashboard__ai" aria-label="AI decision support recommendations">
      <div className="command-dashboard__ai-heading">
        <div>
          <h3>AI decision support</h3>
          <p>Recommendations require clinician review before workflow changes.</p>
        </div>
        <span>Human-in-the-loop</span>
      </div>
      <ul className="command-dashboard__ai-list">
        {recommendations.map((item) => (
          <li key={String(item.data.id)}>
            <AIRecommendationCard
              response={item}
              title="Command center recommendation"
              compact
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CommandDashboard({
  patients,
  rooms,
  staff = [] as any[],
  activeShift = null,
  capacity,
  boardingMetrics,
  title = 'Operational command dashboard',
  subtitle = 'Live department metrics from the emergency whiteboard',
  snapshot: snapshotProp,
  bottleneckRegistry: bottleneckRegistryProp,
  complianceAlerts,
  now,
  className = '',
}: CommandDashboardProps) {
  const snapshot = useMemo(
    () =>
      snapshotProp ||
      buildOperationalCommandDashboardSnapshot({
        patients,
        rooms,
        capacity,
        boardingMetrics,
        staff,
        now: now ? new Date(now) : new Date(),
      }),
    [boardingMetrics, capacity, now, patients, rooms, snapshotProp, staff],
  );
  const activeResponseTimers = useMemo(() => getAllActiveTimers(), [snapshot.updatedAt, now]);
  const breachedTimers = useMemo(
    () =>
      activeResponseTimers.filter(
        (timer) => Boolean(timer.breachAt) || timer.phase === 'breach' || timer.phase === 'breach_resolved',
      ),
    [activeResponseTimers],
  );
  const bottleneckRegistry = useMemo(
    () =>
      bottleneckRegistryProp ||
      getUnifiedServiceHealthSnapshot({
        generatedAt: snapshot.updatedAt,
        capacityStatus: capacity,
        activePatients: patients.map((patient) => ({
          id: patient.id,
          priority: patient.priority,
          waitMinutes: 0,
          flags: patient.flags.map((flag) => String(flag)),
        })),
        criticalPatients: patients
          .filter((patient) =>
            ['P1', 'P2'].includes(String(patient.priority)) ||
            patient.flags.some((flag) =>
              ['HighRisk', 'DeteriorationRisk', 'SepsisAlert', 'StrokeCode'].includes(String(flag)),
            ),
          )
          .map((patient) => ({
            id: patient.id,
            priority: patient.priority,
            waitMinutes: 0,
            flags: patient.flags.map((flag) => String(flag)),
          })),
        sync: {
          status: 'dashboard-local',
          source: 'CommandDashboard',
          stale: false,
          message: 'Command dashboard local snapshot.',
        },
      }).bottlenecks,
    [bottleneckRegistryProp, capacity, patients, snapshot.updatedAt],
  );

  return (
    <section
      className={['command-dashboard', className].filter(Boolean).join(' ')}
      aria-label="Emergency department operational command dashboard"
    >
      <header className="command-dashboard__header">
        <div>
          <p className="command-dashboard__eyebrow">Charge nurse / command center</p>
          <h2>{title}</h2>
          <p className="command-dashboard__subtitle">{subtitle}</p>
        </div>
        <div className="command-dashboard__meta">
          <span>{snapshot.summaryLine}</span>
          <time dateTime={snapshot.updatedAt}>
            Updated {new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </header>

      {staff.length ? (
        <DepartmentStaffBar
          staff={staff}
          patients={patients}
          rooms={rooms}
          activeShift={activeShift}
        />
      ) : null}

      <p className="command-dashboard__bottleneck" role="status">
        {snapshot.bottleneckLabel}
      </p>

      <BottleneckCommandPanel registry={bottleneckRegistry} />

      {snapshot.chargeNurseAlerts.length ? (
        <section className="command-dashboard__alerts" aria-label="Charge nurse predictive alerts">
          <div className="command-dashboard__alerts-heading">
            <h3>Charge nurse alerts</h3>
            <span>Based on admission probability and pre-arrival rules</span>
          </div>
          <ul className="command-dashboard__alert-list">
            {snapshot.chargeNurseAlerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <AiDecisionSupportQueue snapshot={snapshot} />

      {snapshot.prolongedStayAlerts?.length ? (
        <section className="command-dashboard__pending-beds" aria-label="Prolonged stay risk alerts">
          <h3>Prolonged ED stay risk</h3>
          <ul>
            {snapshot.prolongedStayAlerts.map((alert) => (
              <li key={alert.patientId}>
                <strong>{alert.patientLabel}</strong>
                <span>
                  Risk {alert.probabilityPercent}% · projected {alert.predictedHours}h
                </span>
                <small>{alert.action}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.orientationPredictions?.length ? (
        <section className="command-dashboard__activations" aria-label="Post-ED orientation predictions">
          <h3>Post-ED orientation (ML)</h3>
          <ul>
            {snapshot.orientationPredictions.map((prediction) => (
              <li key={prediction.patientId}>
                <strong>{prediction.patientLabel}</strong>
                <span>
                  {prediction.orientation.toUpperCase()} · {prediction.probabilityPercent}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.pendingBedAssignments.length ? (
        <section className="command-dashboard__pending-beds" aria-label="Pending bed assignments">
          <h3>Pending bed assignment</h3>
          <ul>
            {snapshot.pendingBedAssignments.map((assignment) => (
              <li key={assignment.patientId}>
                <strong>{assignment.patientLabel}</strong>
                <span>
                  Admit score {assignment.admitScore}/10 ({assignment.probabilityPercent}%)
                </span>
                <small>{assignment.action}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.resourceActivations.length ? (
        <section className="command-dashboard__activations" aria-label="Pre-arrival resource activations">
          <h3>Resource activations</h3>
          <ul>
            {snapshot.resourceActivations.map((activation) => (
              <li key={activation.id} className={`command-dashboard__activation--${activation.severity}`}>
                <strong>{activation.title}</strong>
                <span>{activation.summary}</span>
                <small>{activation.chargeNurseAction}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeResponseTimers.length > 0 ? (
        <p className="command-dashboard__timer-status" role="status" aria-live="polite">
          3-minute response: {activeResponseTimers.length} active timer
          {activeResponseTimers.length === 1 ? '' : 's'}
          {breachedTimers.length > 0
            ? ` · ${breachedTimers.length} breached`
            : ''}
        </p>
      ) : null}

      {complianceAlerts && complianceAlerts.length > 0 && (
        <ResponseComplianceCard
          alerts={complianceAlerts}
          className="command-dashboard__compliance"
        />
      )}

      <div className="command-dashboard__metrics" aria-label="Department operational metrics">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <section className="command-dashboard__zones-panel" aria-label="Bed occupancy by zone">
        <div className="command-dashboard__zones-heading">
          <h3>Bed occupancy by zone</h3>
          <span>Red/Amber/Green thresholds from live room status</span>
        </div>
        {snapshot.zoneOccupancy.length ? (
          <ul className="command-dashboard__zones">
            {snapshot.zoneOccupancy.map((zone) => (
              <ZoneOccupancyRow key={zone.zoneId} zone={zone} />
            ))}
          </ul>
        ) : (
          <p className="command-dashboard__empty">No room zones are configured on the whiteboard yet.</p>
        )}
      </section>
    </section>
  );
}
