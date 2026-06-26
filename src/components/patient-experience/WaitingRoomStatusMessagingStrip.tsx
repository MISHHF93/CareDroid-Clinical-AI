import React, { useMemo } from 'react';
import { buildWaitingRoomStatusMessagingSnapshot } from '../../services/waitingRoomStatusMessaging';
import './WaitingRoomStatusMessagingStrip.css';

export default function WaitingRoomStatusMessagingStrip({
  patients = [] as any[],
  referrals = [] as any[],
  capacity = null as any,
  audience = 'staff' as any,
  className = '',
}) {
  const snapshot = useMemo(
    () =>
      buildWaitingRoomStatusMessagingSnapshot({
        patients,
        referrals,
        capacity,
        audience,
      }),
    [audience, capacity, patients, referrals],
  );

  if (!snapshot.statusLines.length && !snapshot.advisories.length) return null;

  return (
    <section
      className={['waiting-room-status-strip', className].filter(Boolean).join(' ')}
      aria-label="Waiting room status messaging"
    >
      <header className="waiting-room-status-strip__header">
        <div>
          <p className="waiting-room-status-strip__eyebrow">
            {audience === 'staff' ? 'Front desk visibility' : 'Waiting room status'}
          </p>
          <h3>Patient-safe status messaging</h3>
          <p className="waiting-room-status-strip__subtitle">
            Non-diagnostic, PHI-free messages you can share with waiting patients.
          </p>
        </div>
      </header>

      {snapshot.statusLines.length ? (
        <div className="waiting-room-status-strip__statuses" aria-label="Process status counts">
          {snapshot.statusLines.map((line) => (
            <article
              key={line.id}
              className="waiting-room-status-strip__card"
              data-tone={line.tone}
            >
              <strong>{line.count}</strong>
              <span>{line.message}</span>
            </article>
          ))}
        </div>
      ) : null}

      {snapshot.advisories.length ? (
        <div className="waiting-room-status-strip__advisories" aria-label="Waiting room advisories">
          {snapshot.advisories.map((line) => (
            <p key={line.id} className="waiting-room-status-strip__advisory" data-tone={line.tone}>
              {line.message}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
