import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Copy, Download, Printer } from 'lucide-react';
import { PatientState, Priority } from '../../../../../types/emergency';
import { useEmergencyStore } from '../../../../../store/emergencyStore';
import { useUser } from '../../../../contexts/UserContext';
import { sendClinicalChatMessage } from '../../../../services/clinicalChatService';
import { exportEmergencyShiftReport } from '../../../../services/emergencyAnalyticsApi';
import { recordEmergencyActivity, syncEmergencyAuditEvent } from '../../../../services/emergencyStaffingApi';
import { longWaitShiftMetrics } from '../../../../utils/longWaitRescue';
import './ShiftSummary.css';

const QUEUE_BREACH_THRESHOLDS = {
  Arrival: 5,
  Registration: 10,
  Triage: 15,
  Waiting: 45,
  Provider: 30,
  Assessment: 30,
  Orders: 45,
  Results: 60,
  Disposition: 30,
  Admission: 45,
  Discharge: 20,
  Reassessment: 30,
  Referral: 60,
  EMS: 5,
  HighRisk: 15,
  Boarding: 60,
};
const ACTIVE_PATIENT_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

function toMs(value) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function minutesBetween(start, end) {
  const startMs = toMs(start);
  const endMs = toMs(end);
  if (startMs === null || endMs === null || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (!numeric.length) return 0;
  return Math.round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length);
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatHours(hours) {
  return `${Number(hours || 0).toFixed(1)}h`;
}

function patientName(patient) {
  return patient?.name || `${patient.firstName} ${patient.lastName}`;
}

function roomLabel(patient) {
  return patient.location || patient.roomId || 'No bed';
}

function flagLabel(flag) {
  return typeof flag === 'string' ? flag : `${flag.type}${flag.reason ? `: ${flag.reason}` : ''}`;
}

function vitalsText(vitals = {}) {
  return [
    vitals.hr != null ? `HR ${vitals.hr}` : null,
    vitals.bpSystolic != null ? `BP ${vitals.bpSystolic}/${vitals.bpDiastolic ?? '--'}` : null,
    vitals.spo2 != null ? `SpO2 ${vitals.spo2}%` : null,
    vitals.temp != null ? `Temp ${vitals.temp}C` : null,
    vitals.rr != null ? `RR ${vitals.rr}` : null,
    vitals.gcs != null ? `GCS ${vitals.gcs}` : null,
  ]
    .filter(Boolean)
    .join(', ') || 'No vitals recorded';
}

function backendArray(entry, key) {
  const data = entry?.data;
  if (!data) return [];
  const direct = data[key];
  if (Array.isArray(direct)) return direct;
  if (Array.isArray(data.patient?.[key])) return data.patient[key];
  if (Array.isArray(data.bundle?.[key])) return data.bundle[key];
  return [];
}

function activeReminderText(reminder) {
  const dueAt = reminder.dueAt
    ? new Date(reminder.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'time not set';
  return `${dueAt}${reminder.note ? ` - ${reminder.note}` : ''}`;
}

function formatEmsArrival(arrival, now) {
  const etaMinutes = minutesBetween(now.toISOString(), arrival.estimatedArrivalTime);
  const etaText = etaMinutes === null ? 'ETA unknown' : `ETA ${etaMinutes}m`;
  return `${arrival.unitName}: ${arrival.prearrivalComplaint || arrival.notes || 'EMS patient'} (${etaText})`;
}

function latestPhysicianPlan(notes = []) {
  const physicianNote = [...notes]
    .reverse()
    .find((note) => /physician|provider|attending|plan/i.test(`${note.type} ${note.body}`));
  return physicianNote?.body || notes.at(-1)?.body || 'No plan documented in recent notes.';
}

function recentNotes(patient, now = new Date()) {
  const cutoff = now.getTime() - 4 * 60 * 60 * 1000;
  return (patient.notes || []).filter((note) => {
    const createdAt = new Date(note.createdAt).getTime();
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  });
}

function buildHandoffContext({ patients, referrals, patientBackendDetails, emsArrivals, metrics }) {
  const now = new Date();
  const activePatients = patients.filter((patient) => ACTIVE_PATIENT_STATES.has(patient.state));
  const activeReferrals = referrals.filter(
    (referral) => !['Completed', 'Declined'].includes(referral.status)
  );
  const cards = activePatients.map((patient) => {
    const notes = recentNotes(patient, now);
    const backendEntry = patientBackendDetails[patient.id];
    const orders = backendArray(backendEntry, 'orders').filter(
      (order) => !/completed|cancelled|resulted/i.test(String(order.status || ''))
    );
    const labs = backendArray(backendEntry, 'labs');
    const patientReferrals = activeReferrals.filter((referral) => referral.patientId === patient.id);
    return {
      patientId: patient.id,
      name: patientName(patient),
      bed: roomLabel(patient),
      priority: patient.priority,
      state: patient.state,
      complaint: patient.chiefComplaint || patient.complaintCategory || 'Unspecified complaint',
      history: patient.complaint || patient.chiefComplaint || 'No brief history documented.',
      vitals: vitalsText(patient.vitals),
      vitalsRecordedAt: patient.vitals?.recordedAt || patient.vitalsUpdatedAt,
      flags: (patient.flags || []).map(flagLabel),
      openOrders: orders.map((order) => order.name || order.type || order.id).filter(Boolean),
      results: labs.slice(0, 4).map((lab) => lab.name || lab.test || lab.result || lab.id).filter(Boolean),
      activeReferrals: patientReferrals.map(
        (referral) => `${referral.targetDepartment} ${referral.status} - ${referral.reason}`
      ),
      reminders: (patient.reassessmentReminders || [])
        .filter((reminder) => reminder.status !== 'completed')
        .map(activeReminderText),
      recentNotes: notes.map((note) => `${note.type}: ${note.body}`),
      plan: latestPhysicianPlan(notes),
      criticalEvents: (patient.timeline || [])
        .filter((event) => {
          const timestamp = new Date(event.timestamp).getTime();
          return (
            Number.isFinite(timestamp) &&
            timestamp >= now.getTime() - 12 * 60 * 60 * 1000 &&
            /ESCALATION|VitalsAlert|FlagAdded|ReassessmentReminder/i.test(event.type)
          );
        })
        .map((event) => event.summary),
    };
  });

  return {
    generatedAt: now.toISOString(),
    metrics,
    activePatientCount: activePatients.length,
    dischargedCount: metrics.stats.dischargeCount,
    admittedCount: metrics.stats.admissionCount,
    patients: cards,
    pendingActions: cards.flatMap((card) => [
      ...card.activeReferrals.map((item) => `Referral pending - ${item} - ${card.name}`),
      ...card.openOrders.map((item) => `Order pending - ${item} - ${card.name}`),
      ...card.reminders.map((item) => `Recheck reminder due ${item} - ${card.name}`),
    ]),
    ems: emsArrivals
      .filter((arrival) => ['Inbound', 'Arrived', 'Handoff'].includes(arrival.status))
      .map((arrival) => formatEmsArrival(arrival, now)),
  };
}

function buildPlainTextHandoff(narrative, cards) {
  const cardText = cards
    .map(
      (card) => [
        `${card.name} | ${card.bed} | ${card.priority} | ${card.state}`,
        `Complaint: ${card.complaint}`,
        `Vitals: ${card.vitals}`,
        `Flags: ${card.flags.join('; ') || 'None'}`,
        `Orders/results: ${[...card.openOrders, ...card.results].join('; ') || 'None listed'}`,
        `Plan: ${card.plan}`,
        `Reminders/referrals: ${[...card.reminders, ...card.activeReferrals].join('; ') || 'None'}`,
      ].join('\n')
    )
    .join('\n\n');
  return `${narrative || 'AI narrative not generated yet.'}\n\nPER-PATIENT HANDOFF CARDS\n\n${cardText}`;
}

function latestEvent(patient, predicate) {
  return [...patient.timeline].reverse().find(predicate);
}

function eventCount(patients, predicate) {
  return patients.reduce(
    (count, patient) => count + patient.timeline.filter((event) => predicate(event, patient)).length,
    0
  );
}

function buildShiftMetrics({ patients, queues, capacity, referrals, activeShift }) {
  const now = new Date();
  const shiftStart = activeShift?.startTime || patients[0]?.arrivalTime || now.toISOString();
  const shiftPatients = patients.filter((patient) => {
    const arrival = toMs(patient.arrivalTime);
    const start = toMs(shiftStart);
    return arrival !== null && start !== null ? arrival >= start : true;
  });
  const admittedPatients = shiftPatients.filter((patient) => patient.state === PatientState.Admission);
  const dischargedPatients = shiftPatients.filter((patient) => patient.state === PatientState.Discharge);
  const lwbsPatients = shiftPatients.filter((patient) =>
    patient.timeline.some((event) => /lwbs|left without being seen/i.test(event.summary))
  );
  const seenPatients = [...admittedPatients, ...dischargedPatients];
  const lengthOfStayMinutes = seenPatients.map((patient) => {
    const terminalEvent = latestEvent(
      patient,
      (event) =>
        event.type === 'DispositionUpdated' &&
        (event.to === PatientState.Discharge ||
          event.toState === PatientState.Discharge ||
          event.to === PatientState.Admission ||
          event.toState === PatientState.Admission ||
          /discharg|admission|admitted/i.test(event.summary))
    );
    return minutesBetween(patient.arrivalTime, terminalEvent?.timestamp || now);
  });
  const queuePerformance = queues.map((queue) => {
    const threshold = QUEUE_BREACH_THRESHOLDS[queue.type] ?? queue.targetWaitMinutes;
    return {
      ...queue,
      threshold,
      breach: queue.longestWaitMinutes > threshold,
    };
  });
  const queueBreachCount = queuePerformance.filter((queue) => queue.breach).length;
  const longestQueue = [...queuePerformance].sort(
    (a, b) => b.longestWaitMinutes - a.longestWaitMinutes
  )[0];
  const capacityEvents = {
    orange:
      capacity.riskLevel === 'Orange'
        ? [
            {
              id: `${capacity.id}-orange`,
              startedAt: capacity.generatedAt,
              durationMinutes: minutesBetween(capacity.generatedAt, now) || 0,
            },
          ]
        : [],
    red:
      capacity.riskLevel === 'Red'
        ? [
            {
              id: `${capacity.id}-red`,
              startedAt: capacity.generatedAt,
              durationMinutes: minutesBetween(capacity.generatedAt, now) || 0,
            },
          ]
        : [],
  };
  const boardingHours = shiftPatients
    .filter((patient) => patient.state === PatientState.Admission)
    .reduce((total, patient) => {
      const admissionEvent = latestEvent(
        patient,
        (event) =>
          event.to === PatientState.Admission ||
          event.toState === PatientState.Admission ||
          /admission|boarding/i.test(event.summary)
      );
      const minutes = minutesBetween(admissionEvent?.timestamp || patient.arrivalTime, now) || 0;
      return total + minutes / 60;
    }, 0);
  const protocolEvents = shiftPatients.flatMap((patient) =>
    patient.timeline.filter(
      (event) => event.type === 'ProtocolLaunched' || event.type === 'ClinicalScoreSaved'
    )
  );
  const protocolCounts = protocolEvents.reduce((counts, event) => {
    const label =
      event.metadata?.protocolId ||
      event.metadata?.scoreLabel ||
      event.metadata?.scoreId ||
      event.summary.replace(/saved|launched|protocol|score/gi, '').trim() ||
      'Protocol';
    counts.set(label, (counts.get(label) || 0) + 1);
    return counts;
  }, new Map());
  const referralsSent = referrals.filter((referral) =>
    ['Sent', 'Acknowledged', 'Accepted', 'Declined', 'Completed'].includes(referral.status)
  ).length;
  const longWaitQuality = longWaitShiftMetrics(shiftPatients, now);

  return {
    shiftStart,
    patients: shiftPatients,
    stats: {
      totalSeen: seenPatients.length,
      averageDoorToTriage: average(
        shiftPatients.map((patient) => minutesBetween(patient.arrivalTime, patient.triageTime))
      ),
      averageDoorToProvider: average(
        shiftPatients.map((patient) => minutesBetween(patient.arrivalTime, patient.lastAssessedTime))
      ),
      averageLengthOfStay: average(lengthOfStayMinutes),
      dischargeCount: dischargedPatients.length,
      admissionCount: admittedPatients.length,
      lwbsCount: lwbsPatients.length,
    },
    queuePerformance,
    longestWait: {
      queue: longestQueue?.name || 'None',
      minutes: longestQueue?.longestWaitMinutes || 0,
    },
    queueBreachCount,
    capacityEvents,
    boardingHours,
    clinical: {
      p1Seen: shiftPatients.filter((patient) => patient.priority === Priority.P1).length,
      protocolsLaunched: [...protocolCounts.entries()].map(([name, count]) => ({ name, count })),
      referralsSent,
      referralsAccepted: referrals.filter((referral) => referral.status === 'Accepted').length,
      referralsDeclined: referrals.filter((referral) => referral.status === 'Declined').length,
      reassessmentsFlagged: eventCount(
        shiftPatients,
        (event) =>
          event.type === 'FlagAdded' &&
          (event.metadata?.flagType === 'ReassessmentDue' || /ReassessmentDue/i.test(event.summary))
      ),
      reassessmentsCompleted: eventCount(
        shiftPatients,
        (event) =>
          event.type === 'FlagRemoved' &&
          (event.metadata?.flagType === 'ReassessmentDue' || /ReassessmentDue/i.test(event.summary))
      ),
    },
    quality: {
      longestWaitMinutes: longWaitQuality.longestWaitMinutes,
      waitTargetExceeded: longWaitQuality.exceededTargetCount,
      nearLwbsEvents: longWaitQuality.nearLwbsCount,
    },
  };
}

function buildHandoffPrompt(handoffContext) {
  return [
    'Generate a 400-500 word ED department handoff narrative for human review.',
    'Use this exact structure:',
    'Department handoff - [Date] [Time]',
    'Shift summary: X patients active, Y discharged, Z admitted.',
    '',
    'HIGH PRIORITY:',
    '[Patient summaries, 2 sentences max each]',
    '',
    'STABLE PATIENTS:',
    '[Brief grouped summary]',
    '',
    'PENDING ACTIONS:',
    '- [Referral/order/recheck/lab/action] - [Patient]',
    '',
    'EMS:',
    '[Active inbound units or none]',
    '',
    'Include all active flags, pending orders, active referrals, reassessment reminders, and critical events from the shift.',
    'Do not make autonomous clinical decisions. Frame recommendations as suggestions.',
    '',
    JSON.stringify(handoffContext, null, 2),
  ].join('\n');
}

function StatCard({ label, value, helper }) {
  return (
    <article className="shift-summary__stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {typeof helper === 'string' ? <small>{helper}</small> : helper || null}
    </article>
  );
}

function trendSymbol(trend) {
  if (!trend) return '→';
  if (trend.direction === 'up') return '↑';
  if (trend.direction === 'down') return '↓';
  return '→';
}

function TrendHelper({ trend, suffix = '' }) {
  if (!trend) return null;
  const delta = Math.abs(Number(trend.delta || 0));
  return (
    <small className={`shift-summary__trend shift-summary__trend--${trend.direction}`}>
      {trendSymbol(trend)} {delta}
      {suffix} vs last shift
    </small>
  );
}

function CapacityEventList({ title, events }) {
  return (
    <div className="shift-summary__event-list">
      <strong>{title}</strong>
      {events.length ? (
        events.map((event) => (
          <span key={event.id}>
            {new Date(event.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {formatMinutes(event.durationMinutes)}
          </span>
        ))
      ) : (
        <span>None recorded</span>
      )}
    </div>
  );
}

export default function ShiftSummary() {
  const location = useLocation();
  const { authToken, user } = useUser();
  const patients = useEmergencyStore((state) => state.patients);
  const queues = useEmergencyStore((state) => state.queues);
  const capacity = useEmergencyStore((state) => state.capacity);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const patientBackendDetails = useEmergencyStore((state) => state.patientBackendDetails);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const endShift = useEmergencyStore((state) => state.endShift);
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const [handoffBrief, setHandoffBrief] = useState('');
  const [handoffError, setHandoffError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [acceptedPatientIds, setAcceptedPatientIds] = useState(() => new Set());
  const [saveStatus, setSaveStatus] = useState('');
  const [handoffComplete, setHandoffComplete] = useState(false);
  const metrics = useMemo(
    () => buildShiftMetrics({ patients, queues, capacity, referrals, activeShift }),
    [activeShift, capacity, patients, queues, referrals]
  );
  const handoffContext = useMemo(
    () =>
      buildHandoffContext({
        patients,
        referrals,
        patientBackendDetails,
        emsArrivals,
        metrics,
      }),
    [emsArrivals, metrics, patientBackendDetails, patients, referrals]
  );
  const handoffCards = handoffContext.patients;
  const allPatientsAccepted =
    handoffCards.length > 0 && handoffCards.every((card) => acceptedPatientIds.has(card.patientId));
  const backendShift = emergencyAnalytics.data?.shift || {};

  useEffect(() => {
    void loadEmergencyAnalytics({ force: true });
  }, [loadEmergencyAnalytics, patients, queues, capacity, activeShift]);

  const exportShiftReport = async () => {
    setExportStatus('Checking backend export endpoint...');
    const result = await exportEmergencyShiftReport();
    if (!result.ok) {
      setExportStatus(result.message || 'Shift report export is not available yet.');
      return;
    }
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename || 'emergency-shift-report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportStatus('Shift report exported.');
  };

  const generateHandoffBrief = async () => {
    setIsGenerating(true);
    setHandoffError('');
    setCopied(false);

    try {
      const response = await sendClinicalChatMessage({
        message: buildHandoffPrompt(handoffContext),
        authToken,
        requestType: 'HANDOFF_BRIEF',
        workspaceContext: {
          activeWorkspaceId: 'emergency',
          workspaceId: 'emergency',
          workspaceKey: 'emergency',
          aiRequest: {
            requestType: 'HANDOFF_BRIEF',
            handoffBrief: {
              ...handoffContext,
              backendAnalytics: emergencyAnalytics.data || null,
              analyticsSource: emergencyAnalytics.source,
            },
          },
        },
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setHandoffBrief(response.data.response || 'No handoff brief returned.');
    } catch {
      setHandoffError('Unable to generate handoff brief. Check connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyHandoff = async () => {
    await navigator.clipboard?.writeText(buildPlainTextHandoff(handoffBrief, handoffCards));
    setCopied(true);
  };

  const saveShiftRecord = async () => {
    setSaveStatus('Saving handoff to shift record...');
    const plainText = buildPlainTextHandoff(handoffBrief, handoffCards);
    const activity = await recordEmergencyActivity({
      category: 'workspace',
      label: 'Emergency shift handoff brief saved',
      route: '/emergency/shift',
      metadata: {
        shiftId: activeShift.id,
        requestType: 'HANDOFF_BRIEF',
        acceptedPatientIds: [...acceptedPatientIds],
        activePatientCount: handoffCards.length,
        plainText,
        backendPersistence: 'activity-log',
      },
    });
    await syncEmergencyAuditEvent({
      action: 'clinical_data_access',
      resourceType: 'shift-handoff',
      resourceId: activeShift.id,
      timestamp: new Date().toISOString(),
      metadata: {
        acceptedBy: user?.id || user?.email || 'oncoming-staff',
        activePatientCount: handoffCards.length,
      },
    });
    setSaveStatus(activity.ok ? 'Shift handoff saved.' : activity.message || 'Backend save unavailable.');
  };

  const toggleAccepted = (patientId, checked) => {
    setAcceptedPatientIds((current) => {
      const next = new Set(current);
      if (checked) next.add(patientId);
      else next.delete(patientId);
      return next;
    });
  };

  useEffect(() => {
    if (!allPatientsAccepted || handoffComplete) return;
    const timestamp = new Date().toISOString();
    setHandoffComplete(true);
    endShift(timestamp);
    void recordEmergencyActivity({
      category: 'workspace',
      label: 'Emergency shift handoff completed',
      route: '/emergency/shift',
      metadata: {
        shiftId: activeShift.id,
        handoffCompletedAt: timestamp,
        acceptedBy: user?.id || user?.email || 'oncoming-staff',
        acceptedPatientIds: [...acceptedPatientIds],
        backendPersistence: 'activity-log',
      },
    });
    void syncEmergencyAuditEvent({
      action: 'security_event',
      resourceType: 'shift-handoff',
      resourceId: activeShift.id,
      timestamp,
      metadata: {
        acceptedBy: user?.id || user?.email || 'oncoming-staff',
        status: 'complete',
      },
    });
  }, [acceptedPatientIds, activeShift.id, allPatientsAccepted, endShift, handoffComplete, user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('handoff') !== '1' || handoffBrief || isGenerating) return;
    void generateHandoffBrief();
  }, [location.search]);

  return (
    <section className="shift-summary" aria-label="Shift summary view">
      <header className="shift-summary__header">
        <div>
          <span>Current Shift</span>
          <h1>Shift Summary</h1>
          <p>
            Started{' '}
            {new Date(metrics.shiftStart).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {metrics.patients.length} patients tracked
          </p>
          <small className="shift-summary__source">
            Analytics source:{' '}
            {emergencyAnalytics.source === 'backend' ? 'Backend aggregates' : 'Client fallback'}
          </small>
        </div>
        <div className="shift-summary__header-actions">
          <button type="button" onClick={exportShiftReport}>
            <Download size={15} aria-hidden />
            Export Shift Report
          </button>
          <button type="button" onClick={generateHandoffBrief} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Handoff Brief'}
          </button>
        </div>
      </header>

      {emergencyAnalytics.message || exportStatus ? (
        <p className="shift-summary__inline-note">
          {exportStatus || emergencyAnalytics.message}
        </p>
      ) : null}

      <section className="shift-summary__section">
        <div className="shift-summary__section-heading">
          <span>Stats</span>
        </div>
        <div className="shift-summary__stats-grid">
          <StatCard
            label="Total patients seen"
            value={backendShift.patientsSeen ?? metrics.stats.totalSeen}
            helper={<TrendHelper trend={backendShift.comparison?.patientsSeen} />}
          />
          <StatCard label="Avg door-to-triage" value={formatMinutes(metrics.stats.averageDoorToTriage)} />
          <StatCard label="Avg door-to-provider" value={formatMinutes(metrics.stats.averageDoorToProvider)} />
          <StatCard
            label="Avg length of stay"
            value={formatMinutes(backendShift.avgLosMinutes ?? metrics.stats.averageLengthOfStay)}
            helper={<TrendHelper trend={backendShift.comparison?.avgLosMinutes} suffix="m" />}
          />
          <StatCard label="Discharges" value={backendShift.dischargeCount ?? metrics.stats.dischargeCount} />
          <StatCard label="Admissions" value={backendShift.admissionCount ?? metrics.stats.admissionCount} />
          <StatCard
            label="LWBS"
            value={backendShift.lwbsCount ?? metrics.stats.lwbsCount}
            helper={<TrendHelper trend={backendShift.comparison?.lwbsCount} />}
          />
          <StatCard label="Longest wait this shift" value={formatMinutes(metrics.quality.longestWaitMinutes)} />
          <StatCard label="Patients over wait target" value={metrics.quality.waitTargetExceeded} />
          <StatCard label="Near-LWBS events" value={metrics.quality.nearLwbsEvents} />
        </div>
      </section>

      <section className="shift-summary__section">
        <div className="shift-summary__section-heading">
          <span>Queue Performance</span>
          <strong>
            Longest wait: {metrics.longestWait.queue} · {formatMinutes(metrics.longestWait.minutes)}
          </strong>
        </div>
        <div className="shift-summary__queue-grid">
          {metrics.queuePerformance.map((queue) => (
            <article key={queue.id} className={queue.breach ? 'shift-summary__queue--breach' : ''}>
              <strong>{queue.name}</strong>
              <span>Avg {formatMinutes(queue.averageWaitMinutes)}</span>
              <small>
                Longest {formatMinutes(queue.longestWaitMinutes)} · threshold{' '}
                {formatMinutes(queue.threshold)}
              </small>
            </article>
          ))}
        </div>
        <p className="shift-summary__inline-note">
          Queue breach count: <strong>{metrics.queueBreachCount}</strong>
        </p>
      </section>

      <section className="shift-summary__section shift-summary__two-column">
        <div>
          <div className="shift-summary__section-heading">
            <span>Capacity Events</span>
          </div>
          <CapacityEventList title="Orange capacity" events={metrics.capacityEvents.orange} />
          <CapacityEventList title="Red capacity" events={metrics.capacityEvents.red} />
          <p className="shift-summary__inline-note">
            Boarding hours: <strong>{formatHours(metrics.boardingHours)}</strong>
          </p>
        </div>

        <div>
          <div className="shift-summary__section-heading">
            <span>Clinical Events</span>
          </div>
          <div className="shift-summary__clinical-grid">
            <StatCard label="P1 patients seen" value={metrics.clinical.p1Seen} />
            <StatCard
              label="Referrals"
              value={`${metrics.clinical.referralsSent} sent`}
              helper={`${metrics.clinical.referralsAccepted} accepted · ${metrics.clinical.referralsDeclined} declined`}
            />
            <StatCard
              label="Reassessments"
              value={`${metrics.clinical.reassessmentsFlagged} flagged`}
              helper={`${metrics.clinical.reassessmentsCompleted} completed`}
            />
          </div>
          <div className="shift-summary__protocols">
            <strong>Protocols launched</strong>
            {metrics.clinical.protocolsLaunched.length ? (
              metrics.clinical.protocolsLaunched.map((protocol) => (
                <span key={protocol.name}>
                  {protocol.name}: {protocol.count}
                </span>
              ))
            ) : (
              <span>None recorded</span>
            )}
          </div>
        </div>
      </section>

      {handoffError ? <p className="shift-summary__error">{handoffError}</p> : null}

      <section className="shift-summary__section shift-handoff-brief" aria-label="Shift handoff brief">
        <div className="shift-summary__section-heading">
          <div>
            <span>Structured handoff</span>
            <h2>Shift Handoff Brief</h2>
          </div>
          <strong>{handoffCards.length} active patients</strong>
        </div>

        <div className="shift-handoff-brief__actions">
          <button
            type="button"
            onClick={generateHandoffBrief}
            disabled={isGenerating}
            aria-label="Regenerate shift handoff narrative"
          >
            {isGenerating ? 'Generating...' : 'Generate Handoff Brief'}
          </button>
          <button type="button" onClick={copyHandoff} disabled={!handoffBrief}>
            <Copy size={16} aria-hidden />
            {copied ? 'Copied' : 'Copy to Clipboard'}
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={16} aria-hidden />
            Print
          </button>
          <button type="button" onClick={saveShiftRecord} disabled={!handoffBrief}>
            Save to shift record
          </button>
        </div>

        {saveStatus ? <p className="shift-summary__inline-note">{saveStatus}</p> : null}
        {handoffComplete ? (
          <p className="shift-handoff-brief__complete" role="status">
            Handoff complete. Previous nurse shift ended and audit trail recorded.
          </p>
        ) : null}

        <article className="shift-handoff-brief__narrative">
          <div className="shift-summary__section-heading">
            <span>Format 1</span>
            <strong>AI Narrative Brief</strong>
          </div>
          {handoffBrief ? (
            <pre>{handoffBrief}</pre>
          ) : (
            <p>
              Generate a 400-500 word department handoff narrative with high priority patients,
              stable patient groups, pending actions, and EMS context.
            </p>
          )}
        </article>

        <div className="shift-handoff-brief__cards" aria-label="Per-patient handoff cards">
          <div className="shift-summary__section-heading">
            <span>Format 2</span>
            <strong>Per-patient handoff cards</strong>
          </div>
          {handoffCards.map((card) => (
            <details key={card.patientId} className="shift-handoff-card">
              <summary>
                <span>
                  <strong>{card.name}</strong>
                  <small>{card.bed}</small>
                </span>
                <span>{card.priority}</span>
                <span>{card.state}</span>
              </summary>
              <div className="shift-handoff-card__body">
                <p>
                  <strong>Chief complaint/history:</strong> {card.complaint}. {card.history}
                </p>
                <p>
                  <strong>Current vitals:</strong> {card.vitals}
                </p>
                <p>
                  <strong>Active orders/results:</strong>{' '}
                  {[...card.openOrders, ...card.results].join('; ') || 'None listed'}
                </p>
                <p>
                  <strong>Plan/next steps:</strong> {card.plan}
                </p>
                <p>
                  <strong>Flags/reminders:</strong>{' '}
                  {[...card.flags, ...card.reminders].join('; ') || 'None'}
                </p>
                {card.activeReferrals.length ? (
                  <p>
                    <strong>Active referrals:</strong> {card.activeReferrals.join('; ')}
                  </p>
                ) : null}
                {card.criticalEvents.length ? (
                  <p>
                    <strong>Critical events:</strong> {card.criticalEvents.join('; ')}
                  </p>
                ) : null}
                <label className="shift-handoff-card__accepted">
                  <input
                    type="checkbox"
                    checked={acceptedPatientIds.has(card.patientId)}
                    onChange={(event) => toggleAccepted(card.patientId, event.target.checked)}
                  />
                  Handover accepted
                </label>
              </div>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
