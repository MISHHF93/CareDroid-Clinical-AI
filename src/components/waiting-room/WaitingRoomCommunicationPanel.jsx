import { useMemo } from 'react';
import {
  COMMUNICATION_KIND_LABELS,
  resolveCommunicationRecency,
} from '../../services/waitingRoomCommunicationLog';
import WaitingRoomCommunicationBadge from './WaitingRoomCommunicationBadge';
import WaitingRoomCommunicationQuickLog from './WaitingRoomCommunicationQuickLog';
import './WaitingRoomCommunicationPanel.css';

function formatTime(timestamp) {
  if (!timestamp) return '--';
  try {
    return new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(timestamp);
  }
}

export default function WaitingRoomCommunicationPanel({
  patient,
  workflowLogs = [],
  staff = [],
  title = 'Waiting-room communication',
  description = 'Staff contact events — updates, vitals, reassessments, delays, queue moves, and escalations.',
  limit = 8,
  compact = false,
  className = '',
  onRecordCommunication,
  readOnly = false,
}) {
  const recency = useMemo(
    () => resolveCommunicationRecency(patient, { workflowLogs, staff, limit }),
    [limit, patient, staff, workflowLogs],
  );

  if (!patient?.id) return null;

  const events = recency.events.slice(0, limit);

  return (
    <section
      className={[
        'waiting-room-communication-panel',
        compact ? 'waiting-room-communication-panel--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      <header className="waiting-room-communication-panel__header">
        <div>
          <h3>{title}</h3>
          {!compact ? <p>{description}</p> : null}
        </div>
        <WaitingRoomCommunicationBadge
          patient={patient}
          workflowLogs={workflowLogs}
          staff={staff}
        />
      </header>

      <p className="waiting-room-communication-panel__recency" role="status">
        {recency.staffDetail}
      </p>

      {onRecordCommunication ? (
        <WaitingRoomCommunicationQuickLog
          patient={patient}
          disabled={readOnly}
          onRecord={onRecordCommunication}
        />
      ) : null}

      {events.length ? (
        <ol className="waiting-room-communication-panel__list">
          {events.map((event) => (
            <li key={event.id} className="waiting-room-communication-panel__item">
              <strong>{COMMUNICATION_KIND_LABELS[event.kind] || event.label}</strong>
              <p>{event.summary}</p>
              <div className="waiting-room-communication-panel__meta">
                <span>{event.actorName || event.actorStaffId || 'Staff'}</span>
                <time dateTime={event.timestamp}>{formatTime(event.timestamp)}</time>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="waiting-room-communication-panel__empty" role="status">
          No waiting-room communication recorded yet.
        </p>
      )}
    </section>
  );
}
