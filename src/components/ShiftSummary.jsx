import { useMemo, useState } from 'react';
import { Copy, Printer, X } from 'lucide-react';
import { PatientState, Priority } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useUser } from '../contexts/UserContext';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
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
  };
}

function buildHandoffPrompt(metrics) {
  return [
    'Generate a concise ED shift handoff brief for human review.',
    'Use the shift data below. Include operational status, queue pressure, capacity events, clinical events, referrals, reassessments, and recommended watch items.',
    'Do not make autonomous clinical decisions. Frame recommendations as suggestions.',
    '',
    JSON.stringify(metrics, null, 2),
  ].join('\n');
}

function StatCard({ label, value, helper }) {
  return (
    <article className="shift-summary__stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
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
  const { authToken } = useUser();
  const patients = useEmergencyStore((state) => state.patients);
  const queues = useEmergencyStore((state) => state.queues);
  const capacity = useEmergencyStore((state) => state.capacity);
  const referrals = useEmergencyStore((state) => state.referrals);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const [handoffBrief, setHandoffBrief] = useState('');
  const [handoffError, setHandoffError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const metrics = useMemo(
    () => buildShiftMetrics({ patients, queues, capacity, referrals, activeShift }),
    [activeShift, capacity, patients, queues, referrals]
  );

  const generateHandoffBrief = async () => {
    setIsGenerating(true);
    setHandoffError('');
    setCopied(false);

    try {
      const response = await sendClinicalChatMessage({
        message: buildHandoffPrompt(metrics),
        authToken,
        workspaceContext: {
          activeWorkspaceId: 'emergency',
          workspaceId: 'emergency',
          workspaceKey: 'emergency',
          edCopilot: {
            enabled: true,
            systemPrompt:
              'You are the ED Copilot. Write a concise, print-ready shift handoff brief for clinical staff. Surface information for human review and never make autonomous clinical decisions.',
            shiftSummary: metrics,
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
    await navigator.clipboard?.writeText(handoffBrief);
    setCopied(true);
  };

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
        </div>
        <button type="button" onClick={generateHandoffBrief} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Handoff Brief'}
        </button>
      </header>

      <section className="shift-summary__section">
        <div className="shift-summary__section-heading">
          <span>Stats</span>
        </div>
        <div className="shift-summary__stats-grid">
          <StatCard label="Total patients seen" value={metrics.stats.totalSeen} helper="Admitted + discharged" />
          <StatCard label="Avg door-to-triage" value={formatMinutes(metrics.stats.averageDoorToTriage)} />
          <StatCard label="Avg door-to-provider" value={formatMinutes(metrics.stats.averageDoorToProvider)} />
          <StatCard label="Avg length of stay" value={formatMinutes(metrics.stats.averageLengthOfStay)} />
          <StatCard label="Discharges" value={metrics.stats.dischargeCount} />
          <StatCard label="Admissions" value={metrics.stats.admissionCount} />
          <StatCard label="LWBS" value={metrics.stats.lwbsCount} />
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

      {handoffBrief ? (
        <div className="shift-summary__modal-backdrop" role="presentation">
          <section className="shift-summary__modal" aria-label="Print-ready handoff brief">
            <header>
              <div>
                <span>Generated Handoff</span>
                <h2>Shift Handoff Brief</h2>
              </div>
              <button type="button" onClick={() => setHandoffBrief('')} aria-label="Close handoff brief">
                <X size={17} aria-hidden />
              </button>
            </header>
            <pre>{handoffBrief}</pre>
            <footer>
              <button type="button" onClick={copyHandoff}>
                <Copy size={16} aria-hidden />
                {copied ? 'Copied' : 'Copy to Clipboard'}
              </button>
              <button type="button" onClick={() => window.print()}>
                <Printer size={16} aria-hidden />
                Print
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
