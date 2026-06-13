import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Ambulance, Gauge, RotateCcw, Users } from 'lucide-react';
import { Priority } from '../../../../../types/emergency';
import {
  hasPatientFlag,
  selectActivePatients,
  selectQueueBottleneckAlert,
  selectQueuePanelRows,
  selectReassessmentCount,
  useEmergencyStore,
} from '../../../../../../store/emergencyStore';
import { buildStaffWorkloads } from '../../../../../utils/staffManagement';
import { PatientDetailPanel } from '../../../../../components/PatientCard';
import './DepartmentPulse.css';

const LAST_VIEW_KEY = 'caredroid.ed.departmentPulse.lastView.v1';
const ACTIVE_EMS_STATUSES = new Set(['Inbound', 'Arrived', 'Handoff']);

function readLastView() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(LAST_VIEW_KEY) || 'null');
  } catch (_error) {
    return null;
  }
}

function writeLastView(snapshot) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_VIEW_KEY, JSON.stringify(snapshot));
}

function minutesBetween(start, end) {
  const startedAt = new Date(start).getTime();
  const endedAt = new Date(end).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return 0;
  return Math.max(0, Math.round((endedAt - startedAt) / 60000));
}

function patientName(patient) {
  return patient?.name || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || 'Unknown patient';
}

function roomLabel(patient, rooms = []) {
  return patient?.location || rooms.find((room) => room.id === patient?.roomId)?.name || patient?.roomId || 'No bed';
}

function waitMinutes(patient, now = new Date()) {
  return minutesBetween(patient.arrivalTime, now);
}

function hasActiveEscalation(patient) {
  const events = [...(patient?.timeline || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestEscalation = events.find((event) => event.type === 'ESCALATION');
  const latestCancel = events.find((event) => event.type === 'ESCALATION_CANCELLED');
  if (!latestEscalation) return false;
  return !latestCancel || new Date(latestEscalation.timestamp).getTime() > new Date(latestCancel.timestamp).getTime();
}

function formatClock(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatAwayLine(lastView, now) {
  if (!lastView?.viewedAt) return 'Current department status.';
  const awayMinutes = minutesBetween(lastView.viewedAt, now);
  if (awayMinutes < 1) return 'Current department status.';
  return `You were away ${awayMinutes} minute${awayMinutes === 1 ? '' : 's'}. Here is what changed.`;
}

function capacityTone(capacity) {
  const risk = String(capacity?.riskLevel || '').toLowerCase();
  if (risk === 'red') return 'red';
  if (risk === 'orange' || risk === 'yellow') return 'yellow';
  return 'green';
}

function countTone(value, yellowAt, redAt) {
  if (value >= redAt) return 'red';
  if (value >= yellowAt) return 'yellow';
  return 'green';
}

function AnimatedValue({ value, suffix = '' }) {
  const numericValue = Number(value);
  const [displayValue, setDisplayValue] = useState(Number.isFinite(numericValue) ? 0 : value);

  useEffect(() => {
    if (!Number.isFinite(numericValue)) {
      setDisplayValue(value);
      return undefined;
    }
    const startedAt = performance.now();
    let frameId = 0;
    const tick = (timestamp) => {
      const progress = Math.min(1, (timestamp - startedAt) / 300);
      setDisplayValue(Math.round(numericValue * progress));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [numericValue, value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

function buildChangeList({ since, patients, rooms, capacity, lastView, referrals, emsArrivals }) {
  if (!since) return [];
  const sinceMs = new Date(since).getTime();
  if (!Number.isFinite(sinceMs)) return [];
  const changes = [];
  const newPatients = patients.filter((patient) => new Date(patient.arrivalTime).getTime() > sinceMs);
  if (newPatients.length) {
    const beds = newPatients.map((patient) => roomLabel(patient, rooms)).slice(0, 4).join(', ');
    changes.push({
      timestamp: Math.max(...newPatients.map((patient) => new Date(patient.arrivalTime).getTime())),
      text: `${newPatients.length} new patient${newPatients.length === 1 ? '' : 's'} added (${beds})`,
    });
  }

  patients.forEach((patient) => {
    (patient.timeline || []).forEach((event) => {
      const eventTime = new Date(event.timestamp).getTime();
      if (!Number.isFinite(eventTime) || eventTime <= sinceMs) return;
      if (event.type === 'ESCALATION') {
        changes.push({
          timestamp: eventTime,
          text: `${patientName(patient)} in ${roomLabel(patient, rooms)} escalated`,
        });
      }
      if (event.type === 'FlagAdded' && /DeteriorationRisk|HighRisk|ReassessmentDue/.test(String(event.metadata?.flagType || event.summary))) {
        changes.push({
          timestamp: eventTime,
          text: `${patientName(patient)} in ${roomLabel(patient, rooms)} flagged - ${
            event.metadata?.flagType || 'attention required'
          }`,
        });
      }
    });
  });

  if (lastView?.capacityRisk && lastView.capacityRisk !== capacity.riskLevel) {
    changes.push({
      timestamp: Date.now(),
      text: `Capacity moved from ${lastView.capacityRisk} to ${capacity.riskLevel}`,
    });
  }

  const newReferrals = referrals.filter((referral) => new Date(referral.requestedAt).getTime() > sinceMs);
  if (newReferrals.length) {
    const departments = [...new Set(newReferrals.map((referral) => referral.targetDepartment))].slice(0, 3);
    changes.push({
      timestamp: Math.max(...newReferrals.map((referral) => new Date(referral.requestedAt).getTime())),
      text: `${newReferrals.length} referral${newReferrals.length === 1 ? '' : 's'} sent (${departments.join(' + ')})`,
    });
  }

  const nextEms = emsArrivals
    .filter((arrival) => ACTIVE_EMS_STATUSES.has(arrival.status))
    .sort((a, b) => (a.eta ?? 99) - (b.eta ?? 99))[0];
  if (nextEms) {
    changes.push({
      timestamp: Date.now(),
      text: `${emsArrivals.filter((arrival) => ACTIVE_EMS_STATUSES.has(arrival.status)).length} EMS unit${
        emsArrivals.filter((arrival) => ACTIVE_EMS_STATUSES.has(arrival.status)).length === 1 ? '' : 's'
      } active; next arriving in ${nextEms.eta ?? '--'} minutes`,
    });
  }

  return changes.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
}

export default function DepartmentPulse() {
  const patients = useEmergencyStore((state) => state.patients);
  const activePatients = useEmergencyStore(selectActivePatients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const rooms = useEmergencyStore((state) => state.rooms);
  const queues = useEmergencyStore(selectQueuePanelRows);
  const bottleneck = useEmergencyStore(selectQueueBottleneckAlert);
  const reassessmentCount = useEmergencyStore(selectReassessmentCount);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const referrals = useEmergencyStore((state) => state.referrals);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const [now, setNow] = useState(() => new Date());
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [lastView] = useState(() => readLastView());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextNow = new Date();
      setNow(nextNow);
      setLastUpdated(nextNow);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    writeLastView({
      viewedAt: new Date().toISOString(),
      capacityRisk: capacity.riskLevel,
      activePatientCount: activePatients.length,
    });
  }, [activePatients.length, capacity.riskLevel]);

  const highRiskCount = activePatients.filter(
    (patient) =>
      patient.priority === Priority.P1 ||
      patient.priority === Priority.P2 ||
      hasPatientFlag(patient, 'HighRisk') ||
      hasPatientFlag(patient, 'DeteriorationRisk')
  ).length;
  const inboundEms = emsArrivals.filter((arrival) => arrival.status === 'Inbound');
  const awayMinutes = lastView?.viewedAt ? minutesBetween(lastView.viewedAt, now) : 0;
  const changes = useMemo(
    () =>
      awayMinutes > 15
        ? buildChangeList({
            since: lastView?.viewedAt,
            patients,
            rooms,
            capacity,
            lastView,
            referrals,
            emsArrivals,
          })
        : [],
    [awayMinutes, capacity, emsArrivals, lastView, patients, referrals, rooms]
  );
  const attentionPatients = useMemo(
    () =>
      activePatients
        .filter(
          (patient) =>
            patient.priority === Priority.P1 ||
            patient.priority === Priority.P2 ||
            hasActiveEscalation(patient) ||
            hasPatientFlag(patient, 'ReassessmentDue')
        )
        .sort((a, b) => {
          const score = (patient) =>
            (hasActiveEscalation(patient) ? 100 : 0) +
            (patient.priority === Priority.P1 ? 50 : patient.priority === Priority.P2 ? 30 : 0) +
            (hasPatientFlag(patient, 'ReassessmentDue') ? 20 : 0) +
            waitMinutes(patient, now);
          return score(b) - score(a);
        })
        .slice(0, 4),
    [activePatients, now]
  );
  const staffWorkloads = useMemo(
    () => buildStaffWorkloads(staff, activePatients, activeShift),
    [activePatients, activeShift, staff]
  );

  const statTiles = [
    {
      label: 'Active patients',
      value: activePatients.length,
      icon: Users,
      tone: countTone(activePatients.length, 18, capacity.maxCapacity || 30),
    },
    {
      label: 'Capacity score',
      value: capacity.score,
      suffix: '',
      icon: Gauge,
      tone: capacityTone(capacity),
    },
    {
      label: 'High risk',
      value: highRiskCount,
      icon: AlertTriangle,
      tone: countTone(highRiskCount, 2, 5),
    },
    {
      label: 'Reassessment due',
      value: reassessmentCount,
      icon: RotateCcw,
      tone: countTone(reassessmentCount, 2, 5),
    },
    {
      label: 'EMS inbound',
      value: inboundEms.length,
      icon: Ambulance,
      tone: countTone(inboundEms.length, 1, 3),
    },
  ];

  return (
    <section className="department-pulse" aria-labelledby="department-pulse-title">
      <header className="department-pulse__header">
        <div>
          <span>Department Pulse</span>
          <h1 id="department-pulse-title">{formatAwayLine(lastView, now)}</h1>
        </div>
        <div className="department-pulse__live" role="status" aria-label={`Live. Updated ${formatClock(lastUpdated)}`}>
          <span aria-hidden />
          Live · {formatClock(lastUpdated)}
        </div>
      </header>

      <div className="department-pulse__stats" aria-label="Department status statistics">
        {statTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <article key={tile.label} className={`department-pulse__stat department-pulse__stat--${tile.tone}`}>
              <Icon size={22} aria-hidden />
              <div>
                <strong>
                  <AnimatedValue value={tile.value} suffix={tile.suffix || ''} />
                </strong>
                <span>{tile.label}</span>
              </div>
            </article>
          );
        })}
      </div>

      <section className="department-pulse__panel department-pulse__changes" aria-labelledby="pulse-changes-title">
        <h2 id="pulse-changes-title">Since You Were Away</h2>
        {changes.length ? (
          <ul>
            {changes.map((change) => (
              <li key={`${change.timestamp}-${change.text}`}>{change.text}</li>
            ))}
          </ul>
        ) : (
          <p>{lastView?.viewedAt && awayMinutes <= 15 ? 'No major changes in the last 15 minutes.' : 'First pulse view loaded for this browser.'}</p>
        )}
      </section>

      <section className="department-pulse__panel" aria-labelledby="pulse-attention-title">
        <div className="department-pulse__section-heading">
          <h2 id="pulse-attention-title">Attention List</h2>
          <span>{attentionPatients.length} patients</span>
        </div>
        <div className="department-pulse__attention-row">
          {attentionPatients.map((patient) => (
            <button key={patient.id} type="button" onClick={() => selectPatient(patient.id)}>
              <span>{patient.priority}</span>
              <strong>{patientName(patient)}</strong>
              <small>{roomLabel(patient, rooms)} · {patient.complaintCategory}</small>
              <em>
                {hasActiveEscalation(patient)
                  ? 'Escalated'
                  : hasPatientFlag(patient, 'ReassessmentDue')
                    ? 'Reassessment due'
                    : `${waitMinutes(patient, now)}m wait`}
              </em>
            </button>
          ))}
          {!attentionPatients.length ? <p>No P1/P2, escalated, or reassessment-due patients.</p> : null}
        </div>
      </section>

      <section className="department-pulse__grid">
        <div className="department-pulse__panel" aria-labelledby="pulse-queues-title">
          <div className="department-pulse__section-heading">
            <h2 id="pulse-queues-title">Queue Snapshot</h2>
            {bottleneck ? <span>Bottleneck: {bottleneck.queue} queue ({bottleneck.reason})</span> : <span>No bottleneck</span>}
          </div>
          <div className="department-pulse__queue-list">
            {queues.map((queue) => (
              <div key={queue.type} className="department-pulse__queue-row">
                <span className={`department-pulse__health department-pulse__health--${queue.health}`} />
                <strong>{queue.name}</strong>
                <span>{queue.count}</span>
                <small>Avg {queue.averageWaitMinutes}m</small>
              </div>
            ))}
          </div>
        </div>

        <div className="department-pulse__panel" aria-labelledby="pulse-staff-title">
          <div className="department-pulse__section-heading">
            <h2 id="pulse-staff-title">Staff Snapshot</h2>
            <span>{staffWorkloads.length} on shift</span>
          </div>
          <div className="department-pulse__staff-row">
            {staffWorkloads.map((member) => (
              <article key={member.id} className={`department-pulse__staff department-pulse__staff--${member.workloadTone}`}>
                {member.avatarUrl ? <img src={member.avatarUrl} alt="" loading="lazy" /> : <span>{member.initials}</span>}
                <strong>{member.displayName}</strong>
                <small>{member.assignedCount} patients</small>
                <em style={{ width: `${Math.max(8, member.workloadPercent)}%` }} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {selectedPatientId ? (
        <div className="department-pulse__detail-overlay">
          <PatientDetailPanel />
        </div>
      ) : null}
    </section>
  );
}
