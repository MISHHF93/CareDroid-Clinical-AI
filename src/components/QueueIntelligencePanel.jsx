import React, { useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Bed,
  ClipboardList,
  Clock3,
  FlaskConical,
  LogOut,
  RotateCcw,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import './QueueIntelligencePanel.css';

const QUEUE_CONFIG = [
  { type: 'Waiting', name: 'Waiting', icon: Clock3 },
  { type: 'Triage', name: 'Triage', icon: ClipboardList },
  { type: 'Provider', name: 'Provider', icon: Stethoscope },
  { type: 'Results', name: 'Results', icon: FlaskConical },
  { type: 'Referral', name: 'Referral', icon: UserCheck },
  { type: 'Admission', name: 'Admission', icon: Bed },
  { type: 'Discharge', name: 'Discharge', icon: LogOut },
  { type: 'Reassessment', name: 'Reassessment', icon: RotateCcw },
];

const DOWNSTREAM_QUEUE = {
  Waiting: 'Triage',
  Triage: 'Provider',
  Provider: 'Results',
  Results: 'Referral',
  Referral: 'Admission',
  Admission: 'Discharge',
  Discharge: null,
  Reassessment: 'Provider',
};

function healthForWait(avgWait) {
  if (avgWait > 40) return 'red';
  if (avgWait >= 20) return 'yellow';
  return 'green';
}

function formatWait(minutes) {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function latestUpdatedAt(queues) {
  const timestamps = queues
    .map((queue) => new Date(queue.updatedAt).getTime())
    .filter(Number.isFinite);
  if (!timestamps.length) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(Math.max(...timestamps)));
}

function suggestedAction(queueType) {
  const downstream = DOWNSTREAM_QUEUE[queueType];
  if (queueType === 'Provider') return 'Consider accelerating Results review';
  if (queueType === 'Results') return 'Consider assigning a clinician to result disposition';
  if (queueType === 'Admission') return 'Consider escalating bed management handoff';
  if (downstream) return `Consider accelerating ${downstream} handoff`;
  return 'Consider reviewing queue ownership';
}

function detectBottleneck(queueRows) {
  const activeQueues = queueRows.filter((queue) => queue.count > 0);
  if (!activeQueues.length) return null;

  const highestCount = Math.max(...activeQueues.map((queue) => queue.count));
  const longestWait = Math.max(...activeQueues.map((queue) => queue.oldestWaitMinutes));
  const queue = activeQueues.find(
    (candidate) => candidate.count === highestCount && candidate.oldestWaitMinutes === longestWait
  );
  if (!queue || queue.count < 2 || queue.oldestWaitMinutes < 20) return null;

  const downstreamType = DOWNSTREAM_QUEUE[queue.type];
  if (!downstreamType) return null;

  const downstreamQueue = queueRows.find((candidate) => candidate.type === downstreamType);
  if (!downstreamQueue || downstreamQueue.count > 0) return null;

  const severity = queue.averageWaitMinutes > 40 || queue.count >= 4 ? 'Red' : 'Yellow';

  return {
    queue: queue.type,
    reason: `${queue.count} patients, avg ${queue.averageWaitMinutes}min`,
    severity,
    detectedAt: new Date().toISOString(),
  };
}

export default function QueueIntelligencePanel({ collapsed, onCollapsedChange }) {
  const queues = useEmergencyStore((state) => state.queues);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const bottleneckAlert = useEmergencyStore((state) => state.bottleneckAlert);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const setBottleneckAlert = useEmergencyStore((state) => state.setBottleneckAlert);

  const queueRows = useMemo(
    () =>
      QUEUE_CONFIG.map((config) => {
        const queue = queues.find((candidate) => candidate.type === config.type);
        return {
          ...config,
          count: queue?.patientIds.length || 0,
          averageWaitMinutes: queue?.averageWaitMinutes || 0,
          oldestWaitMinutes: queue?.longestWaitMinutes || 0,
          updatedAt: queue?.updatedAt,
          health: healthForWait(queue?.averageWaitMinutes || 0),
        };
      }),
    [queues]
  );
  const overallAverage = queueRows.length
    ? Math.round(
        queueRows.reduce((sum, queue) => sum + queue.averageWaitMinutes, 0) / queueRows.length
      )
    : 0;
  const overallHealthScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        queueRows.reduce((sum, queue) => {
          if (queue.health === 'red') return sum + 12;
          if (queue.health === 'yellow') return sum + 6;
          return sum;
        }, 0) -
        Math.max(0, overallAverage - 20)
    )
  );

  useEffect(() => {
    const runDetection = () => {
      setBottleneckAlert(detectBottleneck(queueRows));
    };

    runDetection();
    const intervalId = window.setInterval(runDetection, 60_000);
    return () => window.clearInterval(intervalId);
  }, [queueRows, setBottleneckAlert]);

  return (
    <aside
      className={`queue-intel${collapsed ? ' queue-intel--collapsed' : ''}`}
      aria-label="Queue Intelligence"
    >
      <header className="queue-intel__header">
        <button
          type="button"
          className="queue-intel__collapse"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? 'Expand Queue Intelligence' : 'Collapse Queue Intelligence'}
        >
          <Users size={16} aria-hidden />
        </button>
        <div>
          <h2>Queue Intelligence</h2>
          <span>{overallHealthScore} overall health</span>
        </div>
      </header>

      {bottleneckAlert && !collapsed ? (
        <section
          className={`queue-intel__bottleneck queue-intel__bottleneck--${bottleneckAlert.severity.toLowerCase()}`}
          role="status"
        >
          <strong>
            Bottleneck: {bottleneckAlert.queue} — {bottleneckAlert.reason}
          </strong>
          <small>{suggestedAction(bottleneckAlert.queue)}</small>
        </section>
      ) : null}

      <div className="queue-intel__rows">
        {queueRows.map((queue) => {
          const Icon = queue.icon;
          const isActive = activeQueueFilter === queue.type;
          const isBottlenecked = bottleneckAlert?.queue === queue.type;
          return (
            <button
              key={queue.type}
              type="button"
              className={`queue-intel__row${isActive ? ' queue-intel__row--active' : ''}`}
              onClick={() => setQueueFilter(queue.type)}
              aria-pressed={isActive}
              title={queue.name}
            >
              <span className="queue-intel__icon">
                <Icon size={15} aria-hidden />
              </span>
              <span className="queue-intel__name">{queue.name}</span>
              {isBottlenecked ? (
                <span className="queue-intel__warning" aria-label="Bottlenecked queue">
                  <AlertTriangle size={13} aria-hidden />
                </span>
              ) : null}
              <strong>{queue.count}</strong>
              <span className={`queue-intel__health queue-intel__health--${queue.health}`} />
              <small>Avg {formatWait(queue.averageWaitMinutes)}</small>
              <em>Oldest {formatWait(queue.oldestWaitMinutes)}</em>
            </button>
          );
        })}
      </div>

      <footer className="queue-intel__footer">
        <span>Updated {latestUpdatedAt(queues)}</span>
        <button type="button" onClick={() => setQueueFilter(null)}>
          Clear Filter
        </button>
      </footer>
    </aside>
  );
}
