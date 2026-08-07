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
import {
  selectQueueBottleneckAlert,
  selectQueueOverallHealthScore,
  selectQueuePanelRows,
  useEmergencyStore,
} from '../store/emergencyStore';
import { buildQueueAuditSnapshot } from '../services/queueAuditDiscovery';
import { QUEUE_AUDIT_DOMAIN } from '../config/queueAuditModel';
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

export default function QueueIntelligencePanel({ collapsed, onCollapsedChange }) {
  const queues = useEmergencyStore((state) => state.queues);
  const alerts = useEmergencyStore((state) => state.alerts);
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const queueAuditSnapshot = useMemo(
    () => buildQueueAuditSnapshot({ patients, referrals }),
    [patients, referrals],
  );
  const edAuditByType = useMemo(() => {
    const map = new Map();
    queueAuditSnapshot.rows
      .filter((row) => row.domain === QUEUE_AUDIT_DOMAIN.ED)
      .forEach((row) => {
        map.set(row.type, row);
        map.set(row.label.replace(' Queue', ''), row);
      });
    return map;
  }, [queueAuditSnapshot.rows]);
  const storeQueueRows = useMemo(
    () => selectQueuePanelRows({ queues, alerts, patients } as any),
    [alerts, patients, queues]
  );
  const overallHealthScore = useMemo(
    () => selectQueueOverallHealthScore({ queues, alerts, patients } as any),
    [alerts, patients, queues]
  );
  const nextBottleneckAlert = useMemo(
    () => selectQueueBottleneckAlert({ queues, alerts, patients } as any),
    [alerts, patients, queues]
  );
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const bottleneckAlert = nextBottleneckAlert;

  const queueRows = useMemo(
    () =>
      QUEUE_CONFIG.map((config) => {
        const queue = storeQueueRows.find((candidate) => candidate.type === config.type);
        const auditRow = edAuditByType.get(config.type);
        return {
          ...config,
          name: queue?.name || config.name,
          count: queue?.count || auditRow?.length || 0,
          averageWaitMinutes: queue?.averageWaitMinutes || auditRow?.averageWaitMinutes || 0,
          oldestWaitMinutes: queue?.oldestWaitMinutes || auditRow?.longestWaitMinutes || 0,
          overdueCount: auditRow?.overdueCount || 0,
          updatedAt: queue?.updatedAt,
          health:
            queue?.health ||
            (auditRow?.isBottleneck
              ? auditRow.bottleneckSeverity === 'critical'
                ? 'red'
                : 'yellow'
              : 'green'),
        };
      }),
    [edAuditByType, storeQueueRows]
  );

  useEffect(() => {
    void loadEmergencyAnalytics({ force: true });
  }, [loadEmergencyAnalytics, storeQueueRows]);

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
          className={`queue-intel__bottleneck${
            bottleneckAlert.severity === 'Critical' ? ' queue-intel__bottleneck--critical' : ''
          }`}
          role="status"
        >
          <strong>
            Bottleneck: {bottleneckAlert.queueType ?? bottleneckAlert.title} —{' '}
            {bottleneckAlert.queueBottleneckReason ?? bottleneckAlert.message}
          </strong>
          <small>{suggestedAction(bottleneckAlert.queueType)}</small>
        </section>
      ) : null}

      <div className="queue-intel__rows">
        {queueRows.map((queue) => {
          const Icon = queue.icon;
          const isActive = activeQueueFilter === queue.type;
          const isBottlenecked = bottleneckAlert?.queueType === queue.type;
          return (
            <button
              key={queue.type}
              type="button"
              className={`queue-intel__row${isActive ? ' queue-intel__row--active' : ''}`}
              onClick={() => setQueueFilter(queue.type)}
              {...((isActive) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
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
              {queue.overdueCount ? <em>{queue.overdueCount} overdue</em> : null}
            </button>
          );
        })}
      </div>

      {!collapsed ? (
        <section className="queue-intel__performance" aria-label="Today's queue performance">
          <strong>Today's performance</strong>
          {((emergencyAnalytics.data as any)?.queuePerformance || []).slice(0, 5).map((queue: any) => (
            <div key={queue.id || queue.type}>
              <span>{queue.name || queue.type}</span>
              <small>
                Avg {formatWait(queue.avgWaitMinutes)} vs yesterday{' '}
                {formatWait(queue.yesterdayAvgWaitMinutes)} · {queue.throughputCount} through
              </small>
            </div>
          ))}
          {!(emergencyAnalytics.data as any)?.queuePerformance?.length ? (
            <small>No backend queue analytics returned yet. Queue rows are derived from the active CareDroid state.</small>
          ) : null}
        </section>
      ) : null}

      <footer className="queue-intel__footer">
        <span>Updated {latestUpdatedAt(queues)}</span>
        <button
          type="button"
          onClick={() => setQueueFilter(null)}
          disabled={!activeQueueFilter}
          title={activeQueueFilter ? 'Clear active queue filter' : 'No active filter'}
        >
          Clear Filter
        </button>
      </footer>
    </aside>
  );
}
