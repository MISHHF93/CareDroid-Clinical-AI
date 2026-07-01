import React, { useState } from 'react';
import {
  COMMUNICATION_KIND_LABELS,
  DEFAULT_COMMUNICATION_SUMMARIES,
  WAITING_ROOM_COMMUNICATION_KINDS,
  isWaitingRoomCommunicationEligible,
} from '../../services/waitingRoomCommunicationLog';
import './WaitingRoomCommunicationQuickLog.css';

const QUICK_LOG_KINDS = WAITING_ROOM_COMMUNICATION_KINDS.filter(
  (kind) => kind !== 'concern-escalated',
);

export default function WaitingRoomCommunicationQuickLog({
  patient,
  disabled = false,
  onRecord,
  className = '',
}) {
  const [note, setNote] = useState('');
  const [pendingKind, setPendingKind] = useState<any>(null);

  if (!patient?.id || !isWaitingRoomCommunicationEligible(patient)) return null;

  const handleRecord = async (kind) => {
    if (disabled || !onRecord) return;
    setPendingKind(kind);
    try {
      await onRecord({
        kind,
        summary: note.trim() || DEFAULT_COMMUNICATION_SUMMARIES[kind],
      });
      setNote('');
    } finally {
      setPendingKind(null);
    }
  };

  return (
    <div className={['waiting-room-communication-quick-log', className].filter(Boolean).join(' ')}>
      <p className="waiting-room-communication-quick-log__label">Log staff contact</p>
      <div className="waiting-room-communication-quick-log__actions">
        {QUICK_LOG_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="waiting-room-communication-quick-log__button"
            disabled={disabled || pendingKind === kind}
            onClick={() => handleRecord(kind)}
          >
            {COMMUNICATION_KIND_LABELS[kind]}
          </button>
        ))}
      </div>
      <label className="waiting-room-communication-quick-log__note">
        <span>Optional note</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add detail for the next logged event"
          disabled={disabled}
        />
      </label>
    </div>
  );
}
