import React from 'react';
import { resolveCommunicationRecency } from '../../services/waitingRoomCommunicationLog';
import './WaitingRoomCommunicationBadge.css';

export default function WaitingRoomCommunicationBadge({
  patient,
  workflowLogs = ([] as any[]),
  staff = ([] as any[]),
  now = undefined,
  compact = false,
}) {
  if (!patient?.id) return null;

  const recency = resolveCommunicationRecency(patient, { workflowLogs, staff, now });
  if (!recency.lastEventAt && compact) return null;

  return (
    <span
      className={[
        'waiting-room-communication-badge',
        `waiting-room-communication-badge--${recency.tone}`,
        compact ? 'waiting-room-communication-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={recency.staffDetail}
    >
      {compact ? recency.shortRecencyLabel : recency.recencyLabel}
    </span>
  );
}
