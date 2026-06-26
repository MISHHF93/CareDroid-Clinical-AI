import { useEffect, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconAmbulance,
  IconGauge,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import {
  hasPatientFlag,
  selectQueueBottleneckAlert,
  selectReassessmentCount,
  useEmergencyStore,
} from '../../../store/emergencyStore';
import { CANONICAL_ROUTES } from '../../../config/routes.config';
import useProfileNavigate from '../../../hooks/useProfileNavigate';
import {
  PatientFlag,
  PatientState,
  Priority,
} from '../../../types/emergency';
import type { Alert, CapacitySnapshot, Patient, Referral, Staff, WorkflowActionLog } from '../../../types/emergency';
import { PageShell } from '../../../components/ui/CareDroidPrimitives';
import EdDataSourceBanner from '../../../components/emergency/EdDataSourceBanner';
import { usePractitionerSurfaceVisibility } from '../../../contexts/PractitionerVisibilityContext';
import useEdRouteDataContext from '../../../hooks/useEdRouteDataContext';
import './DepartmentPulse.css';

const LAST_VIEW_KEY = 'caredroid.ed.departmentPulse.lastView.v1';
const AWAY_THRESHOLD_MS = 15 * 60 * 1000;
const ACTIVE_EMS_STATUSES = new Set(['Dispatched', 'Inbound', 'Arrived', 'Handoff', 'Offload']);

type Tone = 'green' | 'yellow' | 'orange' | 'red' | 'blue';

type EmsRecord = {
  id?: string;
  status?: string;
  dispatchTime?: string;
  estimatedArrivalTime?: string;
  eta?: number;
  etaMinutes?: number;
  unitName?: string;
  unitNumber?: string;
  callSign?: string;
  chiefComplaint?: string;
  prearrivalComplaint?: string;
};

type PulseSnapshot = {
  timestamp: number | null;
  viewedAt?: string;
  capacityBand?: CapacitySnapshot['band'];
  activePatientCount?: number;
};

type ChangeEvent = {
  timestamp: number;
  text: string;
};

function getPulseStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readPulseSnapshot(): PulseSnapshot {
  const storage = getPulseStorage();
  if (!storage) return { timestamp: null };

  try {
    const raw = storage.getItem(LAST_VIEW_KEY);
    if (!raw) return { timestamp: null };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'number') return { timestamp: parsed };
    const timestamp = Number(parsed?.timestamp);
    const viewedAt = typeof parsed?.viewedAt === 'string' ? parsed.viewedAt : undefined;
    const viewedAtTime = viewedAt ? Date.parse(viewedAt) : Number.NaN;
    return {
      timestamp: Number.isFinite(timestamp) ? timestamp : Number.isFinite(viewedAtTime) ? viewedAtTime : null,
      viewedAt,
      capacityBand: parsed?.capacityBand || parsed?.capacityRisk,
      activePatientCount: Number.isFinite(Number(parsed?.activePatientCount))
        ? Number(parsed.activePatientCount)
        : undefined,
    };
  } catch (_error: any) {
    try {
      const raw = storage.getItem(LAST_VIEW_KEY);
      const numeric = Number(raw);
      const parsedDate = raw ? Date.parse(raw) : Number.NaN;
      return { timestamp: Number.isFinite(numeric) ? numeric : Number.isFinite(parsedDate) ? parsedDate : null };
    } catch {
      return { timestamp: null };
    }
  }
}

function writePulseSnapshot(snapshot: Required<Pick<PulseSnapshot, 'timestamp' | 'capacityBand' | 'activePatientCount'>>) {
  const storage = getPulseStorage();
  if (!storage || snapshot.timestamp === null) return;
  try {
    storage.setItem(
      LAST_VIEW_KEY,
      JSON.stringify({
        timestamp: snapshot.timestamp,
        viewedAt: new Date(snapshot.timestamp).toISOString(),
        capacityBand: snapshot.capacityBand,
        activePatientCount: snapshot.activePatientCount,
      }),
    );
  } catch {
    // Pulse must stay renderable in clinical demo browsers that block storage.
  }
}

function minutesSince(timestamp?: string | null, now = Date.now()): number {
  const then = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.round((now - then) / 60000));
}

function timestampOf(value?: string | null): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatEventTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function patientName(patient: Patient): string {
  return patient.name || `${patient.firstName} ${patient.lastName}`.trim() || 'Unknown patient';
}

function isHighRiskPatient(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    hasPatientFlag(patient, PatientFlag.HighRisk) ||
    hasPatientFlag(patient, PatientFlag.DeteriorationRisk) ||
    hasPatientFlag(patient, PatientFlag.SepsisAlert)
  );
}

function hasActiveEscalation(patient: Patient): boolean {
  const timeline = [...(patient.timeline || [])].sort(
    (first, second) => timestampOf(second.timestamp) - timestampOf(first.timestamp),
  );
  const latestEscalation = timeline.find((event) => event.type === 'ESCALATION');
  const latestCancel = timeline.find((event) => event.type === 'ESCALATION_CANCELLED');
  if (!latestEscalation) return false;
  return !latestCancel || timestampOf(latestEscalation.timestamp) > timestampOf(latestCancel.timestamp);
}

function capacityTone(capacity: CapacitySnapshot): Tone {
  if (capacity.band === 'Red') return 'red';
  if (capacity.band === 'Orange') return 'orange';
  if (capacity.band === 'Yellow') return 'yellow';
  return 'green';
}

function countTone(value: number, yellowAt: number, redAt: number): Tone {
  if (value >= redAt) return 'red';
  if (value >= yellowAt) return 'yellow';
  return 'green';
}

function currentEms(records: EmsRecord[]): EmsRecord[] {
  return records.filter((record) => ACTIVE_EMS_STATUSES.has(String(record.status || '')));
}

function buildQueueRows(activePatients: Patient[], emsInboundCount: number, now: number) {
  const queueDefinitions = [
    { key: PatientState.Registration, name: 'Registration', target: 15 },
    { key: PatientState.Triage, name: 'Triage', target: 10 },
    { key: PatientState.Waiting, name: 'Waiting', target: 30 },
    { key: PatientState.Assessment, name: 'Assessment', target: 45 },
    { key: PatientState.Orders, name: 'Orders', target: 60 },
    { key: PatientState.Results, name: 'Results', target: 90 },
    { key: PatientState.Admission, name: 'Admission', target: 120 },
    { key: PatientFlag.ReassessmentDue, name: 'Reassessment', target: 30 },
  ];

  const rows = queueDefinitions.map((definition) => {
    const patients =
      definition.key === PatientFlag.ReassessmentDue
        ? activePatients.filter((patient) => hasPatientFlag(patient, PatientFlag.ReassessmentDue))
        : activePatients.filter((patient) => patient.state === definition.key);
    const waits = patients.map((patient) => minutesSince(patient.arrivalTime, now));
    const avgWait = waits.length ? Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length) : 0;
    const health: Tone = avgWait >= definition.target * 1.5 ? 'red' : avgWait >= definition.target ? 'yellow' : 'green';
    return {
      id: String(definition.key),
      name: definition.name,
      count: patients.length,
      health,
      avgWait,
    };
  });

  return [
    ...rows,
    {
      id: 'ems',
      name: 'EMS inbound',
      count: emsInboundCount,
      health: countTone(emsInboundCount, 1, 3),
      avgWait: 0,
    },
  ];
}

function buildStaffRows(staff: Staff[], activePatients: Patient[]) {
  const visibleStaff = staff.filter((member) => member.active !== false);
  const average = visibleStaff.length ? activePatients.length / visibleStaff.length : 0;

  return visibleStaff.map((member) => {
    const count = activePatients.filter((patient) => patient.assignedStaffId === member.id).length;
    const overloaded = average > 0 && count > average * 2;
    const underloaded = average > 0 && count < average / 2;
    const displayName = member.displayName || member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.id;
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      ...member,
      displayName,
      initials,
      count,
      tone: overloaded ? 'red' : underloaded ? 'green' : 'blue',
      workloadPercent: Math.min(100, Math.round((count / Math.max(1, average * 2 || 4)) * 100)),
    };
  });
}

function buildChangeEvents({
  since,
  previousSnapshot,
  patients,
  capacity,
  referrals,
  emsArrivals,
  alerts,
  workflowLogs,
}: {
  since: number | null;
  previousSnapshot: PulseSnapshot;
  patients: Patient[];
  capacity: CapacitySnapshot;
  referrals: Referral[];
  emsArrivals: EmsRecord[];
  alerts: Alert[];
  workflowLogs: WorkflowActionLog[];
}): ChangeEvent[] {
  if (!since) return [];
  const changes: ChangeEvent[] = [];

  const newPatients = patients.filter((patient) => timestampOf(patient.arrivalTime) > since);
  if (newPatients.length) {
    const complaints = newPatients
      .map((patient) => patient.complaint || patient.chiefComplaint || patient.complaintCategory)
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');
    changes.push({
      timestamp: Math.max(...newPatients.map((patient) => timestampOf(patient.arrivalTime))),
      text: `${newPatients.length} new arrival${newPatients.length === 1 ? '' : 's'}: ${complaints}`,
    });
  }

  patients.forEach((patient) => {
    (patient.timeline || []).forEach((event) => {
      const eventTime = timestampOf(event.timestamp);
      if (!eventTime || eventTime <= since) return;
      if (event.type === 'FlagAdded') {
        const flag = String(event.metadata?.flag || event.metadata?.flagType || event.summary || 'Attention flag');
        changes.push({
          timestamp: eventTime,
          text: `${patientName(patient)} flagged: ${flag}`,
        });
      }
    });
  });

  workflowLogs
    .filter((log) => log.type === 'capacity_score_changed' && timestampOf(log.timestamp) > since)
    .forEach((log) => {
      const toBand = log.metadata?.toBand || log.metadata?.band || capacity.band;
      const fromBand = log.metadata?.fromBand || log.metadata?.from || 'previous band';
      changes.push({
        timestamp: timestampOf(log.timestamp),
        text: `Capacity moved from ${fromBand} to ${toBand}`,
      });
    });

  if (previousSnapshot.capacityBand && previousSnapshot.capacityBand !== capacity.band) {
    changes.push({
      timestamp: Date.now(),
      text: `Capacity moved from ${previousSnapshot.capacityBand} to ${capacity.band}`,
    });
  }

  referrals.forEach((referral) => {
    const requestedAt = timestampOf(referral.requestedAt || referral.createdAt);
    if (requestedAt > since) {
      changes.push({
        timestamp: requestedAt,
        text: `${referral.targetDepartment || referral.service || 'Referral'} referral sent`,
      });
    }
    const respondedAt = timestampOf(referral.respondedAt || referral.updatedAt);
    if (respondedAt > since && respondedAt !== requestedAt) {
      changes.push({
        timestamp: respondedAt,
        text: `${referral.targetDepartment || referral.service || 'Referral'} referral ${referral.status.toLowerCase()}`,
      });
    }
  });

  emsArrivals.forEach((arrival) => {
    const dispatchTime = timestampOf(arrival.dispatchTime || arrival.estimatedArrivalTime);
    if (dispatchTime > since) {
      changes.push({
        timestamp: dispatchTime,
        text: `${arrival.unitName || arrival.unitNumber || arrival.callSign || 'EMS unit'} dispatched: ${
          arrival.chiefComplaint || arrival.prearrivalComplaint || arrival.status || 'inbound'
        }`,
      });
    }
  });

  alerts
    .filter((alert) => alert.severity === 'Critical' && timestampOf(alert.createdAt) > since)
    .forEach((alert) => {
      const patient = alert.patientId ? patients.find((candidate) => candidate.id === alert.patientId) : null;
      changes.push({
        timestamp: timestampOf(alert.createdAt),
        text: `${patient ? `${patientName(patient)}: ` : ''}${alert.title}`,
      });
    });

  return changes
    .filter((event) => Number.isFinite(event.timestamp) && event.text)
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, 8);
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frameId = 0;
    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / 300);
      setDisplayValue(Math.round(value * progress));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

export default function DepartmentPulse() {
  const { profileNavigate } = useProfileNavigate();
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const staff = useEmergencyStore((state) => state.staff);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals as EmsRecord[]);
  const alerts = useEmergencyStore((state) => state.alerts);
  const queues = useEmergencyStore((state) => state.queues);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const reassessmentCount = useMemo(
    () => selectReassessmentCount({ patients } as Parameters<typeof selectReassessmentCount>[0]),
    [patients],
  );
  const bottleneckAlert = useMemo(
    () =>
      selectQueueBottleneckAlert({
        patients,
        queues,
        alerts,
      } as Parameters<typeof selectQueueBottleneckAlert>[0]),
    [alerts, patients, queues],
  );
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setLastPulseView = useEmergencyStore((state) => state.setLastPulseView);
  const [previousSnapshot] = useState(() => readPulseSnapshot());
  const [now, setNow] = useState(() => new Date());
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const activePatients = useMemo(
    () => patients.filter((patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased),
    [patients],
  );

  useEffect(() => {
    const timestamp = Date.now();
    setLastPulseView(timestamp);
    writePulseSnapshot({
      timestamp,
      capacityBand: capacity.band,
      activePatientCount: activePatients.length,
    });
  }, [activePatients.length, capacity.band, setLastPulseView]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setLastUpdatedAt(new Date());
  }, [patients, capacity.updatedAt, referrals, emsArrivals, alerts, workflowLogs]);

  const awayMs = previousSnapshot.timestamp ? now.getTime() - previousSnapshot.timestamp : 0;
  const awayMinutes = previousSnapshot.timestamp ? Math.max(0, Math.round(awayMs / 60000)) : 0;
  const isReturningAfterAway = awayMs > AWAY_THRESHOLD_MS;
  const highRiskCount = activePatients.filter(isHighRiskPatient).length;
  const inboundEms = currentEms(emsArrivals);
  const queueRows = useMemo(
    () => buildQueueRows(activePatients, inboundEms.length, now.getTime()),
    [activePatients, inboundEms.length, now],
  );
  const staffRows = useMemo(() => buildStaffRows(staff, activePatients), [activePatients, staff]);
  const attentionPatients = useMemo(
    () =>
      activePatients
        .filter(
          (patient) =>
            patient.priority === Priority.P1 ||
            patient.priority === Priority.P2 ||
            hasActiveEscalation(patient) ||
            hasPatientFlag(patient, PatientFlag.ReassessmentDue),
        )
        .sort((first, second) => {
          const score = (patient: Patient) =>
            (hasActiveEscalation(patient) ? 100 : 0) +
            (patient.priority === Priority.P1 ? 60 : patient.priority === Priority.P2 ? 40 : 0) +
            (hasPatientFlag(patient, PatientFlag.ReassessmentDue) ? 25 : 0) +
            minutesSince(patient.arrivalTime, now.getTime());
          return score(second) - score(first);
        }),
    [activePatients, now],
  );
  const changes = useMemo(
    () =>
      isReturningAfterAway
        ? buildChangeEvents({
            since: previousSnapshot.timestamp,
            previousSnapshot,
            patients,
            capacity,
            referrals,
            emsArrivals,
            alerts,
            workflowLogs,
          })
        : [],
    [alerts, capacity, emsArrivals, isReturningAfterAway, patients, previousSnapshot, referrals, workflowLogs],
  );
  const derivedBottleneck = queueRows
    .filter((queue) => queue.health === 'red')
    .sort((first, second) => second.avgWait - first.avgWait)[0];
  const secondsSinceUpdate = Math.max(0, Math.floor((now.getTime() - lastUpdatedAt.getTime()) / 1000));

  const surfaces = usePractitionerSurfaceVisibility();
  const { activeScenarioId, backendAvailable, envelope, loading } = useEdRouteDataContext();
  const useCompactStats = !surfaces.pulse.showStatCards;

  const statTiles = [
    {
      label: 'Active patients',
      value: activePatients.length,
      icon: IconUsers,
      tone: countTone(activePatients.length, 16, 28),
      route: CANONICAL_ROUTES.emergencyPatients,
    },
    {
      label: 'Capacity score',
      value: capacity.score,
      icon: IconGauge,
      tone: capacityTone(capacity),
      route: CANONICAL_ROUTES.emergencyCapacity,
    },
    {
      label: 'High risk',
      value: highRiskCount,
      icon: IconAlertTriangle,
      tone: countTone(highRiskCount, 2, 5),
      route: CANONICAL_ROUTES.emergencyPatients,
    },
    {
      label: 'Reassessment due',
      value: reassessmentCount,
      icon: IconRefresh,
      tone: countTone(reassessmentCount, 2, 5),
      route: CANONICAL_ROUTES.emergencyReassessment,
    },
    {
      label: 'EMS inbound',
      value: inboundEms.length,
      icon: IconAmbulance,
      tone: countTone(inboundEms.length, 1, 3),
      route: CANONICAL_ROUTES.emergencyEms,
    },
  ];

  return (
    <PageShell
      as="section"
      eyebrow="Analytics"
      title="Department Pulse"
      titleId="emergency-pulse-title"
      description={
        surfaces.pulse.showDescriptions
          ? 'Live queues, staff load, EMS inbound, and attention patients for charge review.'
          : undefined
      }
      className={`emergency-pulse cd-page-shell${
        surfaces.compactLayout ? ' emergency-pulse--practitioner-compact' : ''
      }`}
      headerClassName="emergency-pulse__hero"
      contentClassName="emergency-pulse__content"
      aria-labelledby="emergency-pulse-title"
    >
      <EdDataSourceBanner
        envelope={envelope}
        loading={loading}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
        compact
        className="emergency-pulse__data-source"
      />

      <div className="emergency-pulse__timebar">
        <strong>
          {isReturningAfterAway
            ? `You were away ${awayMinutes} minutes. Here is what changed.`
            : `Live department status - ${formatClock(now)}`}
        </strong>
        <span className="emergency-pulse__live" role="status" aria-label={`Live. Updated ${secondsSinceUpdate}s ago`}>
          Last updated {secondsSinceUpdate}s ago
          <span aria-hidden="true" />
        </span>
      </div>

      {useCompactStats ? (
        <div className="emergency-pulse__stat-strip" aria-label="Department pulse statistics">
          {statTiles.map((tile) => (
            <button
              key={tile.label}
              type="button"
              className={`emergency-pulse__stat-strip-item emergency-pulse__stat-strip-item--${tile.tone}`}
              onClick={() => profileNavigate(tile.route)}
            >
              <strong>
                <AnimatedNumber value={tile.value} />
              </strong>
              <span>{tile.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="emergency-pulse__stats" aria-label="Department pulse statistics">
          {statTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.label}
                type="button"
                className={`emergency-pulse__stat emergency-pulse__stat--${tile.tone}`}
                onClick={() => profileNavigate(tile.route)}
              >
                <Icon size={24} aria-hidden="true" />
                <span>{tile.label}</span>
                <strong>
                  <AnimatedNumber value={tile.value} />
                </strong>
              </button>
            );
          })}
        </div>
      )}

      {isReturningAfterAway ? (
        <section className="emergency-pulse__panel" aria-labelledby="pulse-changes-heading">
          <div className="emergency-pulse__section-heading">
            <h2 id="pulse-changes-heading">What changed</h2>
            <span>{changes.length} events</span>
          </div>
          {changes.length ? (
            <ul className="emergency-pulse__changes">
              {changes.map((change) => (
                <li key={`${change.timestamp}-${change.text}`}>
                  {formatEventTime(change.timestamp)} - {change.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="emergency-pulse__empty">No timestamped changes were found since your last Pulse visit.</p>
          )}
        </section>
      ) : null}

      <section className="emergency-pulse__panel" aria-labelledby="pulse-attention-heading">
        <div className="emergency-pulse__section-heading">
          <h2 id="pulse-attention-heading">Attention list</h2>
          <span>{attentionPatients.length} patients</span>
        </div>
        <div className="emergency-pulse__attention-row">
          {attentionPatients.map((patient) => (
            <button key={patient.id} type="button" onClick={() => selectPatient(patient.id)}>
              <span className="emergency-pulse__priority">{patient.priority}</span>
              <strong>{patientName(patient)}</strong>
              <small>{patient.chiefComplaint}</small>
              <em>
                {hasActiveEscalation(patient)
                  ? 'Escalated'
                  : hasPatientFlag(patient, PatientFlag.ReassessmentDue)
                    ? 'Reassessment due'
                    : `${minutesSince(patient.arrivalTime, now.getTime())}m in department`}
              </em>
            </button>
          ))}
          {!attentionPatients.length ? (
            <p className="emergency-pulse__empty">No P1/P2, escalated, or reassessment-due patients right now.</p>
          ) : null}
        </div>
      </section>

      {surfaces.pulse.showQueuePanel ? (
        <section className="emergency-pulse__panel" aria-labelledby="pulse-queue-heading">
          <div className="emergency-pulse__section-heading">
            <h2 id="pulse-queue-heading">Queue snapshot</h2>
            <span>{queueRows.length} queues</span>
          </div>
          <div className="emergency-pulse__queue-list">
            {queueRows.map((queue) => (
              <div key={queue.id} className="emergency-pulse__queue-row">
                <strong>{queue.name}</strong>
                <span>{queue.count}</span>
                <span className={`emergency-pulse__health emergency-pulse__health--${queue.health}`} aria-label={`${queue.health} health`} />
                <small>Avg {queue.avgWait}m</small>
              </div>
            ))}
          </div>
          {bottleneckAlert || derivedBottleneck ? (
            <p className="emergency-pulse__bottleneck" role="alert">
              Bottleneck: {bottleneckAlert?.message || `${derivedBottleneck.name} average wait is ${derivedBottleneck.avgWait}m.`}
            </p>
          ) : null}
        </section>
      ) : bottleneckAlert || derivedBottleneck ? (
        <p className="emergency-pulse__bottleneck emergency-pulse__bottleneck--compact" role="alert">
          Bottleneck: {bottleneckAlert?.message || `${derivedBottleneck.name} average wait is ${derivedBottleneck.avgWait}m.`}
        </p>
      ) : null}

      {surfaces.pulse.showStaffPanel ? (
        <section className="emergency-pulse__panel" aria-labelledby="pulse-staff-heading">
          <div className="emergency-pulse__section-heading">
            <h2 id="pulse-staff-heading">Staff snapshot</h2>
            <span>{staffRows.length} active staff</span>
          </div>
          <div className="emergency-pulse__staff-row">
            {staffRows.map((member) => (
              <article key={member.id} className={`emergency-pulse__staff emergency-pulse__staff--${member.tone}`}>
                {member.avatarUrl ? <img src={member.avatarUrl} alt="" loading="lazy" /> : <span>{member.initials}</span>}
                <strong>{member.displayName}</strong>
                <small>{member.count} patients</small>
                <div className="emergency-pulse__workload" aria-label={`${member.displayName} workload`}>
                  <span style={{ width: `${Math.max(8, member.workloadPercent)}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
